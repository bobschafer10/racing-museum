#!/usr/bin/env node
/*
  Museum Newspaper OCR Backfill
  - OCRs newspaper page images already stored in Supabase Storage
  - Writes/upserts ocr.txt beside each issue
  - Skips non-empty OCR files unless --force is supplied
  - Supports publication and year-range filtering
  - Designed to resume safely after interruption

  Examples:
    node ocr-backfill.js --publication mrn --year-start 1961 --year-end 1977 --max-issues 5
    node ocr-backfill.js --publication midwest-racing-news --year-start 1964 --year-end 1964
    node ocr-backfill.js --publication mrn --year-start 1964 --year-end 1964 --force
*/

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { createWorker } = require('tesseract.js');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const ROOT = (process.env.NEWSPAPERS_ROOT_FOLDER || 'newspapers').replace(/^\/+|\/+$/g, '');
const OCR_TIMEOUT_MS = Number(process.env.NEWSPAPER_OCR_TIMEOUT_MS || 120000);
const OCR_MIN_WIDTH = Number(process.env.NEWSPAPER_OCR_MIN_WIDTH || 500);
const OCR_MIN_HEIGHT = Number(process.env.NEWSPAPER_OCR_MIN_HEIGHT || 500);
const OCR_RESIZE_WIDTH = Number(process.env.NEWSPAPER_OCR_RESIZE_WIDTH || 2200);

const PUBLICATION_MAP = {
  mrn: 'midwest-racing-news',
  cfrn: 'checkered-flag-racing-news',
  nssn: 'national-speed-sport-news',
  'midwest-racing-news': 'midwest-racing-news',
  'checkered-flag-racing-news': 'checkered-flag-racing-news',
  'national-speed-sport-news': 'national-speed-sport-news',
};

