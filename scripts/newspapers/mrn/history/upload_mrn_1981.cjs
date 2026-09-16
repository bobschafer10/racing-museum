const fs=require('fs');
const base='C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1981';
const env=fs.readFileSync('C:/Users/schaf/racing-museum/.env.local','utf8');
function val(k){const m=env.match(new RegExp('^'+k+'=(.*)$','m'));return m?.[1].trim().replace(/^['"]|['"]$/g,'');}
const url=val('NEXT_PUBLIC_SUPABASE_URL'),key=val('SUPABASE_SERVICE_ROLE_KEY');
if(!url?.includes('szvkleurojiwqkkztxtr.supabase.co')||!key)throw Error('Expected live project credentials missing');
const audit=JSON.parse(fs.readFileSync(base+'/audit.json'));
const log=base+'/live-upload-log.jsonl';
let next=0,ok=0,failed=0;
async function worker(){while(next<audit.pages.length){const p=audit.pages[next++];if(!/^newspapers\/midwest-racing-news\/1981-\d\d-\d\d\/\d+\.jpg$/.test(p.object_key))throw Error('Invalid key');
let status='failed',message='';
for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url+'/storage/v1/object/media/'+p.object_key,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'image/jpeg','x-upsert':'false'},body:fs.readFileSync(p.output_path),signal:AbortSignal.timeout(120000)});const t=await r.text();if(r.ok){status='uploaded';break;}if(/already exists|duplicate/i.test(t)){status='already_present';break;}message=t;if(r.status<500)break;}catch(e){message=e.message;}}
fs.appendFileSync(log,JSON.stringify({time:new Date().toISOString(),project:'szvkleurojiwqkkztxtr',bucket:'media',key:p.object_key,status,message})+'\n');if(status==='failed')failed++;else ok++;if((ok+failed)%20===0)console.log(JSON.stringify({completed:ok+failed,ok,failed}));}}
Promise.all(Array.from({length:4},worker)).then(()=>{console.log(JSON.stringify({ok,failed}));if(failed)process.exitCode=1;});
