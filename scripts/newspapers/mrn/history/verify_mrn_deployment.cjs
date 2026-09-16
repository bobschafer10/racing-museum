const fs=require('fs'),assert=require('assert');
const base='C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1981';
async function main(){
const r=await fetch('https://racing-museum.vercel.app/data/newspapers-manifest.json');assert.equal(r.status,200);const manifest=await r.json();
const issues=manifest.filter(x=>x.publicationSlug==='midwest-racing-news'&&Number(x.year)===1981);
const audit=JSON.parse(fs.readFileSync(base+'/audit.json'));const expected=audit.pages.map(x=>x.object_key).sort();const represented=issues.flatMap(x=>x.pages).map(x=>x.split('/public/media/')[1]).sort();
assert.deepStrictEqual(represented,expected);assert.deepStrictEqual(issues.map(x=>x.issueDate).sort(),audit.issues.map(x=>x.issue_date).sort());assert.equal(new Set(represented).size,492);
const baseline=await fetch('https://raw.githubusercontent.com/bobschafer10/racing-museum/ff0f48f1272cb3c38f11711ba881fac7d2de7446/public/data/newspapers-manifest.json').then(r=>r.json());assert.deepStrictEqual(manifest.filter(x=>!(x.publicationSlug==='midwest-racing-news'&&Number(x.year)===1981)),baseline);
const status=await fetch('https://api.github.com/repos/bobschafer10/racing-museum/commits/9eabe4ee9d345caf5b22d7ff5114c92e22ef5567/status').then(r=>r.json());const deployments=status.statuses.map(x=>({context:x.context,state:x.state,url:x.target_url}));
assert(deployments.some(x=>x.context==='Vercel – racing-museum'&&x.state==='success'));
let missing=[],next=0;async function worker(){while(next<represented.length){let p=represented[next++];let r=await fetch('https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/'+p,{method:'HEAD'});if(r.status!==200)missing.push({path:p,status:r.status});}}
await Promise.all(Array.from({length:8},worker));
const search=await fetch('https://racing-museum.vercel.app/api/newspaper-search?q=Raceway%20Park&source=midwest-racing-news&year=1981&pageSize=25').then(r=>r.json());assert.equal(search.total,296);assert(search.results.every(x=>x.publicationYear===1981&&x.sourceKey==='midwest-racing-news'));
const result={live_manifest_issues:issues.length,live_manifest_page_urls:represented.length,unique_page_urls:new Set(represented).size,source_issue_dates_match:true,source_page_paths_match:true,existing_manifest_entries_unchanged:baseline.length,public_page_head_checks:represented.length,missing_public_pages:missing,manifest_commit:status.sha,deployments,public_search_total:search.total,public_search_returned_1981_results:search.results.length};
fs.writeFileSync(base+'/final-deployment-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(missing.length,0);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
