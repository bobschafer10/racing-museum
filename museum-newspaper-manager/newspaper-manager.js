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
  console.error('Use npm run newspapers-dry-run or npm run newspapers-upload');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const ROOT = (process.env.NEWSPAPERS_ROOT_FOLDER || 'newspapers').replace(/^\/+|\/+$/g, '');
const MAX_FOLDERS = Number(process.env.MAX_NEWSPAPER_FOLDERS || 10);
const WEBSITE_ROOT = path.resolve(__dirname, process.env.WEBSITE_ROOT || '..');
const MANIFEST_PATH = path.resolve(
  WEBSITE_ROOT,
  process.env.NEWSPAPERS_MANIFEST || path.join('public', 'data', 'newspapers-manifest.json')
);
const PAGE_PAD_WIDTH = Number(process.env.NEWSPAPER_PAGE_PAD_WIDTH || 3);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const batchDir = path.join(__dirname, 'newspaper-upload-batch');
const reportsDir = path.join(__dirname, 'upload-reports');
const generatedJsonDir = path.join(__dirname, 'generated-json');
fs.mkdirSync(batchDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(generatedJsonDir, { recursive: true });

const PUBLICATIONS = {
  'checkered-flag-racing-news': 'Checkered Flag Racing News',
  'midwest-racing-news': 'Midwest Racing News',
  'national-speed-sport-news': 'National Speed Sport News'
};

const PUBLICATION_ALIASES = {
  cfrn: 'checkered-flag-racing-news',
  'checkered-flag': 'checkered-flag-racing-news',
  'checkered-flag-racing-news': 'checkered-flag-racing-news',
  mrn: 'midwest-racing-news',
  'midwest-racing-news': 'midwest-racing-news',
  nssn: 'national-speed-sport-news',
  'national-speed-sport-news': 'national-speed-sport-news'
};

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
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(part => {
      const lower = part.toLowerCase();
      const special = { wi: 'WI', il: 'IL', mn: 'MN', mi: 'MI', nssn: 'NSSN', mrn: 'MRN', cfrn: 'CFRN' };
      return special[lower] || lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function normalizePublicationSlug(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  return PUBLICATION_ALIASES[key] || key;
}

function normalizeYear(twoOrFourDigitYear) {
  const n = Number(twoOrFourDigitYear);
  if (!Number.isInteger(n)) return null;
  if (String(twoOrFourDigitYear).length === 4) return n;
  // Museum archive assumption: two-digit newspaper years are usually 1900s.
  // Keep a small future window available for modern uploads.
  return n <= 29 ? 2000 + n : 1900 + n;
}

function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseLooseDate(value) {
  const raw = String(value || '').trim();

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return toIsoDate(match[1], match[2], match[3]);

  match = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (match) {
    const year = normalizeYear(match[3]);
    return toIsoDate(year, match[1], match[2]);
  }

  return null;
}

function parseIssueFolder(folderName) {
  // Recommended: publication-slug_YYYY-MM-DD
  // Optional:    publication-slug_YYYY-MM-DD_custom-issue-slug
  const underscore = folderName.split('_').filter(Boolean);
  if (underscore.length >= 2) {
    const issueDate = parseLooseDate(underscore[1]);
    if (issueDate) {
      const publicationSlug = normalizePublicationSlug(underscore[0]);
      const issueSlug = underscore[2] || issueDate;
      return { publicationSlug, issueDate, issueSlug, folderName, valid: true, normalizedFrom: folderName };
    }
  }

  // Also allow: YYYY-MM-DD_publication-slug
  if (underscore.length >= 2) {
    const issueDate = parseLooseDate(underscore[0]);
    if (issueDate) {
      const publicationSlug = normalizePublicationSlug(underscore[1]);
      const issueSlug = underscore[2] || issueDate;
      return { publicationSlug, issueDate, issueSlug, folderName, valid: true, normalizedFrom: folderName };
    }
  }

  // Existing archive-friendly shortcuts:
  //   CFRN 5.21.70
  //   CFRN 5-21-1970
  //   MRN 04.15.59
  //   NSSN 7-1-1961
  const shortcut = folderName.trim().match(/^([A-Za-z][A-Za-z0-9-]*)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/](?:\d{2}|\d{4}))$/);
  if (shortcut) {
    const publicationSlug = normalizePublicationSlug(shortcut[1]);
    const issueDate = parseLooseDate(shortcut[2]);
    if (issueDate) return { publicationSlug, issueDate, issueSlug: issueDate, folderName, valid: true, normalizedFrom: folderName };
  }

  return { publicationSlug: '', issueDate: '', issueSlug: '', folderName, valid: false };
}

function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function naturalSortFiles(files) {
  return [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function parsePageRange(file) {
  const base = path.basename(file, path.extname(file)).toLowerCase();

  // Page 2-3.jpg, pages 2-3.jpg, Page 16.jpg
  let match = base.match(/pages?\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?/i);
  if (match) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    return { start, end, label: end === start ? String(start) : `${start}-${end}` };
  }

  // 2-3.jpg, 04-05.jpg
  match = base.match(/(^|[^\d])(\d{1,4})\s*[-–]\s*(\d{1,4})([^\d]|$)/);
  if (match) {
    const start = Number(match[2]);
    const end = Number(match[3]);
    return { start, end, label: `${start}-${end}` };
  }

  // 001.jpg, issue_001.jpg, Page 1 copy.jpg
  const matches = base.match(/(\d+)/g);
  if (!matches) return null;
  const start = Number(matches[matches.length - 1]);
  return { start, end: start, label: String(start) };
}

function sortPageFiles(files) {
  return [...files].sort((a, b) => {
    const pa = parsePageRange(a);
    const pb = parsePageRange(b);
    if (pa && pb) {
      if (pa.start !== pb.start) return pa.start - pb.start;
      if (pa.end !== pb.end) return pa.end - pb.end;
    }
    if (pa && !pb) return -1;
    if (!pa && pb) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function detectPageNumberWarnings(imageFiles) {
  const ranges = imageFiles.map(parsePageRange).filter(Boolean);
  if (ranges.length < 2) return [];
  const warnings = [];
  let previousEnd = null;
  const seenStarts = new Set();

  for (const range of ranges) {
    if (seenStarts.has(range.start)) warnings.push(`Duplicate page start detected: ${range.start}`);
    seenStarts.add(range.start);
    if (previousEnd !== null && range.start !== previousEnd + 1) {
      warnings.push(`Page numbering gap or overlap between ${previousEnd} and ${range.start}`);
      break;
    }
    previousEnd = range.end;
  }

  if (ranges.length !== imageFiles.length) warnings.push('Some page filenames did not include a clear page number.');
  return [...new Set(warnings)];
}

function paddedPageName(originalFile) {
  const ext = path.extname(originalFile).toLowerCase() || '.jpg';
  const range = parsePageRange(originalFile);
  if (!range) return null;
  const first = String(range.start).padStart(PAGE_PAD_WIDTH, '0');
  if (range.end && range.end !== range.start) {
    const last = String(range.end).padStart(PAGE_PAD_WIDTH, '0');
    return `${first}-${last}${ext}`;
  }
  return `${first}${ext}`;
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

function generateNewspaperJson(issueMeta, uploadImageNames, existing = null) {
  const publicationName = PUBLICATIONS[issueMeta.publicationSlug] || titleCaseFromSlug(issueMeta.publicationSlug);
  const pages = uploadImageNames.map((file, idx) => ({
    pageNumber: idx + 1,
    image: file,
    title: file.includes('-') ? `Pages ${file.replace(/\.[^.]+$/, '').replace('-', '–')}` : `Page ${Number(file.replace(/\D/g, '') || idx + 1)}`
  }));

  return {
    ...(existing || {}),
    slug: existing?.slug || issueMeta.issueSlug,
    title: existing?.title || formatDisplayDate(issueMeta.issueDate),
    publication: existing?.publication || publicationName,
    publicationSlug: existing?.publicationSlug || issueMeta.publicationSlug,
    year: existing?.year || Number(issueMeta.issueDate.slice(0, 4)),
    issueDate: existing?.issueDate || issueMeta.issueDate,
    description: existing?.description || null,
    summary: existing?.summary || `${publicationName} issue from ${formatDisplayDate(issueMeta.issueDate)}.`,
    coverImage: 'front-cover.jpg',
    backCoverImage: 'back-cover.jpg',
    thumbnailImage: 'thumbnail.jpg',
    pageCount: pages.length,
    pages: uploadImageNames,
    pageObjects: pages,
    featured: existing?.featured || false,
    volume: existing?.volume || null,
    number: existing?.number || null,
    generatedBy: 'Museum Newspaper Manager v1.1',
    generatedAt: new Date().toISOString()
  };
}

function saveGeneratedJsonBackup(issueMeta, jsonObj) {
  const folderOut = path.join(generatedJsonDir, issueMeta.publicationSlug, issueMeta.issueSlug);
  fs.mkdirSync(folderOut, { recursive: true });
  const outPath = path.join(folderOut, 'newspaper.json');
  fs.writeFileSync(outPath, JSON.stringify(jsonObj, null, 2), 'utf8');
  return outPath;
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

function saveManifest(issues) {
  const sorted = [...issues].sort((a, b) => {
    if (a.publicationSlug !== b.publicationSlug) return String(a.publicationSlug || '').localeCompare(String(b.publicationSlug || ''));
    return String(a.issueDate || '').localeCompare(String(b.issueDate || ''));
  });
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function makeManifestEntry(issueMeta, newspaperJson, uploadImageNames) {
  const base = `${ROOT}/${issueMeta.publicationSlug}/${issueMeta.issueSlug}`;
  const pageUrls = uploadImageNames.map(name => publicStorageUrl(`${base}/${name}`));
  return {
    slug: issueMeta.issueSlug,
    title: newspaperJson.title,
    publication: newspaperJson.publication,
    publicationSlug: issueMeta.publicationSlug,
    year: newspaperJson.year,
    issueDate: newspaperJson.issueDate,
    description: newspaperJson.description || null,
    summary: newspaperJson.summary || null,
    coverImage: publicStorageUrl(`${base}/front-cover.jpg`),
    thumbnailImage: publicStorageUrl(`${base}/thumbnail.jpg`),
    backCoverImage: publicStorageUrl(`${base}/back-cover.jpg`),
    pages: pageUrls,
    featured: newspaperJson.featured || false,
    volume: newspaperJson.volume || null,
    number: newspaperJson.number || null
  };
}

function upsertManifestEntry(entry) {
  const manifest = loadManifest();
  const index = manifest.findIndex(item => item.publicationSlug === entry.publicationSlug && item.slug === entry.slug);
  if (index >= 0) manifest[index] = { ...manifest[index], ...entry };
  else manifest.push(entry);
  saveManifest(manifest);
  return index >= 0 ? 'updated' : 'added';
}

console.log('Museum Newspaper Manager v1.1 - CFRN/MRN/NSSN shortcuts + page spread support');
console.log(`Bucket: ${BUCKET}`);
console.log(`Root folder: ${ROOT}`);
console.log(`Manifest: ${MANIFEST_PATH}`);
if (DRY_RUN) console.log('DRY RUN: no files will be uploaded and manifest will not be changed.');
console.log('');

const folderEntries = fs.readdirSync(batchDir, { withFileTypes: true }).filter(d => d.isDirectory());
if (folderEntries.length === 0) {
  console.error(`No newspaper folders found in: ${batchDir}`);
  console.error('Expected examples: midwest-racing-news_1959-04-15 or CFRN 5.21.70');
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
  const issueMeta = parseIssueFolder(folderName);
  const files = listAllFiles(folderPath);
  const relFiles = files.map(f => path.relative(folderPath, f).replace(/\\/g, '/'));
  const imageFiles = sortPageFiles(relFiles.filter(f => /\.(jpe?g)$/i.test(f))); 
  const jsonFiles = relFiles.filter(f => /\.json$/i.test(f));
  const lowerNames = relFiles.map(f => f.toLowerCase());
  const duplicates = lowerNames.filter((name, i) => lowerNames.indexOf(name) !== i);
  const problems = [];
  const warnings = [];

  if (!issueMeta.valid) problems.push('Folder name must be publication-slug_YYYY-MM-DD or shortcut date format such as CFRN 5.21.70.');
  if (issueMeta.valid && !PUBLICATIONS[issueMeta.publicationSlug]) warnings.push(`Publication slug not in known list; using title case name for ${issueMeta.publicationSlug}.`);
  if (imageFiles.length === 0) problems.push('No JPG/JPEG page images found.');
  if (jsonFiles.length > 1) problems.push('More than one JSON file found.');
  if (duplicates.length) problems.push(`Duplicate local filenames found: ${[...new Set(duplicates)].join('; ')}`);
  warnings.push(...detectPageNumberWarnings(imageFiles));

  const uploadImageNames = imageFiles.map((file) => paddedPageName(file));
  if (uploadImageNames.some(name => !name)) problems.push('One or more page files could not be converted into a standard page name.');
  const duplicateUploadNames = uploadImageNames.filter((name, i) => name && uploadImageNames.indexOf(name) !== i);
  if (duplicateUploadNames.length) problems.push(`Duplicate standardized upload names would be created: ${[...new Set(duplicateUploadNames)].join('; ')}`);

  const existingJson = readExistingJson(folderPath, jsonFiles);
  const generatedJson = issueMeta.valid ? generateNewspaperJson(issueMeta, uploadImageNames, existingJson) : null;
  let generatedJsonPath = '';
  if (generatedJson) {
    generatedJsonPath = saveGeneratedJsonBackup(issueMeta, generatedJson);
    warnings.push(`${jsonFiles.length ? 'Existing JSON found; generated ordered newspaper.json backup' : 'No JSON found; generated ordered newspaper.json backup'} at ${generatedJsonPath}`);
  }
  if (imageFiles.some((file, idx) => path.basename(file) !== uploadImageNames[idx])) {
    warnings.push(`Pages will upload with standardized names, for example: ${path.basename(imageFiles[0] || '')} -> ${uploadImageNames[0]}, ${path.basename(imageFiles[imageFiles.length - 1] || '')} -> ${uploadImageNames[uploadImageNames.length - 1]}`);
  }
  if (issueMeta.valid && issueMeta.normalizedFrom !== `${issueMeta.publicationSlug}_${issueMeta.issueDate}`) {
    warnings.push(`Folder name normalized to ${issueMeta.publicationSlug}/${issueMeta.issueSlug}`);
  }

  if (problems.length) {
    errorCount++;
    console.log(`ERROR: ${folderName} | ${problems.join(' | ')}`);
    reportRows.push({ folder: folderName, file: '', upload_file: '', status: 'error', storage_path: '', message: problems.join(' | ') });
    continue;
  }

  okCount++;
  console.log(`OK: ${folderName} | publication=${issueMeta.publicationSlug} | issue=${issueMeta.issueSlug} | jpg=${imageFiles.length} | json=generated_ordered | covers=front/back/thumbnail | manifest=${DRY_RUN ? 'would_update' : 'will_update'}`);
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

  const frontCoverLocal = imageFiles[0] ? path.join(folderPath, imageFiles[0]) : null;
  const backCoverLocal = imageFiles.length ? path.join(folderPath, imageFiles[imageFiles.length - 1]) : null;

  if (frontCoverLocal) {
    uploadItems.push({ rel: imageFiles[0], uploadRel: 'front-cover.jpg', localPath: frontCoverLocal, buffer: null, generated: false, upsert: true });
    uploadItems.push({ rel: imageFiles[0], uploadRel: 'thumbnail.jpg', localPath: frontCoverLocal, buffer: null, generated: false, upsert: true });
  }
  if (backCoverLocal) {
    uploadItems.push({ rel: imageFiles[imageFiles.length - 1], uploadRel: 'back-cover.jpg', localPath: backCoverLocal, buffer: null, generated: false, upsert: true });
  }

  uploadItems.push({
    rel: 'newspaper.json',
    uploadRel: 'newspaper.json',
    localPath: '',
    buffer: Buffer.from(JSON.stringify(generatedJson, null, 2), 'utf8'),
    generated: true,
    upsert: true
  });

  for (const item of uploadItems) {
    const storagePath = `${ROOT}/${issueMeta.publicationSlug}/${issueMeta.issueSlug}/${item.uploadRel}`.replace(/\\/g, '/');
    try {
      const exists = await storageExists(storagePath);
      if (exists && !item.upsert) {
        skipCount++;
        console.log(`  SKIP existing: ${storagePath}`);
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: 'skipped_existing', storage_path: storagePath, message: 'Already exists in storage' });
        continue;
      }
      if (DRY_RUN) {
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: exists && item.upsert ? 'would_replace_generated_file' : (item.generated ? 'would_upload_generated_json' : 'would_upload'), storage_path: storagePath, message: warnings.join(' | ') });
      } else {
        const buffer = item.generated ? item.buffer : fs.readFileSync(item.localPath);
        const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: contentType(item.uploadRel),
          upsert: item.upsert
        });
        if (error) throw new Error(error.message || 'Upload failed');
        uploadCount++;
        console.log(`  ${exists && item.upsert ? 'REPLACED' : 'UPLOADED'}: ${storagePath}`);
        reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: exists && item.upsert ? 'replaced_generated_file' : (item.generated ? 'uploaded_generated_json' : 'uploaded'), storage_path: storagePath, message: warnings.join(' | ') });
      }
    } catch (err) {
      errorCount++;
      console.log(`  ERROR: ${item.rel} -> ${item.uploadRel} | ${err.message}`);
      reportRows.push({ folder: folderName, file: item.rel, upload_file: item.uploadRel, status: 'error', storage_path: storagePath, message: err.message });
    }
  }

  const manifestEntry = makeManifestEntry(issueMeta, generatedJson, uploadImageNames);
  if (DRY_RUN) {
    manifestWouldChange++;
    console.log(`  MANIFEST: would add/update ${issueMeta.publicationSlug}/${issueMeta.issueSlug}`);
  } else {
    try {
      const action = upsertManifestEntry(manifestEntry);
      if (action === 'added') manifestAdded++;
      else manifestUpdated++;
      console.log(`  MANIFEST: ${action} ${issueMeta.publicationSlug}/${issueMeta.issueSlug}`);
    } catch (err) {
      errorCount++;
      console.log(`  MANIFEST ERROR: ${err.message}`);
      reportRows.push({ folder: folderName, file: 'newspapers-manifest.json', upload_file: '', status: 'manifest_error', storage_path: MANIFEST_PATH, message: err.message });
    }
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportsDir, `newspaper-upload-report-${stamp}.csv`);
const header = ['folder', 'file', 'upload_file', 'status', 'storage_path', 'message'];
const csv = [header.join(','), ...reportRows.map(r => header.map(h => csvEscape(r[h])).join(','))].join('\n');
fs.writeFileSync(reportPath, csv, 'utf8');

console.log('');
console.log('Done.');
console.log(`Folders OK: ${okCount}`);
console.log(`Errors: ${errorCount}`);
if (DRY_RUN) console.log(`Files ready/would upload: ${reportRows.filter(r => r.status.startsWith('would_upload') || r.status === 'would_replace_generated_file').length}`);
else console.log(`Files uploaded/replaced: ${uploadCount}`);
console.log(`Skipped existing: ${skipCount}`);
if (DRY_RUN) console.log(`Manifest entries would add/update: ${manifestWouldChange}`);
else console.log(`Manifest added: ${manifestAdded}; Manifest updated: ${manifestUpdated}`);
console.log(`Review report created:\n${reportPath}`);
