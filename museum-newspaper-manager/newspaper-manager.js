#!/usr/bin/env node
/*
  Museum Newspaper Manager v1.2.2
  - CFRN/MRN/NSSN shortcut folders
  - page spread support
  - ordered upload filenames
  - front/back/thumbnail generation
  - newspaper.json generation
  - newspapers-manifest.json update
  - OCR is saved to ocr.txt for future search
  - public summary uses a clean museum-style template
  - OCR highlights are not shown publicly
*/

const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE_OCR = args.includes('--ocr');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const ROOT = (process.env.NEWSPAPERS_ROOT_FOLDER || 'newspapers').replace(/^\/+|\/+$/g, '');
const MAX_FOLDERS = Number(process.env.MAX_NEWSPAPER_FOLDERS || 25);
const BATCH_FOLDER = process.env.NEWSPAPER_BATCH_FOLDER || 'newspaper-upload-batch';
const MANIFEST_PATH = path.resolve(process.cwd(), process.env.MANIFEST_NEWSPAPERS || '../public/data/newspapers-manifest.json');
const OCR_ENABLED = String(process.env.NEWSPAPER_OCR_ENABLED || 'true').toLowerCase() !== 'false' || FORCE_OCR;
const OCR_MAX_PAGES = Number(process.env.NEWSPAPER_OCR_MAX_PAGES || 1);
const OCR_TIMEOUT_MS = Number(process.env.NEWSPAPER_OCR_TIMEOUT_MS || 60000);
const OCR_MIN_WIDTH = Number(process.env.NEWSPAPER_OCR_MIN_WIDTH || 500);
const OCR_MIN_HEIGHT = Number(process.env.NEWSPAPER_OCR_MIN_HEIGHT || 500);

const PUBLICATION_MAP = {
  cfrn: { slug: 'checkered-flag-racing-news', name: 'Checkered Flag Racing News' },
  mrn: { slug: 'midwest-racing-news', name: 'Midwest Racing News' },
  nssn: { slug: 'national-speed-sport-news', name: 'National Speed Sport News' },
  'checkered-flag-racing-news': { slug: 'checkered-flag-racing-news', name: 'Checkered Flag Racing News' },
  'midwest-racing-news': { slug: 'midwest-racing-news', name: 'Midwest Racing News' },
  'national-speed-sport-news': { slug: 'national-speed-sport-news', name: 'National Speed Sport News' }
};

