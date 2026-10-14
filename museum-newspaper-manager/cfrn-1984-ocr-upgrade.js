#!/usr/bin/env node
'use strict';

/*
  CFRN 1984 OCR upgrade - storage-list-free edition

  Why this version exists:
  - Supabase Storage folder listing for the large CFRN publication root can time out.
  - The 1984 storage inventory was verified directly in Supabase on 2026-10-13.
  - This script uses that verified issue/page inventory and therefore never calls Storage.list().
  - Page images are downloaded from the public Storage object URL first, with the SDK as fallback.
  - Dry-run performs no Storage calls at all; it only checks newspaper_ocr_pages.
  - Completed OCR pages are upserted immediately so the job is restart-safe page by page.
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

for (const envPath of [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env.local'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '.env'),
]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
}

const PROJECT_REF = 'szvkleurojiwqkkztxtr';
const PUBLICATION = 'checkered-flag-racing-news';
const YEAR = 1984;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const STORAGE_ROOT = `newspapers/${PUBLICATION}`;
const WORK_ROOT = path.resolve(process.cwd(), '.ocr-work', 'cfrn-1984');
const AUDIT_PATH = path.join(WORK_ROOT, 'latest-audit.json');
const TESSERACT_TIMEOUT_MS = Number(process.env.NEWSPAPER_OCR_TIMEOUT_MS || 180000);
const HTTP_TIMEOUT_MS = Number(process.env.NEWSPAPER_DOWNLOAD_TIMEOUT_MS || 120000);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function pages(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(`${String(i).padStart(3, '0')}.jpg`);
  return out;
}

// Verified from storage.objects in the live UMARM Supabase project on 2026-10-13.
// 999.jpg staging scans are intentionally excluded.
const ISSUE_PAGES = Object.freeze({
  '1984-01-11': pages(1, 12),
  '1984-02-08': pages(1, 16),
  '1984-02-29': pages(1, 28),
  '1984-03-21': pages(1, 16),
  '1984-04-04': pages(1, 16),
  '1984-04-11': pages(1, 12),
  '1984-04-18': pages(1, 12),
  '1984-04-25': pages(1, 16),
  '1984-05-02': pages(1, 16),
  '1984-05-09': pages(1, 20),
  '1984-05-16': pages(1, 24),
  '1984-05-23': pages(1, 19),
  '1984-05-30': pages(2, 20),
  '1984-06-06': pages(1, 1),
  '1984-06-13': pages(1, 24),
  '1984-06-20': pages(1, 20),
  '1984-06-27': pages(1, 1),
  '1984-07-04': pages(1, 24),
  '1984-07-11': pages(1, 32),
  '1984-07-18': pages(1, 28),
  '1984-07-25': pages(1, 28),
  '1984-08-01': [...pages(1, 3), ...pages(6, 24)],
  '1984-08-08': pages(1, 28),
  '1984-08-15': pages(1, 24),
  '1984-08-22': pages(1, 24),
  '1984-08-29': pages(1, 25),
  '1984-09-05': pages(1, 20),
  '1984-09-12': pages(1, 25),
  '1984-09-19': pages(1, 20),
  '1984-09-26': pages(1, 1),
  '1984-10-03': pages(1, 16),
  '1984-10-10': pages(1, 2),
  '1984-11-07': pages(1, 24),
  '1984-12-12': pages(1, 21),
});

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function hasLayout(row) {
  const lines = row?.ocr_json?.line_layout?.lines;
  return Array.isArray(lines) && lines.length > 0;
}
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function publicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function retry(label, fn, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (err) {
      last = err;
      if (i === tries) break;
      const wait = i * 1500;
      console.warn(`${label}: ${err.message}; retry ${i}/${tries - 1} in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadBuffer(supabase, storagePath) {
  // Public object URL avoids the expensive Storage metadata/listing path.
  try {
    const response = await retry(`HTTP download ${storagePath}`, async () => {
      const r = await fetchWithTimeout(publicUrl(storagePath));
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return r;
    }, 3);
    return Buffer.from(await response.arrayBuffer());
  } catch (httpErr) {
    console.warn(`  Public download fallback for ${storagePath}: ${httpErr.message}`);
  }

  return retry(`SDK download ${storagePath}`, async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }, 3);
}

async function uploadBuffer(supabase, storagePath, buffer, contentType) {
  await retry(`upload ${storagePath}`, async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      upsert: true,
      cacheControl: '3600',
      contentType,
    });
    if (error) throw error;
  }, 4);
}

async function loadIssueJson(supabase, issueFolder) {
  try {
    const raw = await downloadBuffer(supabase, `${issueFolder}/newspaper.json`);
    return JSON.parse(raw.toString('utf8'));
  } catch (err) {
    console.warn(`[${path.basename(issueFolder)}] newspaper.json unavailable: ${err.message}`);
    return null;
  }
}

function resolveTesseract() {
  const explicit = process.env.TESSERACT_PATH;
  if (explicit) return explicit;
  const win = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
  if (process.platform === 'win32' && fs.existsSync(win)) return win;
  return 'tesseract';
}

function runTesseract(executable, sourcePath, outputBase) {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [sourcePath, outputBase, '-l', 'eng', '--psm', '11', 'txt', 'tsv'],
      {
        timeout: TESSERACT_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, OMP_THREAD_LIMIT: process.env.OMP_THREAD_LIMIT || '1' },
      },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(`${error.message}${stderr ? ` | ${stderr.trim().slice(-1000)}` : ''}`));
        resolve({ stdout, stderr });
      },
    );
  });
}

function parseTsv(tsvText) {
  const rows = tsvText.split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return { lines: [], avgConfidence: null };
  const header = rows[0].split('\t');
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const words = [];
  let pageWidth = 0;
  let pageHeight = 0;

  for (const raw of rows.slice(1)) {
    const cols = raw.split('\t');
    const level = Number(cols[idx.level]);
    const left = Number(cols[idx.left] || 0);
    const top = Number(cols[idx.top] || 0);
    const width = Number(cols[idx.width] || 0);
    const height = Number(cols[idx.height] || 0);
    if (level === 1) {
      pageWidth = Math.max(pageWidth, width);
      pageHeight = Math.max(pageHeight, height);
      continue;
    }
    if (level !== 5) continue;
    const text = String(cols[idx.text] || '').trim();
    const conf = Number(cols[idx.conf]);
    if (!text) continue;
    words.push({
      text,
      conf: Number.isFinite(conf) && conf >= 0 ? conf : null,
      left,
      top,
      width,
      height,
      key: [cols[idx.block_num], cols[idx.par_num], cols[idx.line_num]].join(':'),
    });
  }

  if (!pageWidth || !pageHeight) {
    pageWidth = Math.max(1, ...words.map(w => w.left + w.width));
    pageHeight = Math.max(1, ...words.map(w => w.top + w.height));
  }

  const grouped = new Map();
  for (const word of words) {
    if (!grouped.has(word.key)) grouped.set(word.key, []);
    grouped.get(word.key).push(word);
  }

  const lines = [];
  for (const lineWords of grouped.values()) {
    const left = Math.min(...lineWords.map(w => w.left));
    const top = Math.min(...lineWords.map(w => w.top));
    const right = Math.max(...lineWords.map(w => w.left + w.width));
    const bottom = Math.max(...lineWords.map(w => w.top + w.height));
    const validConfs = lineWords.map(w => w.conf).filter(v => v !== null);
    const score = validConfs.length ? validConfs.reduce((a, b) => a + b, 0) / validConfs.length / 100 : 0;
    const text = lineWords.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    lines.push({
      t: text,
      x: left / pageWidth,
      y: top / pageHeight,
      w: Math.max(0, right - left) / pageWidth,
      h: Math.max(0, bottom - top) / pageHeight,
      s: Math.max(0, Math.min(1, score)),
    });
  }
  lines.sort((a, b) => a.y - b.y || a.x - b.x);

  const allConfs = words.map(w => w.conf).filter(v => v !== null);
  const avgConfidence = allConfs.length
    ? allConfs.reduce((a, b) => a + b, 0) / allConfs.length / 100
    : null;
  return { lines, avgConfidence };
}

async function ocrOnePage({ supabase, tesseract, issueDate, issueFolder, pageName }) {
  const storagePath = `${issueFolder}/${pageName}`;
  const buffer = await downloadBuffer(supabase, storagePath);
  const issueWork = path.join(WORK_ROOT, issueDate);
  await fsp.mkdir(issueWork, { recursive: true });

  const sourcePath = path.join(issueWork, `${pageName}.source.jpg`);
  const outputBase = path.join(issueWork, path.basename(pageName, path.extname(pageName)));
  const txtPath = `${outputBase}.txt`;
  const tsvPath = `${outputBase}.tsv`;
  await fsp.writeFile(sourcePath, buffer);

  await runTesseract(tesseract, sourcePath, outputBase);
  const ocrText = (await fsp.readFile(txtPath, 'utf8')).trim();
  const tsvText = await fsp.readFile(tsvPath, 'utf8');
  const parsed = parseTsv(tsvText);
  if (!ocrText) throw new Error('OCR returned blank text');
  if (!parsed.lines.length) throw new Error('TSV produced no usable line layout');

  const now = new Date().toISOString();
  const record = {
    publication_code: PUBLICATION,
    issue_date: issueDate,
    page_label: pageName,
    storage_path: storagePath,
    mime_type: 'image/jpeg',
    status: 'complete',
    ocr_engine: 'Tesseract',
    ocr_model: 'eng --psm 11 TSV',
    ocr_text: ocrText,
    ocr_json: {
      source_sha256: sha256(buffer),
      line_layout: { lines: parsed.lines },
    },
    avg_confidence: parsed.avgConfidence,
    error_message: null,
    processed_at: now,
    updated_at: now,
  };

  await fsp.writeFile(`${outputBase}.json`, JSON.stringify(record, null, 2), 'utf8');
  await Promise.allSettled([fsp.unlink(sourcePath), fsp.unlink(txtPath), fsp.unlink(tsvPath)]);
  return record;
}

async function fetchYearRows(supabase) {
  return retry('fetch 1984 OCR rows', async () => {
    const { data, error } = await supabase
      .from('newspaper_ocr_pages')
      .select('id,publication_code,issue_date,page_label,storage_path,status,ocr_engine,ocr_model,ocr_text,ocr_json,avg_confidence,error_message')
      .eq('publication_code', PUBLICATION)
      .gte('issue_date', '1984-01-01')
      .lt('issue_date', '1985-01-01')
      .limit(5000);
    if (error) throw error;
    return data || [];
  });
}

async function fetchIssueRows(supabase, issueDate) {
  return retry(`fetch DB ${issueDate}`, async () => {
    const { data, error } = await supabase
      .from('newspaper_ocr_pages')
      .select('id,publication_code,issue_date,page_label,storage_path,status,ocr_engine,ocr_model,ocr_text,ocr_json,avg_confidence,error_message')
      .eq('publication_code', PUBLICATION)
      .eq('issue_date', issueDate)
      .limit(500);
    if (error) throw error;
    return data || [];
  });
}

async function upsertRecord(supabase, record) {
  await retry(`upsert ${record.storage_path}`, async () => {
    const { error } = await supabase
      .from('newspaper_ocr_pages')
      .upsert(record, { onConflict: 'storage_path', ignoreDuplicates: false });
    if (error) throw error;
  }, 4);
}

async function finalizeIssue({ supabase, issueDate, issueFolder, pageNames, issueJson }) {
  const rows = await fetchIssueRows(supabase, issueDate);
  const byPath = new Map(rows.map(r => [r.storage_path, r]));
  const ordered = pageNames.map(name => byPath.get(`${issueFolder}/${name}`));
  const bad = ordered
    .map((row, i) => ({ row, page: pageNames[i] }))
    .filter(x => !x.row || x.row.status !== 'complete' || !String(x.row.ocr_text || '').trim() || !hasLayout(x.row));
  if (bad.length) {
    throw new Error(`cannot finalize; ${bad.length} page(s) incomplete/layout-missing: ${bad.slice(0, 8).map(x => x.page).join(', ')}`);
  }

  const combined = ordered.map((row, i) => `--- ${pageNames[i]} ---\n${row.ocr_text.trim()}`).join('\n\n') + '\n';
  await uploadBuffer(supabase, `${issueFolder}/ocr.txt`, Buffer.from(combined, 'utf8'), 'text/plain; charset=utf-8');

  if (issueJson) {
    const now = new Date().toISOString();
    const next = {
      ...issueJson,
      ocrTextPath: publicUrl(`${issueFolder}/ocr.txt`),
      ocrSourceCount: pageNames.length,
      ocrLayoutReady: true,
      ocrEngine: 'Tesseract eng --psm 11 TSV',
      ocrGeneratedAt: now,
    };
    await uploadBuffer(
      supabase,
      `${issueFolder}/newspaper.json`,
      Buffer.from(JSON.stringify(next, null, 2), 'utf8'),
      'application/json',
    );
  }

  return { rows: ordered.length, ocrBytes: Buffer.byteLength(combined) };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker));
  return results;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase URL/service-role credentials. Expected .env.local/.env in the racing-museum project.');
  }
  if (!SUPABASE_URL.includes(PROJECT_REF)) {
    throw new Error(`Refusing to run: Supabase URL is not project ${PROJECT_REF}`);
  }

  const onlyIssue = arg('--issue');
  if (onlyIssue && !Object.prototype.hasOwnProperty.call(ISSUE_PAGES, onlyIssue)) {
    throw new Error(`--issue must be one of the verified 1984 issue dates; got ${onlyIssue}`);
  }
  const workers = Math.max(1, Math.min(8, Number(arg('--workers', '4')) || 4));
  const maxIssues = Math.max(0, Number(arg('--max-issues', '0')) || 0);
  const dryRun = flag('--dry-run');
  const force = flag('--force');
  const tesseract = resolveTesseract();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await fsp.mkdir(WORK_ROOT, { recursive: true });

  let issues = Object.keys(ISSUE_PAGES).sort();
  if (onlyIssue) issues = [onlyIssue];
  if (maxIssues) issues = issues.slice(0, maxIssues);

  const yearRows = await fetchYearRows(supabase);
  const byPath = new Map(yearRows.map(row => [row.storage_path, row]));

  console.log('CFRN 1984 OCR Upgrade - storage-list-free');
  console.log(`Supabase: ${PROJECT_REF}`);
  console.log(`Issues discovered: ${issues.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`Workers: ${workers}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  console.log(`Existing 1984 OCR rows: ${yearRows.length}`);
  if (!dryRun) console.log(`Tesseract: ${tesseract}`);

  const audit = {
    startedAt: new Date().toISOString(),
    project: PROJECT_REF,
    publication: PUBLICATION,
    year: YEAR,
    inventorySource: 'Verified live storage.objects inventory, 2026-10-13',
    dryRun,
    force,
    workers,
    issues: [],
  };

  for (const issueDate of issues) {
    const issueFolder = `${STORAGE_ROOT}/${issueDate}`;
    const pageNames = ISSUE_PAGES[issueDate];
    const needed = pageNames.filter(pageName => {
      if (force) return true;
      const row = byPath.get(`${issueFolder}/${pageName}`);
      return !row || row.status !== 'complete' || !String(row.ocr_text || '').trim() || !hasLayout(row);
    });

    const issueAudit = {
      issueDate,
      canonicalPages: pageNames.length,
      existingDbRows: pageNames.filter(name => byPath.has(`${issueFolder}/${name}`)).length,
      layoutReadyBefore: pageNames.filter(name => hasLayout(byPath.get(`${issueFolder}/${name}`))).length,
      pagesNeedingUpgrade: needed.length,
      pageNames,
      status: dryRun ? 'planned' : 'running',
    };
    audit.issues.push(issueAudit);
    console.log(`[${issueDate}] canonical ${pageNames.length}; existing ${issueAudit.existingDbRows}; OCR/layout upgrade ${needed.length}`);

    if (dryRun) continue;

    try {
      // Avoid reading newspaper.json during dry-run; in WRITE mode this is one small direct HTTP download.
      const issueJson = await loadIssueJson(supabase, issueFolder);
      let completed = 0;

      await mapLimit(needed, workers, async (pageName, index) => {
        process.stdout.write(`  ${index + 1}/${needed.length} ${pageName} ... `);
        try {
          const record = await ocrOnePage({ supabase, tesseract, issueDate, issueFolder, pageName });
          await upsertRecord(supabase, record);
          byPath.set(record.storage_path, record);
          completed += 1;
          console.log(`OK (${Math.round((record.avg_confidence || 0) * 100)}%, ${record.ocr_json.line_layout.lines.length} lines)`);
          return true;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
          throw err;
        }
      });

      const finalized = await finalizeIssue({ supabase, issueDate, issueFolder, pageNames, issueJson });
      issueAudit.status = 'complete';
      issueAudit.upgradedPages = completed;
      issueAudit.verifiedRows = finalized.rows;
      issueAudit.ocrBytes = finalized.ocrBytes;
    } catch (err) {
      issueAudit.status = 'failed';
      issueAudit.error = err.message;
      await fsp.writeFile(AUDIT_PATH, JSON.stringify({ ...audit, finishedAt: new Date().toISOString() }, null, 2), 'utf8');
      throw err;
    }
  }

  audit.finishedAt = new Date().toISOString();
  audit.summary = {
    issues: audit.issues.length,
    canonicalPages: audit.issues.reduce((n, x) => n + x.canonicalPages, 0),
    layoutReadyBefore: audit.issues.reduce((n, x) => n + x.layoutReadyBefore, 0),
    pagesNeedingUpgrade: audit.issues.reduce((n, x) => n + x.pagesNeedingUpgrade, 0),
    completedIssues: audit.issues.filter(x => x.status === 'complete').length,
    failedIssues: audit.issues.filter(x => x.status === 'failed').length,
  };
  await fsp.writeFile(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');

  console.log('\nFINAL SUMMARY');
  console.log(`Issues: ${audit.summary.issues}`);
  console.log(`Canonical pages: ${audit.summary.canonicalPages}`);
  console.log(`Layout-ready before: ${audit.summary.layoutReadyBefore}`);
  console.log(`Pages needing OCR/layout upgrade: ${audit.summary.pagesNeedingUpgrade}`);
  if (!dryRun) {
    console.log(`Completed issues: ${audit.summary.completedIssues}`);
    console.log(`Failed issues: ${audit.summary.failedIssues}`);
  }
  console.log(`Audit: ${AUDIT_PATH}`);
}

main().catch(err => {
  console.error(`FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
