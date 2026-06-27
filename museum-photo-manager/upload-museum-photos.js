/*
  Upper Midwest Auto Racing Museum - Museum Photo Manager v1

  This script uploads a small batch of photos to Supabase Storage and inserts
  matching records into the lowercase public.photos table. Phase 1 is upload-only: dry run, duplicate checks, 30-photo limit, and CSV report.

  Expected filename format:
    trackslug_year_driverslug_photographerslug_photo_333.jpg

  Example:
    141-speedway_1984_dave-sanders_al-fortner_photo_333.jpg

  Storage result:
    bucket: photos
    path:   master/141-speedway/1984/141-speedway_1984_dave-sanders_al-fortner_photo_333.jpg

  Database result:
    public.photos row with file_name, track_slug, driver_slug, year,
    photographer_slug, credit_type, sequence, needs_review = true

  Run:
    npm install
    npm run upload

  Optional:
    npm run dry-run
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'photos';
const PHOTOS_TABLE = process.env.SUPABASE_PHOTOS_TABLE || 'photos'; // lowercase table name
const STORAGE_ROOT_FOLDER = process.env.STORAGE_ROOT_FOLDER || 'master';

const BATCH_FOLDER = path.join(__dirname, 'photo-upload-batch');
const REPORT_FOLDER = path.join(__dirname, 'upload-reports');
const MAX_BATCH_SIZE = Number(process.env.MAX_BATCH_SIZE || 30);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DRY_RUN = process.argv.includes('--dry-run');
const MOVE_DONE = process.argv.includes('--move-done');
const DONE_FOLDER = path.join(__dirname, 'uploaded-done');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  console.error('Copy .env.example to .env and fill in your Supabase project values.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ensureFolders() {
  for (const folder of [BATCH_FOLDER, REPORT_FOLDER, DONE_FOLDER]) {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parsePhotoFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const parts = base.split('_');

  if (parts.length !== 6) {
    throw new Error('Filename must have exactly 6 underscore-separated parts: track_year_driver_photographer_credit_sequence');
  }

  const [track_slug, year, driver_slug, photographer_slug, credit_type, sequenceText] = parts;

  if (!track_slug || !year || !driver_slug || !photographer_slug || !credit_type || !sequenceText) {
    throw new Error('Filename has one or more blank parts.');
  }

  if (!/^\d{4}$/.test(year) && year !== 'unknown-year') {
    throw new Error('Year must be a 4-digit year or unknown-year.');
  }

  if (!['photo', 'post', 'program', 'logo'].includes(credit_type)) {
    throw new Error('Credit type should normally be photo, post, program, or logo.');
  }

  const sequence = Number(sequenceText);
  if (!Number.isInteger(sequence)) {
    throw new Error('Sequence must be a number, such as 333.');
  }

  return {
    file_name: fileName,
    track_slug,
    year,
    driver_slug,
    photographer_slug,
    credit_type,
    sequence,
    needs_review: true,
  };
}

function buildStoragePath(row) {
  return `${STORAGE_ROOT_FOLDER}/${row.track_slug}/${row.year}/${row.file_name}`.replace(/\\/g, '/');
}

async function storageObjectExists(storagePath) {
  const folder = path.dirname(storagePath).replace(/\\/g, '/');
  const file = path.basename(storagePath);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { search: file, limit: 100 });

  if (error) throw new Error(`Storage lookup failed: ${error.message}`);
  return Array.isArray(data) && data.some((item) => item.name === file);
}

async function photoRowExists(fileName) {
  const { data, error } = await supabase
    .from(PHOTOS_TABLE)
    .select('photo_id,file_name')
    .eq('file_name', fileName)
    .limit(1);

  if (error) throw new Error(`${PHOTOS_TABLE} lookup failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

async function uploadFile(localPath, storagePath) {
  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    'image/jpeg';

  const fileBuffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

async function insertPhotoRow(row) {
  const { error } = await supabase.from(PHOTOS_TABLE).insert(row);
  if (error) throw new Error(`${PHOTOS_TABLE} insert failed: ${error.message}`);
}

function writeReport(reportPath, reportRows) {
  const headers = [
    'file_name',
    'storage_path',
    'track_slug',
    'year',
    'driver_slug',
    'photographer_slug',
    'credit_type',
    'sequence',
    'storage_status',
    'db_status',
    'error',
  ];

  const csv = [
    headers.join(','),
    ...reportRows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');

  fs.writeFileSync(reportPath, csv, 'utf8');
}

function moveToDone(localPath, fileName) {
  const target = path.join(DONE_FOLDER, fileName);
  if (fs.existsSync(target)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.renameSync(localPath, path.join(DONE_FOLDER, `${timestamp}-${fileName}`));
  } else {
    fs.renameSync(localPath, target);
  }
}

async function main() {
  ensureFolders();

  const files = fs.readdirSync(BATCH_FOLDER)
    .filter((file) => ALLOWED_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log(`No photos found in: ${BATCH_FOLDER}`);
    console.log('Add 1 to 30 photos and run again.');
    return;
  }

  if (files.length > MAX_BATCH_SIZE) {
    console.error(`Too many photos in batch folder: ${files.length}`);
    console.error(`Limit is ${MAX_BATCH_SIZE}. Move some photos out and run again.`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_FOLDER, `photo-upload-report-${timestamp}.csv`);
  const reportRows = [];

  console.log(`Museum Photo Manager v1`);
  console.log(`Bucket: ${STORAGE_BUCKET}`);
  console.log(`Table: ${PHOTOS_TABLE}`);
  console.log(`Batch size: ${files.length}/${MAX_BATCH_SIZE}`);
  if (DRY_RUN) console.log('DRY RUN: no files or database rows will be changed.');
  console.log('');

  for (const file of files) {
    const localPath = path.join(BATCH_FOLDER, file);
    let parsed = null;
    let storagePath = '';
    let storageStatus = 'not_started';
    let dbStatus = 'not_started';

    try {
      parsed = parsePhotoFileName(file);
      storagePath = buildStoragePath(parsed);

      const storageExists = await storageObjectExists(storagePath);
      const dbExists = await photoRowExists(parsed.file_name);

      if (DRY_RUN) {
        storageStatus = storageExists ? 'would_skip_exists' : 'would_upload';
        dbStatus = dbExists ? 'would_skip_exists' : 'would_insert';
      } else {
        if (storageExists) {
          storageStatus = 'skipped_exists';
        } else {
          await uploadFile(localPath, storagePath);
          storageStatus = 'uploaded';
        }

        if (dbExists) {
          dbStatus = 'skipped_exists';
        } else {
          await insertPhotoRow(parsed);
          dbStatus = 'inserted';
        }
      }

      if (!DRY_RUN && MOVE_DONE && storageStatus !== 'error' && dbStatus !== 'error') {
        moveToDone(localPath, file);
      }

      console.log(`OK: ${file} | storage=${storageStatus} | db=${dbStatus}`);
    } catch (err) {
      storageStatus = storageStatus === 'not_started' ? 'error' : storageStatus;
      dbStatus = dbStatus === 'not_started' ? 'error' : dbStatus;
      console.error(`ERROR: ${file} | ${err.message}`);
    }

    reportRows.push({
      file_name: file,
      storage_path: storagePath ? `${STORAGE_BUCKET}/${storagePath}` : '',
      track_slug: parsed?.track_slug || '',
      year: parsed?.year || '',
      driver_slug: parsed?.driver_slug || '',
      photographer_slug: parsed?.photographer_slug || '',
      credit_type: parsed?.credit_type || '',
      sequence: parsed?.sequence || '',
      storage_status: storageStatus,
      db_status: dbStatus,
      error: storageStatus === 'error' || dbStatus === 'error' ? 'See command window message above.' : '',
    });
  }

  writeReport(reportPath, reportRows);

  console.log('');
  console.log('Done. Review report created:');
  console.log(reportPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