function pad(n) { return String(n).padStart(3, '0'); }
function isoDate(y, m, d) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function titleDate(iso) {
  const dt = new Date(`${iso}T12:00:00`);
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function slugify(s) {
  return s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.json') return 'application/json';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}
function parseFolderName(name) {
  // Preferred: publication-slug_YYYY-MM-DD
  const preferred = name.match(/^(.+?)_(\d{4})-(\d{1,2})-(\d{1,2})$/i);
  if (preferred) {
    const pubRaw = slugify(preferred[1]);
    const pub = PUBLICATION_MAP[pubRaw];
    if (!pub) throw new Error(`Unknown publication in folder name: ${preferred[1]}`);
    return { publicationSlug: pub.slug, publication: pub.name, issueDate: isoDate(Number(preferred[2]), Number(preferred[3]), Number(preferred[4])) };
  }
  // Shortcut: CFRN 4.30.70, MRN 4-15-59, NSSN 7_1_61
  const shortcut = name.match(/^(CFRN|MRN|NSSN)\s+(\d{1,2})[.\-_](\d{1,2})[.\-_](\d{2}|\d{4})$/i);
  if (shortcut) {
    const pub = PUBLICATION_MAP[shortcut[1].toLowerCase()];
    let year = Number(shortcut[4]);
    if (year < 100) year += year >= 40 ? 1900 : 2000;
    return { publicationSlug: pub.slug, publication: pub.name, issueDate: isoDate(year, Number(shortcut[2]), Number(shortcut[3])) };
  }
  // MRN legacy folder format: 5-17-61-1, 5-24-61-2, etc.
  // Treat as Midwest Racing News and ignore the trailing edition number.
  const mrnLegacy = name.match(/^(\d{1,2})[.\-_](\d{1,2})[.\-_](\d{2}|\d{4})[.\-_]\d+$/i);
  if (mrnLegacy) {
    const pub = PUBLICATION_MAP.mrn;
    let year = Number(mrnLegacy[3]);
    if (year < 100) year += year >= 40 ? 1900 : 2000;

    return {
      publicationSlug: pub.slug,
      publication: pub.name,
      issueDate: isoDate(year, Number(mrnLegacy[1]), Number(mrnLegacy[2])),
    };
  }
  throw new Error(`Folder name must be like CFRN 4.30.70 or checkered-flag-racing-news_1970-04-30`);
}
function parsePageFile(file) {
  const base = path.basename(file, path.extname(file));
  const normalized = base.toLowerCase().replace(/_/g, ' ').trim();
  const spread = normalized.match(/(?:page\s*)?(\d{1,4})\s*-\s*(\d{1,4})/i);
  if (spread) {
    const a = Number(spread[1]), b = Number(spread[2]);
    return { start: Math.min(a,b), end: Math.max(a,b), label: `${pad(Math.min(a,b))}-${pad(Math.max(a,b))}` };
  }
  const single = normalized.match(/(?:page\s*)?(\d{1,4})$/i) || normalized.match(/(\d{1,4})/);
  if (single) {
    const n = Number(single[1]);
    return { start: n, end: n, label: pad(n) };
  }
  return null;
}
async function listIssueFolders(batchPath) {
  await fs.mkdir(batchPath, { recursive: true });
  const entries = await fs.readdir(batchPath, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).slice(0, MAX_FOLDERS);
}
async function getImageFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && /\.(jpe?g|png|webp)$/i.test(e.name))
    .map(e => e.name)
    .map(name => ({ name, parsed: parsePageFile(name) }))
    .filter(x => x.parsed)
    .sort((a,b) => a.parsed.start - b.parsed.start || a.parsed.end - b.parsed.end);
}
function outputNameFor(parsed, ext) {
  return `${parsed.label}${ext.toLowerCase() === '.jpeg' ? '.jpg' : ext.toLowerCase()}`;
}
async function safeReadJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}
async function generateDerivativeBuffers(firstPath, lastPath) {
  const front = await sharp(firstPath).jpeg({ quality: 88 }).toBuffer();
  const back = await sharp(lastPath).jpeg({ quality: 88 }).toBuffer();
  const thumb = await sharp(firstPath).resize({ width: 520, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return { front, back, thumb };
}
async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function buildOcrInput(originalPath) {
  // OCR only the original, full-size first page. Do not OCR thumbnail/front-cover copies.
  const meta = await sharp(originalPath).metadata();
  if (!meta.width || !meta.height || meta.width < OCR_MIN_WIDTH || meta.height < OCR_MIN_HEIGHT) {
    return { path: null, warning: `OCR skipped: source image too small (${meta.width || '?'}x${meta.height || '?'})` };
  }

  const tempDir = path.resolve(process.cwd(), '.ocr-temp');
  await fs.mkdir(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, `${Date.now()}-${slugify(path.basename(originalPath, path.extname(originalPath)))}.jpg`);

  // Normalize to a clean grayscale JPEG and enlarge if useful. This avoids OCR trying to read tiny generated assets.
  await sharp(originalPath)
    .rotate()
    .grayscale()
    .resize({ width: Math.max(meta.width, 1800), withoutEnlargement: false })
    .jpeg({ quality: 92 })
    .toFile(tempPath);

  return { path: tempPath, warning: null };
}

async function runOcrOnImages(imagePaths) {
  if (!OCR_ENABLED || imagePaths.length === 0) return { text: '', confidence: null, sourceCount: 0 };
  if (DRY_RUN && !FORCE_OCR) {
    return { text: '', confidence: null, sourceCount: 0, warning: 'OCR skipped during dry run; upload will OCR the full-size front page.' };
  }

  let createWorker;
  try {
    ({ createWorker } = require('tesseract.js'));
  } catch (err) {
    return { text: '', confidence: null, sourceCount: 0, warning: `OCR dependency unavailable: ${err.message}` };
  }

  let worker;
  const texts = [];
  const confidences = [];
  const warnings = [];
  const tempFiles = [];

  try {
    const selected = imagePaths.slice(0, OCR_MAX_PAGES);
    const ocrInputs = [];

    for (const sourcePath of selected) {
      try {
        const input = await buildOcrInput(sourcePath);
        if (input.warning) warnings.push(input.warning);
        if (input.path) {
          ocrInputs.push({ original: sourcePath, ocrPath: input.path });
          tempFiles.push(input.path);
        }
      } catch (err) {
        warnings.push(`OCR prep failed for ${path.basename(sourcePath)}: ${err.message}`);
      }
    }

    if (!ocrInputs.length) {
      return { text: '', confidence: null, sourceCount: 0, warning: warnings.join(' | ') || 'OCR skipped: no usable OCR source image.' };
    }

    worker = await withTimeout(createWorker('eng'), OCR_TIMEOUT_MS, 'OCR worker startup');

    for (const item of ocrInputs) {
      try {
        const result = await withTimeout(worker.recognize(item.ocrPath), OCR_TIMEOUT_MS, `OCR ${path.basename(item.original)}`);
        const text = (result?.data?.text || '').trim();
        if (text) texts.push(`--- ${path.basename(item.original)} ---\n${text}`);
        if (typeof result?.data?.confidence === 'number') confidences.push(result.data.confidence);
      } catch (err) {
        warnings.push(`OCR failed for ${path.basename(item.original)}: ${err.message}`);
      }
    }
  } catch (err) {
    warnings.push(`OCR failed: ${err.message}`);
  } finally {
    if (worker) await worker.terminate().catch(() => {});
    for (const temp of tempFiles) await fs.unlink(temp).catch(() => {});
  }

  return {
    text: texts.join('\n\n'),
    confidence: confidences.length ? Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length) : null,
    sourceCount: texts.length,
    warning: warnings.length ? warnings.join(' | ') : undefined
  };
}

function cleanOcrLine(line) {
  return line.replace(/\s+/g, ' ').replace(/[|•]+/g, '').trim();
}
function extractHighlights(text) {
  const bad = /^(the|and|or|a|an|page|vol\.?|no\.?|phone|advertisement|classifieds?)\b/i;
  const lines = text.split(/\r?\n/).map(cleanOcrLine).filter(Boolean);
  const candidates = [];
  for (const line of lines) {
    if (line.length < 12 || line.length > 90) continue;
    if (bad.test(line)) continue;
    const letters = (line.match(/[A-Za-z]/g) || []).length;
    if (letters < 8) continue;
    const digitRatio = ((line.match(/\d/g) || []).length) / Math.max(line.length, 1);
    if (digitRatio > 0.45) continue;
    if (!candidates.includes(line)) candidates.push(line);
    if (candidates.length >= 6) break;
  }
  return candidates.slice(0, 5);
}
function findMentions(text, list) {
  const found = [];
  const lower = text.toLowerCase();
  for (const item of list) {
    if (lower.includes(item.toLowerCase())) found.push(item);
  }
  return found.slice(0, 12);
}
function buildSummary({ publication, issueDate }) {
  const dateText = titleDate(issueDate);
  return `This ${dateText} issue of ${publication} preserves regional short-track racing coverage from the Upper Midwest, including race reports, photographs, schedules, advertisements, and period racing news from the season.`;
}
function buildTopics(text) {
  const t = text.toLowerCase();
  const topics = [];
  if (/result|feature|winner|wins|victory/.test(t)) topics.push('Race Results');
  if (/schedule|coming|next week|calendar/.test(t)) topics.push('Schedules');
  if (/classified|for sale|wanted/.test(t)) topics.push('Classified Ads');
  if (/point|standings/.test(t)) topics.push('Point Standings');
  if (/photo|picture/.test(t)) topics.push('Photos');
  return topics.length ? topics : ['Newspaper Coverage'];
}
function publicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}
async function uploadBuffer(supabase, storagePath, buffer, contentType) {
  if (DRY_RUN) return 'would_upload';
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  return 'uploaded';
}
async function uploadFile(supabase, storagePath, localPath, contentType) {
  if (DRY_RUN) return 'would_upload';
  const buffer = await fs.readFile(localPath);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  return 'uploaded';
}
function upsertManifest(manifest, entry) {
  const idx = manifest.findIndex(x => x.publicationSlug === entry.publicationSlug && x.slug === entry.slug);
  if (idx >= 0) manifest[idx] = { ...manifest[idx], ...entry };
  else manifest.push(entry);
  manifest.sort((a,b) => (a.publicationSlug || '').localeCompare(b.publicationSlug || '') || String(a.issueDate).localeCompare(String(b.issueDate)));
  return idx >= 0 ? 'updated' : 'added';
}
async function processFolder(supabase, batchPath, folderName, manifest, reportRows) {
  const folderPath = path.join(batchPath, folderName);
  const meta = parseFolderName(folderName);
  const issueSlug = meta.issueDate;
  const year = Number(meta.issueDate.slice(0,4));
  const storageBase = `${ROOT}/${meta.publicationSlug}/${issueSlug}`;
  const images = await getImageFiles(folderPath);
  if (!images.length) throw new Error('No image files found');

  const uploadedImageUrls = [];
  const uploadedStoragePaths = [];
  for (const img of images) {
    const ext = path.extname(img.name).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(img.name).toLowerCase();
    const outName = outputNameFor(img.parsed, ext);
    const localPath = path.join(folderPath, img.name);
    const storagePath = `${storageBase}/${outName}`;
    uploadedImageUrls.push(publicUrl(storagePath));
    uploadedStoragePaths.push(storagePath);
    reportRows.push({ folder: folderName, file: img.name, storagePath, status: DRY_RUN ? 'would_upload' : 'pending' });
  }

  const firstLocal = path.join(folderPath, images[0].name);
  const lastLocal = path.join(folderPath, images[images.length - 1].name);
  const { front, back, thumb } = await generateDerivativeBuffers(firstLocal, lastLocal);

  // v1.2.2: OCR only the original, full-size first page.
  // This avoids Tesseract locking up on thumbnails or tiny generated assets.
  const ocrSources = [firstLocal];
  const ocr = await runOcrOnImages(ocrSources);
  // OCR is archived for future search, but raw OCR is not used in public display text.
  // Old newspaper OCR can be messy; public summaries stay clean and museum-ready.
  const rawOcrHighlights = extractHighlights(ocr.text);
  const highlights = [];
  const topics = buildTopics(ocr.text);
  const summary = buildSummary({ publication: meta.publication, issueDate: meta.issueDate });

  const frontPath = `${storageBase}/front-cover.jpg`;
  const backPath = `${storageBase}/back-cover.jpg`;
  const thumbPath = `${storageBase}/thumbnail.jpg`;
  const jsonPath = `${storageBase}/newspaper.json`;
  const ocrPath = `${storageBase}/ocr.txt`;

  const newspaperJson = {
    slug: issueSlug,
    title: titleDate(meta.issueDate),
    publication: meta.publication,
    publicationSlug: meta.publicationSlug,
    year,
    issueDate: meta.issueDate,
    description: null,
    summary,
    highlights,
    rawOcrHighlights,
    topics,
    ocrConfidence: ocr.confidence,
    ocrSourceCount: ocr.sourceCount,
    ocrTextPath: publicUrl(ocrPath),
    coverImage: publicUrl(frontPath),
    backCoverImage: publicUrl(backPath),
    thumbnail: publicUrl(thumbPath),
    pages: uploadedImageUrls,
    generatedBy: 'Museum Newspaper Manager v1.2.2',
    generatedAt: new Date().toISOString(),
    originalFolderName: folderName,
    normalizedFolder: `${meta.publicationSlug}/${issueSlug}`
  };

  const genPath = path.resolve(process.cwd(), 'generated-json', meta.publicationSlug, issueSlug, 'newspaper.json');
  await writeJson(genPath, newspaperJson);
  const ocrBackup = path.resolve(process.cwd(), 'generated-json', meta.publicationSlug, issueSlug, 'ocr.txt');
  await fs.mkdir(path.dirname(ocrBackup), { recursive: true });
  await fs.writeFile(ocrBackup, ocr.text || '');

  const manifestEntry = {
    slug: issueSlug,
    title: titleDate(meta.issueDate),
    publication: meta.publication,
    publicationSlug: meta.publicationSlug,
    year,
    issueDate: meta.issueDate,
    description: null,
    summary,
    highlights,
    rawOcrHighlights,
    topics,
    ocrConfidence: ocr.confidence,
    coverImage: publicUrl(frontPath),
    backCoverImage: publicUrl(backPath),
    thumbnail: publicUrl(thumbPath),
    pages: uploadedImageUrls
  };

  if (!DRY_RUN) {
    for (let i = 0; i < images.length; i++) {
      const local = path.join(folderPath, images[i].name);
      await uploadFile(supabase, uploadedStoragePaths[i], local, mimeType(images[i].name));
      console.log(`  UPLOADED: ${uploadedStoragePaths[i]}`);
    }
    await uploadBuffer(supabase, frontPath, front, 'image/jpeg'); console.log(`  UPLOADED: ${frontPath}`);
    await uploadBuffer(supabase, backPath, back, 'image/jpeg'); console.log(`  UPLOADED: ${backPath}`);
    await uploadBuffer(supabase, thumbPath, thumb, 'image/jpeg'); console.log(`  UPLOADED: ${thumbPath}`);
    await uploadBuffer(supabase, jsonPath, Buffer.from(JSON.stringify(newspaperJson, null, 2)), 'application/json'); console.log(`  UPLOADED: ${jsonPath}`);
    await uploadBuffer(supabase, ocrPath, Buffer.from(ocr.text || ''), 'text/plain; charset=utf-8'); console.log(`  UPLOADED: ${ocrPath}`);
    const action = upsertManifest(manifest, manifestEntry);
    console.log(`  MANIFEST: ${action} ${meta.publicationSlug}/${issueSlug}`);
  }

  console.log(`OK: ${folderName} | publication=${meta.publicationSlug} | issue=${meta.issueDate} | jpg=${images.length} | json=generated_ordered | covers=front/back/thumbnail | ocr=${OCR_ENABLED ? 'summary' : 'off'} | manifest=${DRY_RUN ? 'would_update' : 'updated'}`);
  console.log(`  WARNING: Folder name normalized to ${meta.publicationSlug}/${issueSlug}`);
  console.log(`  SUMMARY: ${summary}`);
  if (rawOcrHighlights.length) console.log(`  OCR ARCHIVED HIGHLIGHTS (not public): ${rawOcrHighlights.join(' | ')}`);
  if (ocr.warning) console.log(`  WARNING: ${ocr.warning}`);
  if (DRY_RUN) console.log(`  MANIFEST: would add/update ${meta.publicationSlug}/${issueSlug}`);

  return { files: images.length + 5, manifest: 1, ocr: OCR_ENABLED ? 1 : 0 };
}
async function writeReport(rows) {
  const dir = path.resolve(process.cwd(), 'upload-reports');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `newspaper-upload-report-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`);
  const header = 'folder,file,storagePath,status\n';
  const body = rows.map(r => [r.folder, r.file, r.storagePath, r.status].map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(',')).join('\n');
  await fs.writeFile(file, header + body);
  return file;
}
async function main() {
  console.log('Museum Newspaper Manager v1.2.2 - clean public summaries + hidden OCR archive + CFRN/MRN/NSSN shortcuts + page spread support');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Root folder: ${ROOT}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(DRY_RUN ? 'DRY RUN: no files will be uploaded and manifest will not be changed.' : 'LIVE UPLOAD: files will be uploaded and manifest will be changed.');
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const batchPath = path.resolve(process.cwd(), BATCH_FOLDER);
  const folders = await listIssueFolders(batchPath);
  if (!folders.length) {
    console.log(`No newspaper folders found in: ${batchPath}`);
    return;
  }
  const manifest = await safeReadJson(MANIFEST_PATH, []);
  const reportRows = [];
  let ok = 0, errors = 0, files = 0, manifestUpdates = 0;
  for (const folder of folders) {
    try {
      const result = await processFolder(supabase, batchPath, folder, manifest, reportRows);
      ok++; files += result.files; manifestUpdates += result.manifest;
    } catch (err) {
      errors++;
      console.log(`ERROR: ${folder} | ${err.message}`);
      reportRows.push({ folder, file: '', storagePath: '', status: `ERROR: ${err.message}` });
    }
  }
  if (!DRY_RUN && ok > 0) {
    await writeJson(MANIFEST_PATH, manifest);
  }
  const report = await writeReport(reportRows);
  console.log('');
  console.log('Done.');
  console.log(`Folders OK: ${ok}`);
  console.log(`Errors: ${errors}`);
  console.log(`${DRY_RUN ? 'Files ready/would upload' : 'Files uploaded'}: ${files}`);
  console.log(`Manifest entries ${DRY_RUN ? 'would add/update' : 'added/updated'}: ${manifestUpdates}`);
  console.log(`Review report created:`);
  console.log(report);
}
main().catch(err => { console.error(err); process.exit(1); });
