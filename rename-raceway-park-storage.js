const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://szvkleurojiwqkkztxtr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dmtsZXVyb2ppd3Fra3p0eHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzAyMTIsImV4cCI6MjA4OTU0NjIxMn0.S-LfuIuCW29Q7Yr9w8e96rSwkOXFvMRg4I68ew91F-Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listFolder(folder) {
  const { data, error } = await supabase.storage
    .from('photos')
    .list(folder, { limit: 1000 });

  if (error) {
    console.error(`ERROR ${folder}:`, error.message);
    return;
  }

  console.log(`\n=== ${folder} ===`);
  data.forEach(item => console.log(item.name));
}

async function main() {
  await listFolder('master');
  await listFolder('master/raceway-park-il');
  await listFolder('master/raceway-park-il-il');
}

main();