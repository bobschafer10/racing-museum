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
const WEBSITE_ROOT = path.resolve(__dirname, process.env.WEBSITE_ROOT || '..');
const MANIFEST_PATH = path.resolve(
  WEBSITE_ROOT,
  process.env.RACE_PROGRAMS_MANIFEST || path.join('public', 'data', 'race-programs-manifest.json')
);
const PAGE_PAD_WIDTH = Number(process.env.PUBLICATION_PAGE_PAD_WIDTH || 3);

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
        lacrosse: 'LaCrosse', wir: 'WIR', usa: 'USA', bmara: 'BMARA'
      };
      return special[lower] || lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function parsePublicationFolder(folderName) {
  const parts = folderName.split('-').filter(Boolean);
  const year = parts[0];
  const type = parts[parts.length - 1] || 'program';
  const stateCandidates = ['wi', 'il', 'mn', 'mi', 'ia'];
  const possibleState = parts.length >= 3 ? parts[parts.length - 2] : '';
  const state = stateCandidates.includes(possibleState) ? possibleState.toUpperCase() : '';
  const trackPartsEnd = state ? parts.length - 2 : parts.length - 1;
  const trackSlug = parts.slice(1, trackPartsEnd).join('-');
  const fullTrackSlug = state && trackSlug ? `${trackSlug}-${state.toLowerCase()}` : trackSlug;
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
  if (sorted.length !== nums.length) warnings.push('Duplicate page numbers detected in local filenames.');
  return warnings;
}

function paddedName(index, originalFile) {
  const ext = path.extname(originalFile).toLowerCase() || '.jpg';
  return `${String(index + 1).padStart(PAGE_PAD_WIDTH, '0')}${ext}`;
}

function publicStorageUrl(relPath) {
  const encoded = relPath.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

function readExistingJson(folderPath, relJsonFiles) {
  if (relJsonFiles.length !== 1) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(folderPath, relJsonFiles[0]), 'utf8'));
  } catch {
    return null;
  }
}

