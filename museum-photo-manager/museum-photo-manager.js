/*
  Upper Midwest Auto Racing Museum - Museum Photo Manager v2

  v2 adds a simple command-line menu for:
    1) Upload new photos with dry-run support
    2) Search photos
    3) Rename/move a photo by photo_id using a corrected filename
    4) Replace an existing storage image while keeping the same database row
    5) Verify one photo_id: expected storage path + storage existence

  Storage layout:
    bucket: media
    path: photos/master/<track_slug>/<year>/<file_name>

  Database table:
    public.photos lowercase
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';
const PHOTOS_TABLE = process.env.SUPABASE_PHOTOS_TABLE || 'photos';
const STORAGE_ROOT_FOLDER = process.env.STORAGE_ROOT_FOLDER || 'photos/master';
const MAX_BATCH_SIZE = Number(process.env.MAX_BATCH_SIZE || 30);

const BATCH_FOLDER = path.join(__dirname, 'photo-upload-batch');
const REPORT_FOLDER = path.join(__dirname, 'upload-reports');
const DONE_FOLDER = path.join(__dirname, 'uploaded-done');
const REPLACE_FOLDER = path.join(__dirname, 'replace-file');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ensureFolders() {
  for (const folder of [BATCH_FOLDER, REPORT_FOLDER, DONE_FOLDER, REPLACE_FOLDER]) {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parsePhotoFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('File must be .jpg, .jpeg, .png, or .webp');
  const base = path.basename(fileName, ext);
  const parts = base.split('_');
  if (parts.length !== 6) {
    throw new Error('Filename must have exactly 6 underscore-separated parts: track_year_driver_photographer_credit_sequence');
  }
  const [track_slug, year, driver_slug, photographer_slug, credit_type, sequenceText] = parts;
  if (!track_slug || !year || !driver_slug || !photographer_slug || !credit_type || !sequenceText) throw new Error('Filename has one or more blank parts.');
  if (!/^\d{4}$/.test(year) && year !== 'unknown-year') throw new Error('Year must be a 4-digit year or unknown-year.');
  if (!['photo', 'post', 'program', 'logo'].includes(credit_type)) throw new Error('Credit type should normally be photo, post, program, or logo.');
  const sequence = Number(sequenceText);
  if (!Number.isInteger(sequence)) throw new Error('Sequence must be a number, such as 333.');
  return { file_name: fileName, track_slug, year, driver_slug, photographer_slug, credit_type, sequence, needs_review: true };
}

function buildStoragePath(row) {
  return `${STORAGE_ROOT_FOLDER}/${row.track_slug}/${row.year}/${row.file_name}`.replace(/\/g, '/').replace(/\/+/g, '/');
}

function contentTypeFor(localPath) {
  const ext = path.extname(localPath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function storageObjectExists(storagePath) {
  const folder = path.dirname(storagePath).replace(/\\/g, '/');
  const file = path.basename(storagePath);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { search: file, limit: 100 });
  if (error) throw new Error(`Storage lookup failed: ${error.message}`);
  return Array.isArray(data) && data.some((item) => item.name === file);
}

async function photoRowExists(fileName) {
  const { data, error } = await supabase.from(PHOTOS_TABLE).select('photo_id,file_name').eq('file_name', fileName).limit(1);
  if (error) throw new Error(`${PHOTOS_TABLE} lookup failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

async function uploadFile(localPath, storagePath, upsert = false) {
  const buffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, { contentType: contentTypeFor(localPath), upsert });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

async function insertPhotoRow(row) {
  const { error } = await supabase.from(PHOTOS_TABLE).insert(row);
  if (error) throw new Error(`${PHOTOS_TABLE} insert failed: ${error.message}`);
}

function writeReport(reportPath, rows) {
  const headers = ['file_name','storage_path','track_slug','year','driver_slug','photographer_slug','credit_type','sequence','storage_status','db_status','error'];
  fs.writeFileSync(reportPath, [headers.join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n'), 'utf8');
}

function moveToDone(localPath, fileName) {
  const target = path.join(DONE_FOLDER, fileName);
  if (fs.existsSync(target)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.renameSync(localPath, path.join(DONE_FOLDER, `${timestamp}-${fileName}`));
  } else fs.renameSync(localPath, target);
}

async function uploadBatch({ dryRun = false, moveDone = false } = {}) {
  ensureFolders();
  const files = fs.readdirSync(BATCH_FOLDER).filter((f) => ALLOWED_EXTENSIONS.has(path.extname(f).toLowerCase())).sort();
  if (!files.length) { console.log(`No photos found in: ${BATCH_FOLDER}`); return; }
  if (files.length > MAX_BATCH_SIZE) { console.error(`Too many photos: ${files.length}. Limit is ${MAX_BATCH_SIZE}.`); return; }

  const reportRows = [];
  let ok = 0, errors = 0, uploaded = 0, inserted = 0, skippedStorage = 0, skippedDb = 0;
  const reportPath = path.join(REPORT_FOLDER, `photo-upload-report-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  console.log(`Museum Photo Manager v2`);
  console.log(`Bucket: ${STORAGE_BUCKET}`);
  console.log(`Table: ${PHOTOS_TABLE}`);
  console.log(`Root: ${STORAGE_ROOT_FOLDER}`);
  console.log(`Batch size: ${files.length}/${MAX_BATCH_SIZE}`);
  if (dryRun) console.log('DRY RUN: no files or database rows will be changed.');
  console.log('');

  for (const [index, file] of files.entries()) {
    const localPath = path.join(BATCH_FOLDER, file);
    let parsed = null, storagePath = '', storageStatus = 'not_started', dbStatus = 'not_started', errMsg = '';
    try {
      parsed = parsePhotoFileName(file);
      storagePath = buildStoragePath(parsed);
      const storageExists = await storageObjectExists(storagePath);
      const dbExists = await photoRowExists(parsed.file_name);
      if (dryRun) {
        storageStatus = storageExists ? 'would_skip_exists' : 'would_upload';
        dbStatus = dbExists ? 'would_skip_exists' : 'would_insert';
      } else {
        if (storageExists) { storageStatus = 'skipped_exists'; skippedStorage++; }
        else { await uploadFile(localPath, storagePath); storageStatus = 'uploaded'; uploaded++; }
        if (dbExists) { dbStatus = 'skipped_exists'; skippedDb++; }
        else { await insertPhotoRow(parsed); dbStatus = 'inserted'; inserted++; }
        if (moveDone) moveToDone(localPath, file);
      }
      ok++;
      console.log(`OK ${index + 1}/${files.length}: ${file} | storage=${storageStatus} | db=${dbStatus}`);
    } catch (err) {
      errors++;
      errMsg = err.message;
      storageStatus = storageStatus === 'not_started' ? 'error' : storageStatus;
      dbStatus = dbStatus === 'not_started' ? 'error' : dbStatus;
      console.error(`ERROR ${index + 1}/${files.length}: ${file} | ${errMsg}`);
    }
    reportRows.push({ file_name: file, storage_path: storagePath ? `${STORAGE_BUCKET}/${storagePath}` : '', track_slug: parsed?.track_slug || '', year: parsed?.year || '', driver_slug: parsed?.driver_slug || '', photographer_slug: parsed?.photographer_slug || '', credit_type: parsed?.credit_type || '', sequence: parsed?.sequence || '', storage_status: storageStatus, db_status: dbStatus, error: errMsg });
  }
  writeReport(reportPath, reportRows);
  console.log('\n====================================');
  console.log(`Processed: ${files.length}`);
  console.log(`OK: ${ok}`);
  console.log(`Errors: ${errors}`);
  if (!dryRun) console.log(`Uploaded: ${uploaded} | DB inserted: ${inserted} | Storage skipped: ${skippedStorage} | DB skipped: ${skippedDb}`);
  console.log(`Report: ${reportPath}`);
  console.log('====================================');
}

async function getPhotoById(photoId) {
  const { data, error } = await supabase.from(PHOTOS_TABLE).select('*').eq('photo_id', photoId).single();
  if (error) throw new Error(`Photo lookup failed: ${error.message}`);
  return data;
}

function printPhoto(row) {
  const storagePath = buildStoragePath(row);
  console.log(`photo_id: ${row.photo_id}`);
  console.log(`file_name: ${row.file_name}`);
  console.log(`track_slug: ${row.track_slug}`);
  console.log(`year: ${row.year}`);
  console.log(`driver_slug: ${row.driver_slug}`);
  console.log(`photographer_slug: ${row.photographer_slug}`);
  console.log(`credit_type: ${row.credit_type}`);
  console.log(`sequence: ${row.sequence}`);
  console.log(`storage: ${STORAGE_BUCKET}/${storagePath}`);
}

async function searchPhotos(rl) {
  const term = (await rl.question('Search term, slug, filename, or photo_id: ')).trim();
  if (!term) return;
  let query = supabase.from(PHOTOS_TABLE).select('photo_id,file_name,track_slug,driver_slug,year,photographer_slug,credit_type,sequence').limit(25);
  if (/^\d+$/.test(term)) query = query.eq('photo_id', Number(term));
  else query = query.or(`file_name.ilike.%${term}%,track_slug.ilike.%${term}%,driver_slug.ilike.%${term}%,photographer_slug.ilike.%${term}%,year.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) { console.error(error.message); return; }
  if (!data.length) { console.log('No matches.'); return; }
  console.log(`\nFound ${data.length} match(es):`);
  for (const row of data) console.log(`${row.photo_id} | ${row.file_name} | ${row.track_slug}/${row.year} | ${row.driver_slug} | ${row.photographer_slug}`);
}

async function verifyPhoto(rl) {
  const photoId = (await rl.question('Photo ID to verify: ')).trim();
  if (!/^\d+$/.test(photoId)) return console.log('Photo ID must be a number.');
  try {
    const row = await getPhotoById(Number(photoId));
    printPhoto(row);
    const exists = await storageObjectExists(buildStoragePath(row));
    console.log(`Storage exists: ${exists ? 'YES' : 'NO'}`);
  } catch (err) { console.error(err.message); }
}

async function renameMovePhoto(rl) {
  const photoId = (await rl.question('Photo ID to rename/move: ')).trim();
  if (!/^\d+$/.test(photoId)) return console.log('Photo ID must be a number.');
  const newFileName = (await rl.question('New corrected filename: ')).trim();
  let oldRow, newRow;
  try {
    oldRow = await getPhotoById(Number(photoId));
    newRow = { ...parsePhotoFileName(newFileName), photo_id: oldRow.photo_id };
  } catch (err) { return console.error(err.message); }

  const oldPath = buildStoragePath(oldRow);
  const newPath = buildStoragePath(newRow);
  console.log('\nOLD:'); printPhoto(oldRow);
  console.log('\nNEW:'); printPhoto(newRow);
  console.log(`\nStorage move: ${STORAGE_BUCKET}/${oldPath} -> ${STORAGE_BUCKET}/${newPath}`);
  const yes = (await rl.question('Proceed? Type YES: ')).trim();
  if (yes !== 'YES') return console.log('Cancelled.');

  try {
    const newExists = await storageObjectExists(newPath);
    if (newExists) throw new Error('New storage path already exists. Rename cancelled.');
    const { error: moveError } = await supabase.storage.from(STORAGE_BUCKET).move(oldPath, newPath);
    if (moveError) throw new Error(`Storage move failed: ${moveError.message}`);
    const { error: updateError } = await supabase.from(PHOTOS_TABLE).update({ file_name: newRow.file_name, track_slug: newRow.track_slug, driver_slug: newRow.driver_slug, year: newRow.year, photographer_slug: newRow.photographer_slug, credit_type: newRow.credit_type, sequence: newRow.sequence, needs_review: true }).eq('photo_id', oldRow.photo_id);
    if (updateError) throw new Error(`${PHOTOS_TABLE} update failed: ${updateError.message}`);
    console.log('Rename/move complete.');
  } catch (err) { console.error(err.message); }
}

async function replacePhoto(rl) {
  const photoId = (await rl.question('Photo ID to replace image for: ')).trim();
  if (!/^\d+$/.test(photoId)) return console.log('Photo ID must be a number.');
  const files = fs.readdirSync(REPLACE_FOLDER).filter((f) => ALLOWED_EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (files.length !== 1) return console.log(`Put exactly ONE replacement image in: ${REPLACE_FOLDER}`);
  try {
    const row = await getPhotoById(Number(photoId));
    const storagePath = buildStoragePath(row);
    console.log(`Will replace storage image at: ${STORAGE_BUCKET}/${storagePath}`);
    console.log(`Replacement file: ${files[0]}`);
    const yes = (await rl.question('Proceed? Type YES: ')).trim();
    if (yes !== 'YES') return console.log('Cancelled.');
    await uploadFile(path.join(REPLACE_FOLDER, files[0]), storagePath, true);
    console.log('Replacement upload complete. Database row was not changed.');
  } catch (err) { console.error(err.message); }
}

async function menu() {
  ensureFolders();
  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      console.log('\n=========================================');
      console.log('Upper Midwest Auto Racing Museum');
      console.log('Photo Manager v2');
      console.log('=========================================');
      console.log('1. Dry run upload batch');
      console.log('2. Upload batch');
      console.log('3. Upload batch and move files to uploaded-done');
      console.log('4. Search photos');
      console.log('5. Verify one photo_id');
      console.log('6. Rename/move one photo_id');
      console.log('7. Replace image for one photo_id');
      console.log('8. Exit');
      const choice = (await rl.question('Choose: ')).trim();
      if (choice === '1') await uploadBatch({ dryRun: true });
      else if (choice === '2') await uploadBatch({ dryRun: false });
      else if (choice === '3') await uploadBatch({ dryRun: false, moveDone: true });
      else if (choice === '4') await searchPhotos(rl);
      else if (choice === '5') await verifyPhoto(rl);
      else if (choice === '6') await renameMovePhoto(rl);
      else if (choice === '7') await replacePhoto(rl);
      else if (choice === '8') break;
      else console.log('Invalid choice.');
    }
  } finally { rl.close(); }
}

const args = process.argv.slice(2);
if (args[0] === 'upload') uploadBatch({ dryRun: args.includes('--dry-run'), moveDone: args.includes('--move-done') }).catch((err) => { console.error(err); process.exit(1); });
else menu().catch((err) => { console.error(err); process.exit(1); });
