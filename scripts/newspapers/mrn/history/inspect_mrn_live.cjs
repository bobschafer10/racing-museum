const fs=require('fs');
const env=fs.readFileSync('C:/Users/schaf/racing-museum/.env.local','utf8');
function val(k){return env.match(new RegExp('^'+k+'=(.*)$','m'))?.[1].trim().replace(/^['"]|['"]$/g,'');}
const url=val('NEXT_PUBLIC_SUPABASE_URL'),key=val('SUPABASE_SERVICE_ROLE_KEY');
const base='C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1981';
async function api(path,body){let r=await fetch(url+path,{method:body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error(await r.text());return r.json();}
async function main(){
const dates=fs.readdirSync('C:/Users/schaf/Desktop/MRN/1981',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>{let [m,d,y]=x.name.split('-');return `19${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}).sort();
const remote=(await api('/storage/v1/object/list/media',{prefix:'newspapers/midwest-racing-news',search:'1981-',limit:1000})).map(x=>x.name).filter(x=>/^1981-\d\d-\d\d$/.test(x)).sort();
const comparison={source_issue_count:dates.length,supabase_issue_count:remote.length,missing:dates.filter(x=>!remote.includes(x)),extra:remote.filter(x=>!dates.includes(x)),duplicate_source_dates:dates.filter((x,i)=>dates.indexOf(x)!==i),page_missing:[]};
for(const date of dates){const rows=await api('/storage/v1/object/list/media',{prefix:'newspapers/midwest-racing-news/'+date,limit:1000});const expected=JSON.parse(fs.readFileSync(base+'/audit.json')).pages.filter(x=>x.issue_date===date);for(const p of expected)if(!rows.some(x=>x.name===p.page_number+'.jpg'))comparison.page_missing.push(p.object_key);}
fs.writeFileSync(base+'/source-live-comparison.json',JSON.stringify(comparison,null,2));console.log(comparison);
for(const date of ['1980-04-03','1980-07-03','1980-12-04']){const rows=await api('/storage/v1/object/list/media',{prefix:'newspapers/midwest-racing-news/'+date,limit:1000});console.log(date,rows.map(x=>x.name));if(rows.some(x=>x.name==='newspaper.json')){const r=await fetch(url+'/storage/v1/object/public/media/newspapers/midwest-racing-news/'+date+'/newspaper.json');const j=await r.json();fs.writeFileSync(base+'/template-'+date+'.json',JSON.stringify(j,null,2));console.log(j);}}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