function generatePublicationJson(folderName, uploadImageNames, existing = null) {
  const meta = parsePublicationFolder(folderName);
  const pages = uploadImageNames.map((file, idx) => ({
    pageNumber: idx + 1,
    image: file,
    title: `Page ${idx + 1}`
  }));

  return {
    ...(existing || {}),
    title: existing?.title || meta.title,
    slug: existing?.slug || folderName,
    year: existing?.year || Number(meta.year) || meta.year,
    type: existing?.type || meta.type,
    publicationType: existing?.publicationType || existing?.type || meta.type,
    track: existing?.track || titleCaseFromSlug(meta.trackSlug),
    track_slug: existing?.track_slug || meta.fullTrackSlug || null,
    trackSlug: existing?.trackSlug || meta.fullTrackSlug || null,
    trackName: existing?.trackName || existing?.track || titleCaseFromSlug(meta.trackSlug),
    state: existing?.state || meta.state || null,
    folder: folderName,
    coverImage: pages[0]?.image || '',
    backCoverImage: pages[pages.length - 1]?.image || '',
    pageCount: pages.length,
    images: uploadImageNames,
    pages,
    generatedBy: 'Museum Publication Manager v1.2',
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
  const parts = folderName.split('-').filter(Boolean);
  const year = parts[0];
  const type = parts[parts.length - 1];
  const validYear = /^\d{4}$/.test(year);
  const validType = ['program', 'yearbook', 'flyer', 'poster', 'guide', 'rulebook', 'souvenir', 'book', 'blue', 'red'].includes(type);
  return { year, type, validYear, validType };
}

async function storageExists(storagePath) {
  const parent = storagePath.split('/').slice(0, -1).join('/');
  const name = storagePath.split('/').pop();
  const { data, error } = await supabase.storage.from(BUCKET).list(parent, { search: name, limit: 100 });
  if (error) throw new Error(error.message || 'Storage list failed');
  return (data || []).some(item => item.name === name);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read manifest ${MANIFEST_PATH}: ${err.message}`);
  }
}

function saveManifest(programs) {
  const sorted = [...programs].sort((a, b) => {
    const ay = typeof a.year === 'number' ? a.year : Number(String(a.year || '').match(/\d{4}/)?.[0] || 0);
    const by = typeof b.year === 'number' ? b.year : Number(String(b.year || '').match(/\d{4}/)?.[0] || 0);
    if (ay && by && ay !== by) return ay - by;
    if (ay && !by) return -1;
    if (!ay && by) return 1;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function makeManifestEntry(folderName, programJson, uploadImageNames) {
  const imagePaths = uploadImageNames.map(name => `${ROOT}/${folderName}/${name}`);
  const imageUrls = imagePaths.map(publicStorageUrl);
  const coverUrl = imageUrls[0] || null;
  const backCoverUrl = imageUrls[imageUrls.length - 1] || null;
  return {
    slug: folderName,
    title: programJson.title,
    year: programJson.year,
    track: programJson.track || programJson.trackName || null,
    track_slug: programJson.track_slug || programJson.trackSlug || null,
    series: programJson.series || null,
    series_slug: programJson.series_slug || null,
    type: programJson.type || programJson.publicationType || null,
    subtitle: programJson.subtitle || null,
    description: programJson.description || null,
    trackLogo: programJson.trackLogo || null,
    isNew: programJson.isNew ?? true,
    images: imageUrls,
    coverImage: coverUrl,
    backCoverImage: backCoverUrl
  };
}

function upsertManifestEntry(entry) {
  const manifest = loadManifest();
  const index = manifest.findIndex(item => item.slug === entry.slug);
  if (index >= 0) manifest[index] = { ...manifest[index], ...entry };
  else manifest.push(entry);
  saveManifest(manifest);
  return index >= 0 ? 'updated' : 'added';
}

console.log('Museum Publication Manager v1.2 - ordered pages + manifest update');
console.log(`Bucket: ${BUCKET}`);
console.log(`Root folder: ${ROOT}`);
console.log(`Manifest: ${MANIFEST_PATH}`);
if (DRY_RUN) console.log('DRY RUN: no files will be uploaded and manifest will not be changed.');
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
let manifestAdded = 0;
let manifestUpdated = 0;
let manifestWouldChange = 0;

for (const folderEntry of folderEntries) {
  const folderName = folderEntry.name;
  const folderPath = path.join(batchDir, folderName);
  const parsed = parseFolderName(folderName);
  const files = listAllFiles(folderPath);
  const relFiles = files.map(f => path.relative(folderPath, f).replace(/\\/g, '/'));
  const imageFiles = naturalSortFiles(relFiles.filter(f => /\.(jpe?g)$/i.test(f)));
  const jsonFiles = relFiles.filter(f => /\.json$/i.test(f));
  const lowerNames = relFiles.map(f => f.toLowerCase());
  const duplicates = lowerNames.filter((name, i) => lowerNames.indexOf(name) !== i);
  const problems = [];
  const warnings = [];

  if (!parsed.validYear) problems.push('Folder name should start with a 4-digit year.');
  if (imageFiles.length === 0) problems.push('No JPG/JPEG page images found.');
  if (jsonFiles.length > 1) problems.push('More than one JSON file found.');
  if (duplicates.length) problems.push(`Duplicate local filenames found: ${[...new Set(duplicates)].join('; ')}`);
  warnings.push(...detectPageNumberWarnings(imageFiles));

  const uploadImageNames = imageFiles.map((file, index) => paddedName(index, file));
  const existingJson = readExistingJson(folderPath, jsonFiles);
  const generatedJson = generatePublicationJson(folderName, uploadImageNames, existingJson);
  const generatedJsonPath = saveGeneratedJsonBackup(folderName, generatedJson);
  warnings.push(`${jsonFiles.length ? 'Existing JSON found; generated ordered v1.2 program.json backup' : 'No JSON found; generated ordered program.json backup'} at ${generatedJsonPath}`);
  if (imageFiles.some((file, idx) => path.basename(file) !== uploadImageNames[idx])) {
    warnings.push(`Pages will upload with zero-padded names: ${uploadImageNames[0]} through ${uploadImageNames[uploadImageNames.length - 1]}`);
  }

  if (problems.length) {
    errorCount++;
    console.log(`ERROR: ${folderName} | ${problems.join(' | ')}`);
    reportRows.push({ folder: folderName, file: '', upload_file: '', status: 'error', storage_path: '', message: problems.join(' | ') });
    continue;
  }

  okCount++;
  console.log(`OK: ${folderName} | jpg=${imageFiles.length} | json=generated_ordered | manifest=${DRY_RUN ? 'would_update' : 'will_update'}`);
  for (const warning of warnings) console.log(`  WARNING: ${warning}`);

  const uploadItems = [];
  imageFiles.forEach((rel, index) => {
    uploadItems.push({
      rel,
      uploadRel: uploadImageNames[index],
      localPath: path.join(folderPath, rel),
      buffer: null,
      generated: false,
      upsert: false
    });
  });
  uploadItems.push({
    rel: 'program.json',
    uploadRel: 'program.json',
    localPath: '',
    buffer: Buffer.from(JSON.stringify(generatedJson, null, 2), 'utf8'),
    generated: true,
    upsert: true
  });

  for (const item of uploadItems) {
    const storagePath = `${ROOT}/${folderName}/${item.uploadRel}`.replace(/\\/g, '/');
    try {
      const exists = await storageExists(storagePath);
      if (exists && !item.upsert) {
        skipCount++;
        console.log(`  SKIP existing: ${storagePath}`);
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: 'skipped_existing', storage_path: storagePath, message: 'Already exists in storage' });
        continue;
      }
      if (DRY_RUN) {
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: exists && item.upsert ? 'would_replace_generated_json' : (item.generated ? 'would_upload_generated_json' : 'would_upload'), storage_path: storagePath, message: warnings.join(' | ') });
      } else {
        const buffer = item.generated ? item.buffer : fs.readFileSync(item.localPath);
        const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: contentType(item.uploadRel),
          upsert: item.upsert
        });
        if (error) throw new Error(error.message || 'Upload failed');
        uploadCount++;
        console.log(`  ${exists && item.upsert ? 'REPLACED' : 'UPLOADED'}: ${storagePath}`);
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: exists && item.upsert ? 'replaced_generated_json' : (item.generated ? 'uploaded_generated_json' : 'uploaded'), storage_path: storagePath, message: warnings.join(' | ') });
      }
    } catch (err) {
      errorCount++;
      console.log(`  ERROR: ${item.rel} -> ${item.uploadRel} | ${err.message}`);
      reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: 'error', storage_path: storagePath, message: err.message });
    }
  }

  const manifestEntry = makeManifestEntry(folderName, generatedJson, uploadImageNames);
  if (DRY_RUN) {
    manifestWouldChange++;
    console.log(`  MANIFEST: would add/update ${folderName}`);
  } else {
    try {
      const action = upsertManifestEntry(manifestEntry);
      if (action === 'added') manifestAdded++;
      else manifestUpdated++;
      console.log(`  MANIFEST: ${action} ${folderName}`);
    } catch (err) {
      errorCount++;
      console.log(`  MANIFEST ERROR: ${err.message}`);
      reportRows.push({ folder: folderName, file: 'race-programs-manifest.json', upload_file: '', status: 'manifest_error', storage_path: MANIFEST_PATH, message: err.message });
    }
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportsDir, `publication-upload-report-${stamp}.csv`);
const header = ['folder', 'file', 'upload_file', 'status', 'storage_path', 'message'];
const csv = [header.join(','), ...reportRows.map(r => header.map(h => csvEscape(r[h])).join(','))].join('\n');
fs.writeFileSync(reportPath, csv, 'utf8');

console.log('');
console.log('Done.');
console.log(`Folders OK: ${okCount}`);
console.log(`Errors: ${errorCount}`);
if (DRY_RUN) console.log(`Files ready/would upload: ${reportRows.filter(r => r.status.startsWith('would_upload') || r.status === 'would_replace_generated_json').length}`);
else console.log(`Files uploaded/replaced: ${uploadCount}`);
console.log(`Skipped existing: ${skipCount}`);
if (DRY_RUN) console.log(`Manifest entries would add/update: ${manifestWouldChange}`);
else console.log(`Manifest added: ${manifestAdded}; Manifest updated: ${manifestUpdated}`);
console.log(`Review report created:\n${reportPath}`);
