const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://szvkleurojiwqkkztxtr.supabase.co';
const SUPABASE_SERVICE_KEY = 'PASTE_NEW_SECRET_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase.storage
    .from('media')
    .list('photos/master', { limit: 10000 });

  if (error) {
    console.error(error);
    return;
  }

  const badFiles = data
    .filter((item) => item.name && item.name.includes('.') && !item.name.endsWith('/'))
    .map((item) => `photos/master/${item.name}`);

  console.log(`Found ${badFiles.length} flat files to delete.`);

  if (badFiles.length === 0) return;

  console.log(badFiles.slice(0, 20));

  const { error: removeError } = await supabase.storage
    .from('media')
    .remove(badFiles);

  if (removeError) {
    console.error(removeError);
    return;
  }

  console.log('DELETE COMPLETE');
}

main();