function argValue(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx < 0 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function hasArg(name) {
  return process.argv.includes(name);
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds`)), ms);
    }),
  ]);
}

function isImage(name) {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function pageSortKey(name) {
  const base = path.basename(name, path.extname(name));
  const nums = [...base.matchAll(/\d+/g)].map(m => Number(m[0]));
  return nums.length ? nums[0] : 999999;
}

function sortImages(a, b) {
  return pageSortKey(a.name) - pageSortKey(b.name) || a.name.localeCompare(b.name, undefined, { numeric: true });
}

async function listAll(supabase, folder, limit = 1000) {
  const out = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < limit) break;
    offset += data.length;
  }
  return out;
}

async function existingOcrSize(supabase, issueFolder) {
  const items = await listAll(supabase, issueFolder);
  const ocr = items.find(x => x.name === 'ocr.txt');
  const size = Number(ocr?.metadata?.size ?? ocr?.metadata?.contentLength ?? 0);
  return { size, items };
}

async function downloadBuffer(supabase, storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function buildOcrBuffer(inputBuffer, label) {
  const image = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < OCR_MIN_WIDTH || meta.height < OCR_MIN_HEIGHT) {
    throw new Error(`source image too small (${meta.width || '?'}x${meta.height || '?'})`);
  }

  return image
    .grayscale()
    .normalize()
    .resize({ width: Math.max(meta.width, OCR_RESIZE_WIDTH), withoutEnlargement: false })
    .sharpen()
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function ocrIssue({ supabase, worker, publication, issueDate, issueFolder, items }) {
  const images = items.filter(x => isImage(x.name)).sort(sortImages);
  if (!images.length) throw new Error('no page images found');

  const sections = [];
  const confidences = [];
  const warnings = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const storagePath = `${issueFolder}/${item.name}`;
    const prefix = `[${issueDate}] page ${i + 1}/${images.length} ${item.name}`;
    process.stdout.write(`${prefix} ... `);

    try {
      const source = await downloadBuffer(supabase, storagePath);
      const prepared = await buildOcrBuffer(source, item.name);
      const result = await withTimeout(worker.recognize(prepared), OCR_TIMEOUT_MS, `OCR ${item.name}`);
      const text = (result?.data?.text || '').trim();
      const confidence = typeof result?.data?.confidence === 'number' ? Math.round(result.data.confidence) : null;

      if (text) {
        sections.push(`--- ${item.name} ---\n${text}`);
        if (confidence !== null) confidences.push(confidence);
        console.log(`OK${confidence !== null ? ` (${confidence}%)` : ''}`);
      } else {
        warnings.push(`${item.name}: OCR returned no text`);
        console.log('NO TEXT');
      }
    } catch (err) {
      warnings.push(`${item.name}: ${err.message}`);
      console.log(`FAILED: ${err.message}`);
    }
  }

  const text = sections.join('\n\n').trim();
  const confidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : null;

  if (!text) throw new Error(`all OCR pages failed${warnings.length ? `: ${warnings.join(' | ')}` : ''}`);

  const header = [
    `Publication: ${publication}`,
    `Issue Date: ${issueDate}`,
    `OCR Pages: ${sections.length}/${images.length}`,
    `Average OCR Confidence: ${confidence === null ? 'unknown' : `${confidence}%`}`,
    warnings.length ? `Warnings: ${warnings.join(' | ')}` : null,
    '',
  ].filter(x => x !== null).join('\n');

  const payload = Buffer.from(`${header}\n${text}\n`, 'utf8');
  const { error } = await supabase.storage.from(BUCKET).upload(`${issueFolder}/ocr.txt`, payload, {
    contentType: 'text/plain; charset=utf-8',
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;

  return { pageCount: images.length, ocrPages: sections.length, confidence, bytes: payload.length, warnings };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  const rawPublication = String(argValue('--publication', process.env.NEWSPAPER_OCR_BACKFILL_PUBLICATION || 'mrn')).toLowerCase();
  const publication = PUBLICATION_MAP[rawPublication];
  if (!publication) throw new Error(`Unknown publication: ${rawPublication}`);

  const yearStart = Number(argValue('--year-start', process.env.NEWSPAPER_OCR_BACKFILL_YEAR_START || 1900));
  const yearEnd = Number(argValue('--year-end', process.env.NEWSPAPER_OCR_BACKFILL_YEAR_END || 2100));
  const maxIssues = Number(argValue('--max-issues', process.env.NEWSPAPER_OCR_BACKFILL_MAX_ISSUES || 0));
  const force = hasArg('--force');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const publicationFolder = `${ROOT}/${publication}`;
  const rootItems = await listAll(supabase, publicationFolder);
  const issueDates = rootItems
    .map(x => x.name)
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .filter(name => {
      const year = Number(name.slice(0, 4));
      return year >= yearStart && year <= yearEnd;
    })
    .sort();

  console.log('Museum Newspaper OCR Backfill');
  console.log(`Publication: ${publication}`);
  console.log(`Years: ${yearStart}-${yearEnd}`);
  console.log(`Issues found: ${issueDates.length}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  console.log('');

  let worker;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;

  try {
    worker = await withTimeout(createWorker('eng'), OCR_TIMEOUT_MS, 'OCR worker startup');

    for (const issueDate of issueDates) {
      if (maxIssues > 0 && attempted >= maxIssues) break;
      const issueFolder = `${publicationFolder}/${issueDate}`;

      try {
        const existing = await existingOcrSize(supabase, issueFolder);
        if (!force && existing.size > 0) {
          console.log(`[${issueDate}] SKIP existing OCR (${existing.size} bytes)`);
          skipped++;
          continue;
        }

        attempted++;
        console.log(`\n[${issueDate}] OCR START`);
        const result = await ocrIssue({
          supabase,
          worker,
          publication,
          issueDate,
          issueFolder,
          items: existing.items,
        });
        processed++;
        console.log(`[${issueDate}] OCR COMPLETE: ${result.ocrPages}/${result.pageCount} pages, ${result.bytes} bytes${result.confidence !== null ? `, avg ${result.confidence}%` : ''}`);
      } catch (err) {
        failed++;
        console.error(`[${issueDate}] ISSUE FAILED: ${err.message}`);
      }
    }
  } finally {
    if (worker) await worker.terminate().catch(() => {});
  }

  console.log('\nOCR BACKFILL SUMMARY');
  console.log(`Processed: ${processed}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Attempted this run: ${attempted}`);

  if (failed > 0) process.exitCode = 2;
}

main().catch(err => {
  console.error(`FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
