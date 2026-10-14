#!/usr/bin/env node
'use strict';

/*
  CFRN 1984 OCR upgrade

  Purpose
  - Audits all 1984 Checkered Flag Racing News issues already in Supabase Storage.
  - OCRs only canonical numeric page images (never front-cover/back-cover/thumbnail aliases).
  - Rebuilds every page that is missing, blank, failed, or lacks normalized TSV line layout.
  - Upserts completed per-page OCR into public.newspaper_ocr_pages on storage_path.
  - Rebuilds issue-level ocr.txt only after every canonical page is complete.
  - Preserves existing newspaper.json fields while updating OCR summary fields.
  - Safe to stop/re-run; completed layout-ready pages are skipped unless --force is used.

  Typical Windows use from C:\Users\schaf\racing-museum\museum-newspaper-manager:
    node .\cfrn-1984-ocr-upgrade.js --dry-run
    node .\cfrn-1984-ocr-upgrade.js

  Optional:
    --issue 1984-05-09
    --workers 4
    --max-issues 5
    --force
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
const TIMEOUT_MS = Number(process.env.NEWSPAPER_OCR_TIMEOUT_MS || 180000);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function pageNumber(name) {
  const m = path.basename(name).match(/^(\d+)\.(?:jpe?g|png|webp)$/i);
  return m ? Number(m[1]) : null;
}
function isNumericPage(name) { return pageNumber(name) !== null; }
function hasLayout(row) {
  const lines = row?.ocr_json?.line_layout?.lines;
  return Array.isArray(lines) && lines.length > 0;
}
function mimeType(name) {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function publicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}
function storageBasenameFromUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try { return decodeURIComponent(new URL(value).pathname.split('/').pop() || ''); }
  catch { return decodeURIComponent(value.split('?')[0].split('/').pop() || ''); }
}

async function retry(label, fn, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (err) {
      last = err;
      if (i === tries) break;
      const wait = i * 1250;
      console.warn(`${label}: ${err.message}; retry ${i}/${tries - 1} in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}

async function listAll(supabase, folder) {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const rows = await retry(`list ${folder}`, async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      return data || [];
    });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function downloadBuffer(supabase, storagePath) {
  return retry(`download ${storagePath}`, async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  });
}

async function uploadBuffer(supabase, storagePath, buffer, contentType) {
  await retry(`upload ${storagePath}`, async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      upsert: true,
      cacheControl: '3600',
      contentType,
    });
    if (error) throw error;
  });
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

function selectCanonicalPages(items, issueJson) {
  const itemMap = new Map(items.filter(x => isNumericPage(x.name)).map(x => [x.name, x]));
  const manifestNames = Array.isArray(issueJson?.pages)
    ? issueJson.pages.map(storageBasenameFromUrl).filter(Boolean).filter(isNumericPage)
    : [];

  if (manifestNames.length) {
    const unique = [...new Set(manifestNames)];
    const matched = unique.filter(name => itemMap.has(name));
    if (matched.length === unique.length) {
      return matched
        .map(name => itemMap.get(name))
        .sort((a, b) => pageNumber(a.name) - pageNumber(b.name));
    }
  }

  // Storage fallback: numeric page files only. 999.jpg has been used as a stray/
  // staging scan in this archive and is not part of the published page sequence.
  return [...itemMap.values()]
    .filter(item => pageNumber(item.name) !== 999)
    .sort((a, b) => pageNumber(a.name) - pageNumber(b.name));
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
        timeout: TIMEOUT_MS,
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
      left, top, width, height,
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

async function ocrOnePage({ supabase, tesseract, issueDate, issueFolder, item }) {
  const storagePath = `${issueFolder}/${item.name}`;
  const buffer = await downloadBuffer(supabase, storagePath);
  const issueWork = path.join(WORK_ROOT, issueDate);
  await fsp.mkdir(issueWork, { recursive: true });
  const ext = path.extname(item.name) || '.jpg';
  const stem = path.basename(item.name, ext);
  const sourcePath = path.join(issueWork, `${stem}.source${ext}`);
  const outputBase = path.join(issueWork, stem);
  await fsp.writeFile(sourcePath, buffer);

  await runTesseract(tesseract, sourcePath, outputBase);
  const txtPath = `${outputBase}.txt`;
  const tsvPath = `${outputBase}.tsv`;
  const ocrText = (await fsp.readFile(txtPath, 'utf8')).trim();
  const tsvText = await fsp.readFile(tsvPath, 'utf8');
  const parsed = parseTsv(tsvText);
  if (!ocrText) throw new Error('OCR returned blank text');
  if (!parsed.lines.length) throw new Error('TSV produced no usable line layout');

  const now = new Date().toISOString();
  const record = {
    publication_code: PUBLICATION,
    issue_date: issueDate,
    page_label: item.name,
    storage_path: storagePath,
    mime_type: mimeType(item.name),
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
  return record;
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

async function fetchIssueRows(supabase, issueDate) {
  const { data, error } = await supabase
    .from('newspaper_ocr_pages')
    .select('publication_code,issue_date,page_label,storage_path,status,ocr_engine,ocr_model,ocr_text,ocr_json,avg_confidence,error_message')
    .eq('publication_code', PUBLICATION)
    .eq('issue_date', issueDate);
  if (error) throw error;
  return data || [];
}

async function upsertRecords(supabase, records) {
  for (let i = 0; i < records.length; i += 20) {
    const batch = records.slice(i, i + 20);
    const { error } = await supabase
      .from('newspaper_ocr_pages')
      .upsert(batch, { onConflict: 'storage_path', ignoreDuplicates: false });
    if (error) throw error;
  }
}

async function finalizeIssue({ supabase, issueDate, issueFolder, pages, issueJson }) {
  const rows = await fetchIssueRows(supabase, issueDate);
  const byPath = new Map(rows.map(r => [r.storage_path, r]));
  const ordered = pages.map(page => byPath.get(`${issueFolder}/${page.name}`));
  const bad = ordered
    .map((row, i) => ({ row, page: pages[i].name }))
    .filter(x => !x.row || x.row.status !== 'complete' || !String(x.row.ocr_text || '').trim() || !hasLayout(x.row));
  if (bad.length) throw new Error(`cannot finalize; ${bad.length} canonical page(s) incomplete/layout-missing: ${bad.slice(0, 8).map(x => x.page).join(', ')}`);

  const combined = ordered.map((row, i) => `--- ${pages[i].name} ---\n${row.ocr_text.trim()}`).join('\n\n') + '\n';
  await uploadBuffer(supabase, `${issueFolder}/ocr.txt`, Buffer.from(combined, 'utf8'), 'text/plain; charset=utf-8');

  if (issueJson) {
    const now = new Date().toISOString();
    const next = {
      ...issueJson,
      ocrTextPath: publicUrl(`${issueFolder}/ocr.txt`),
      ocrSourceCount: pages.length,
      ocrLayoutReady: true,
      ocrEngine: 'Tesseract eng --psm 11 TSV',
      ocrGeneratedAt: now,
    };
    await uploadBuffer(supabase, `${issueFolder}/newspaper.json`, Buffer.from(JSON.stringify(next, null, 2), 'utf8'), 'application/json');
  }

  return { rows: ordered.length, ocrBytes: Buffer.byteLength(combined) };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase URL/service-role credentials. Expected .env.local/.env in the racing-museum project.');
  if (!SUPABASE_URL.includes(PROJECT_REF)) throw new Error(`Refusing to run: Supabase URL is not project ${PROJECT_REF}`);

  const onlyIssue = arg('--issue');
  if (onlyIssue && !/^1984-\d{2}-\d{2}$/.test(onlyIssue)) throw new Error('--issue must be YYYY-MM-DD within 1984');
  const workers = Math.max(1, Math.min(8, Number(arg('--workers', '4')) || 4));
  const maxIssues = Math.max(0, Number(arg('--max-issues', '0')) || 0);
  const dryRun = flag('--dry-run');
  const force = flag('--force');
  const tesseract = resolveTesseract();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await fsp.mkdir(WORK_ROOT, { recursive: true });

  const rootItems = await listAll(supabase, STORAGE_ROOT);
  let issues = rootItems.map(x => x.name).filter(x => /^1984-\d{2}-\d{2}$/.test(x)).sort();
  if (onlyIssue) issues = issues.filter(x => x === onlyIssue);
  if (maxIssues) issues = issues.slice(0, maxIssues);
  if (!issues.length) throw new Error('No 1984 CFRN issue folders found in storage');

  console.log('CFRN 1984 OCR Upgrade');
  console.log(`Supabase: ${PROJECT_REF}`);
  console.log(`Issues discovered: ${issues.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`Workers: ${workers}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  if (!dryRun) console.log(`Tesseract: ${tesseract}`);

  const audit = {
    startedAt: new Date().toISOString(),
    project: PROJECT_REF,
    publication: PUBLICATION,
    year: YEAR,
    dryRun,
    force,
    workers,
    issues: [],
  };

  for (const issueDate of issues) {
    const issueFolder = `${STORAGE_ROOT}/${issueDate}`;
    const items = await listAll(supabase, issueFolder);
    const issueJson = await loadIssueJson(supabase, issueFolder);
    const pages = selectCanonicalPages(items, issueJson);
    if (!pages.length) throw new Error(`[${issueDate}] no canonical numeric page images found`);

    const existing = await fetchIssueRows(supabase, issueDate);
    const existingByPath = new Map(existing.map(row => [row.storage_path, row]));
    const needed = pages.filter(page => {
      if (force) return true;
      const row = existingByPath.get(`${issueFolder}/${page.name}`);
      return !row || row.status !== 'complete' || !String(row.ocr_text || '').trim() || !hasLayout(row);
    });

    const issueAudit = {
      issueDate,
      canonicalPages: pages.length,
      existingDbRows: existing.length,
      layoutReadyBefore: pages.filter(page => hasLayout(existingByPath.get(`${issueFolder}/${page.name}`))).length,
      pagesNeedingUpgrade: needed.length,
      pageNames: pages.map(x => x.name),
      status: dryRun ? 'planned' : 'running',
    };
    audit.issues.push(issueAudit);
    console.log(`[${issueDate}] canonical ${pages.length}; existing ${existing.length}; OCR/layout upgrade ${needed.length}`);

    if (dryRun) continue;

    try {
      const records = await mapLimit(needed, workers, async (item, index) => {
        process.stdout.write(`  ${index + 1}/${needed.length} ${item.name} ... `);
        try {
          const record = await ocrOnePage({ supabase, tesseract, issueDate, issueFolder, item });
          console.log(`OK (${Math.round((record.avg_confidence || 0) * 100)}%, ${record.ocr_json.line_layout.lines.length} lines)`);
          return record;
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
          throw err;
        }
      });
      if (records.length) await upsertRecords(supabase, records);
      const finalized = await finalizeIssue({ supabase, issueDate, issueFolder, pages, issueJson });
      issueAudit.status = 'complete';
      issueAudit.upgradedPages = records.length;
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
