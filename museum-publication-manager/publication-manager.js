import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOAD = process.argv.includes('--upload');

if (!DRY_RUN && !UPLOAD) {
  console.error('Use npm run publications-dry-run or npm run publications-upload');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const ROOT = (process.env.PUBLICATIONS_ROOT_FOLDER || 'programs').replace(/^\/+|\/+$/g, '');
const MAX_FOLDERS = Number(process.env.MAX_PUBLICATION_FOLDERS || 5);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const batchDir = path.join(__dirname, 'publication-upload-batch');
const reportsDir = path.join(__dirname, 'upload-reports');
const generatedJsonDir = path.join(__dirname, 'generated-json');
fs.mkdirSync(batchDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(generatedJsonDir, { recursive: true });

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function listAllFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listAllFiles(full));
    else out.push(full);
  }
  return out;
}

function detectJsonImageRefs(jsonObj) {
  const refs = new Set();
  function walk(value) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    else if (typeof value === 'string') {
      const clean = value.replace(/^\.\//, '').replace(/^\//, '');
      if (/\.(jpe?g|png|webp)$/i.test(clean)) refs.add(clean);
    }
  }
  walk(jsonObj);
  return [...refs];
}

async function storageExists(storagePath) {
  const parent = storagePath.split('/').slice(0, -1).join('/');
  const name = storagePath.split('/').pop();
  const { data, error } = await supabase.storage.from(BUCKET).list(parent, { search: name, limit: 100 });
  if (error) throw new Error(error.message || 'Storage list failed');
  return (data || []).some(item => item.name === name);
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.json') return 'application/json';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}


function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => {
      const lower = part.toLowerCase();
      const special = {
        wi: 'WI', il: 'IL', mn: 'MN', mi: 'MI', ia: 'IA',
        lacrosse: 'LaCrosse', wir: 'WIR', usa: 'USA'
      };
      return special[lower] || lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function parsePublicationFolder(folderName) {
  const parts = folderName.split('-');
  const year = parts[0];
  const type = parts[parts.length - 1];
  const stateCandidates = ['wi', 'il', 'mn', 'mi', 'ia'];
  const possibleState = parts.length >= 3 ? parts[parts.length - 2] : '';
  const state = stateCandidates.includes(possibleState) ? possibleState.toUpperCase() : '';
  const trackPartsEnd = state ? parts.length - 2 : parts.length - 1;
  const trackSlug = parts.slice(1, trackPartsEnd).join('-');
  const fullTrackSlug = state ? `${trackSlug}-${state.toLowerCase()}` : trackSlug;
  const title = `${year} ${titleCaseFromSlug(trackSlug)} ${titleCaseFromSlug(type)}`.trim();
  return { year, type, state, trackSlug, fullTrackSlug, title };
}

function naturalSortFiles(files) {
  return [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function findPageNumber(file) {
  const base = path.basename(file, path.extname(file));
  const matches = base.match(/(\d+)/g);
  if (!matches) return null;
  return Number(matches[matches.length - 1]);
}

function detectPageNumberWarnings(imageFiles) {
  const nums = imageFiles.map(findPageNumber).filter(n => Number.isInteger(n));
  if (nums.length < 2) return [];
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const warnings = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      warnings.push(`Page numbering gap between ${sorted[i - 1]} and ${sorted[i]}`);
      break;
    }
  }
  return warnings;
}

function generatePublicationJson(folderName, imageFiles) {
  const meta = parsePublicationFolder(folderName);
  const pages = naturalSortFiles(imageFiles).map((file, idx) => ({
    pageNumber: idx + 1,
    image: file,
    title: `Page ${idx + 1}`
  }));

  return {
    title: meta.title,
    slug: folderName,
    year: meta.year,
    type: meta.type,
    publicationType: meta.type,
    trackSlug: meta.fullTrackSlug,
    trackName: titleCaseFromSlug(meta.trackSlug),
    state: meta.state,
    folder: folderName,
    coverImage: pages[0]?.image || '',
    pageCount: pages.length,
    pages,
    generatedBy: 'Museum Publication Manager v1.1',
    generatedAt: new Date().toISOString()
  };
}

function saveGeneratedJsonBackup(folderName, jsonObj) {
  const folderOut = path.join(generatedJsonDir, folderName);
  fs.mkdirSync(folderOut, { recursive: true });
  const outPath = path.join(folderOut, 'program.json');
  fs.writeFileSync(outPath, JSON.stringify(jsonObj, null, 2), 'utf8');
  return outPath;
}

function parseFolderName(folderName) {
  const parts = folderName.split('-');
  const year = parts[0];
  const type = parts[parts.length - 1];
  const validYear = /^\d{4}$/.test(year);
  const validType = ['program', 'yearbook', 'flyer', 'poster', 'guide', 'rulebook', 'blue', 'red'].includes(type);
  return { year, type, validYear, validType };
}

console.log('Museum Publication Manager v1.1 - JSON generation');
console.log(`Bucket: ${BUCKET}`);
console.log(`Root folder: ${ROOT}`);
if (DRY_RUN) console.log('DRY RUN: no files will be uploaded.');
console.log('');

const folderEntries = fs.readdirSync(batchDir, { withFileTypes: true }).filter(d => d.isDirectory());
if (folderEntries.length === 0) {
  console.error(`No publication folders found in: ${batchDir}`);
  process.exit(1);
}
if (folderEntries.length > MAX_FOLDERS) {
  console.error(`Too many folders. Found ${folderEntries.length}, max allowed is ${MAX_FOLDERS}.`);
  process.exit(1);
}

const reportRows = [];
let okCount = 0;
let errorCount = 0;
let uploadCount = 0;
let skipCount = 0;

for (const folderEntry of folderEntries) {
  const folderName = folderEntry.name;
  const folderPath = path.join(batchDir, folderName);
  const parsed = parseFolderName(folderName);
  const files = listAllFiles(folderPath);
  const relFiles = files.map(f => path.relative(folderPath, f).replace(/\\/g, '/'));
  const imageFiles = relFiles.filter(f => /\.(jpe?g)$/i.test(f));
  const jsonFiles = relFiles.filter(f => /\.json$/i.test(f));
  const lowerNames = relFiles.map(f => f.toLowerCase());
  const duplicates = lowerNames.filter((name, i) => lowerNames.indexOf(name) !== i);
  const problems = [];

  if (!parsed.validYear) problems.push('Folder name should start with a 4-digit year.');
  let generatedJson = null;
  let generatedJsonPath = '';
  const warnings = [];

  if (imageFiles.length === 0) problems.push('No JPG/JPEG page images found.');
  if (jsonFiles.length > 1) problems.push('More than one JSON file found.');
  if (duplicates.length) problems.push(`Duplicate local filenames found: ${[...new Set(duplicates)].join('; ')}`);
  warnings.push(...detectPageNumberWarnings(imageFiles));

  if (jsonFiles.length === 0 && imageFiles.length > 0) {
    generatedJson = generatePublicationJson(folderName, imageFiles);
    generatedJsonPath = saveGeneratedJsonBackup(folderName, generatedJson);
    warnings.push(`No JSON found; generated program.json backup at ${generatedJsonPath}`);
  }

  if (jsonFiles.length === 1) {
    try {
      const jsonPath = path.join(folderPath, jsonFiles[0]);
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const refs = detectJsonImageRefs(json);
      const missing = refs.filter(ref => !relFiles.includes(ref) && !relFiles.includes(path.basename(ref)));
      if (missing.length) problems.push(`JSON references missing images: ${missing.slice(0, 10).join('; ')}${missing.length > 10 ? '...' : ''}`);
    } catch (err) {
      problems.push(`Invalid JSON: ${err.message}`);
    }
  }

  if (problems.length) {
    errorCount++;
    console.log(`ERROR: ${folderName} | ${problems.join(' | ')}`);
    reportRows.push({ folder: folderName, file: '', status: 'error', storage_path: '', message: problems.join(' | ') });
    continue;
  }

  okCount++;
  const jsonMode = generatedJson ? 'generated' : 'existing';
  console.log(`OK: ${folderName} | files=${relFiles.length + (generatedJson ? 1 : 0)} | jpg=${imageFiles.length} | json=${jsonMode}`);
  for (const warning of warnings) console.log(`  WARNING: ${warning}`);

  const uploadItems = relFiles.map(rel => ({
    rel,
    localPath: path.join(folderPath, rel),
    buffer: null,
    generated: false
  }));

  if (generatedJson) {
    uploadItems.push({
      rel: 'program.json',
      localPath: '',
      buffer: Buffer.from(JSON.stringify(generatedJson, null, 2), 'utf8'),
      generated: true
    });
  }

  for (const item of uploadItems) {
    const rel = item.rel;
    const storagePath = `${ROOT}/${folderName}/${rel}`.replace(/\\/g, '/');
    try {
      const exists = await storageExists(storagePath);
      if (exists) {
        skipCount++;
        console.log(`  SKIP existing: ${storagePath}`);
        reportRows.push({ folder: folderName, file: rel, status: 'skipped_existing', storage_path: storagePath, message: 'Already exists in storage' });
        continue;
      }
      if (DRY_RUN) {
        reportRows.push({ folder: folderName, file: rel, status: item.generated ? 'would_upload_generated_json' : 'would_upload', storage_path: storagePath, message: warnings.join(' | ') });
      } else {
        const buffer = item.generated ? item.buffer : fs.readFileSync(item.localPath);
        const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: contentType(rel),
          upsert: false
        });
        if (error) throw new Error(error.message || 'Upload failed');
        uploadCount++;
        console.log(`  UPLOADED: ${storagePath}`);
        reportRows.push({ folder: folderName, file: rel, status: item.generated ? 'uploaded_generated_json' : 'uploaded', storage_path: storagePath, message: warnings.join(' | ') });
      }
    } catch (err) {
      errorCount++;
      console.log(`  ERROR: ${rel} | ${err.message}`);
      reportRows.push({ folder: folderName, file: rel, status: 'error', storage_path: storagePath, message: err.message });
    }
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportsDir, `publication-upload-report-${stamp}.csv`);
const header = ['folder', 'file', 'status', 'storage_path', 'message'];
const csv = [header.join(','), ...reportRows.map(r => header.map(h => csvEscape(r[h])).join(','))].join('\n');
fs.writeFileSync(reportPath, csv, 'utf8');

console.log('');
console.log('Done.');
console.log(`Folders OK: ${okCount}`);
console.log(`Errors: ${errorCount}`);
if (DRY_RUN) console.log(`Files ready/would upload: ${reportRows.filter(r => r.status === 'would_upload').length}`);
else console.log(`Files uploaded: ${uploadCount}`);
console.log(`Skipped existing: ${skipCount}`);
console.log(`Review report created:\n${reportPath}`);
