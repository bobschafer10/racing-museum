#!/usr/bin/env node
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
const TIMEOUT = Number(process.env.NEWSPAPER_OCR_TIMEOUT_MS || 120000);
const RETRIES = Number(process.env.NEWSPAPER_STORAGE_RETRIES || 4);

const PUBS = {
  mrn: 'midwest-racing-news',
  cfrn: 'checkered-flag-racing-news',
  nssn: 'national-speed-sport-news',
  'midwest-racing-news': 'midwest-racing-news',
  'checkered-flag-racing-news': 'checkered-flag-racing-news',
  'national-speed-sport-news': 'national-speed-sport-news',
};

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isImage(n) { return /\.(jpe?g|png|webp)$/i.test(n); }
function pageNum(n) {
  const m = path.basename(n, path.extname(n)).match(/\d+/);
  return m ? Number(m[0]) : 999999;
}

async function retry(label, fn) {
  let last;
  for (let i = 1; i <= RETRIES; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      if (i === RETRIES) break;
      const wait = 1500 * i;
      console.log(`${label} failed (${e.message}); retry ${i}/${RETRIES - 1} in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}

async function list(supabase, folder, options = {}) {
  return retry(`Storage list ${folder}`, async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: options.limit || 1000,
      offset: options.offset || 0,
      sortBy: { column: 'name', order: 'asc' },
      ...(options.search ? { search: options.search } : {}),
    });
    if (error) throw error;
    return data || [];
  });
}

async function download(supabase, storagePath) {
  return retry(`Download ${storagePath}`, async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  });
}

async function uploadText(supabase, storagePath, text) {
  return retry(`Upload ${storagePath}`, async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, Buffer.from(text, 'utf8'), {
      contentType: 'text/plain; charset=utf-8', upsert: true, cacheControl: '3600'
    });
    if (error) throw error;
  });
}

async function withTimeout(p, ms, label) {
  let timer;
  try {
    return await Promise.race([
      p,
      new Promise((_, reject) => timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms))
    ]);
  } finally { clearTimeout(timer); }
}

async function discoverIssues(supabase, publicationFolder, startYear, endYear) {
  const found = new Set();
  for (let year = startYear; year <= endYear; year++) {
    console.log(`Discovering ${year} issues...`);
    const rows = await list(supabase, publicationFolder, { limit: 250, search: `${year}-` });
    for (const row of rows) if (/^\d{4}-\d{2}-\d{2}$/.test(row.name)) found.add(row.name);
  }
  return [...found].sort();
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase credentials in .env');

  const publication = PUBS[String(arg('--publication', 'mrn')).toLowerCase()];
  if (!publication) throw new Error('Unknown publication');
  const y1 = Number(arg('--year-start', 1961));
  const y2 = Number(arg('--year-end', y1));
  const maxIssues = Number(arg('--max-issues', 0));
  const force = flag('--force');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const publicationFolder = `${ROOT}/${publication}`;

  console.log('Museum Newspaper OCR Backfill v2');
  console.log(`Publication: ${publication}`);
  console.log(`Years: ${y1}-${y2}`);
  console.log('Discovery is year-filtered to avoid large Storage scans.');

  const issues = await discoverIssues(supabase, publicationFolder, y1, y2);
  console.log(`Issues found: ${issues.length}`);
  if (!issues.length) return;

  console.log('Starting Tesseract worker...');
  const worker = await withTimeout(createWorker('eng'), TIMEOUT, 'Tesseract startup');
  let done = 0, skipped = 0, failed = 0, attempted = 0;

  try {
    for (const issueDate of issues) {
      if (maxIssues && attempted >= maxIssues) break;
      const issueFolder = `${publicationFolder}/${issueDate}`;
      try {
        const items = await list(supabase, issueFolder, { limit: 250 });
        const existing = items.find(x => x.name === 'ocr.txt');
        const existingSize = Number(existing?.metadata?.size || existing?.metadata?.contentLength || 0);
        if (!force && existingSize > 0) {
          console.log(`[${issueDate}] SKIP existing OCR (${existingSize} bytes)`);
          skipped++;
          continue;
        }

        attempted++;
        const images = items.filter(x => isImage(x.name)).sort((a,b) => pageNum(a.name) - pageNum(b.name) || a.name.localeCompare(b.name));
        if (!images.length) throw new Error('No page images found');

        console.log(`\n[${issueDate}] OCR START (${images.length} images)`);
        const blocks = [];
        const confs = [];
        let pageIndex = 0;

        for (const img of images) {
          pageIndex++;
          process.stdout.write(`[${issueDate}] ${pageIndex}/${images.length} ${img.name} ... `);
          try {
            const raw = await download(supabase, `${issueFolder}/${img.name}`);
            const prepared = await sharp(raw, { failOn: 'none' })
              .rotate().grayscale().normalize().resize({ width: 2200, withoutEnlargement: false }).sharpen().jpeg({ quality: 92 }).toBuffer();
            const r = await withTimeout(worker.recognize(prepared), TIMEOUT, `OCR ${img.name}`);
            const text = (r?.data?.text || '').trim();
            const c = typeof r?.data?.confidence === 'number' ? Math.round(r.data.confidence) : null;
            if (text) blocks.push(`--- ${img.name} ---\n${text}`);
            if (c !== null) confs.push(c);
            console.log(text ? `OK${c !== null ? ` (${c}%)` : ''}` : 'NO TEXT');
          } catch (e) {
            console.log(`FAILED: ${e.message}`);
          }
        }

        if (!blocks.length) throw new Error('OCR produced no text for this issue');
        const avg = confs.length ? Math.round(confs.reduce((a,b)=>a+b,0)/confs.length) : null;
        const output = `Publication: ${publication}\nIssue Date: ${issueDate}\nOCR Pages: ${blocks.length}/${images.length}\nAverage OCR Confidence: ${avg ?? 'unknown'}\n\n${blocks.join('\n\n')}\n`;
        await uploadText(supabase, `${issueFolder}/ocr.txt`, output);
        done++;
        console.log(`[${issueDate}] OCR COMPLETE (${Buffer.byteLength(output)} bytes)`);
      } catch (e) {
        failed++;
        console.error(`[${issueDate}] ISSUE FAILED: ${e.message}`);
      }
    }
  } finally {
    await worker.terminate().catch(() => {});
  }

  console.log('\nOCR BACKFILL SUMMARY');
  console.log(`Processed: ${done}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Attempted: ${attempted}`);
  if (failed) process.exitCode = 2;
}

main().catch(err => {
  console.error(`FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
