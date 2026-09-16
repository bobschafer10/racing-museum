#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {PREFIX,isTarget,same,parseIssue,validateIssues,complete,metadata,mergeManifest,preservedManifestEntry}=require('./logic.cjs');
const config=require('./config.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function argumentsFor(argv) {
  const out={dryRun:false};
  for(let i=0;i<argv.length;i++) { const a=argv[i]; if(a==='--dry-run') out.dryRun=true; else if(a==='--help') out.help=true; else if(['--year','--source-root','--project-root','--state-root','--tesseract'].includes(a)){assert(argv[i+1]&&!argv[i+1].startsWith('--'),`Missing value for ${a}`);out[a.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=argv[++i];} else throw Error(`Unknown argument: ${a}`); }
  if(!out.help) { out.year=Number(out.year); assert(Number.isInteger(out.year)&&out.year>=1959&&out.year<=2100,'Use --year YYYY (1959–2100)'); }
  return out;
}
function save(file,data) { fs.mkdirSync(path.dirname(file),{recursive:true}); const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file); }
async function pool(items,count,fn) { let next=0; await Promise.all(Array.from({length:Math.min(count,items.length)},async()=>{while(next<items.length){const i=next++;await fn(items[i],i);}})); }
async function main(argv=process.argv.slice(2),dependencies={}) {
  const {execFileSync,spawn}=dependencies.childProcess||require('node:child_process');
  const fetch=dependencies.fetch||globalThis.fetch;
  const options=argumentsFor(argv);
  if(options.help){console.log('MRN ingestion: --year YYYY [--dry-run] [--source-root PATH] [--project-root PATH] [--state-root PATH] [--tesseract PATH]');return;}
  const year=options.year;
  const project=path.resolve(options.projectRoot||path.join(__dirname,'../../..'));
  const req=createRequire(path.join(project,'package.json'));
  // Existing Next.js environment loading order; process environment takes precedence.
  req('@next/env').loadEnvConfig(project,false,{info(){},error(){}});
  const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url===`https://${config.expectedSupabaseProject}.supabase.co`&&key,'Expected museum Supabase URL/service role key missing from project environment');
  const sharp=createRequire(path.join(project,'museum-newspaper-manager/package.json'))('sharp');
  const source=path.resolve(options.sourceRoot||process.env.MRN_SOURCE_ROOT||path.join(os.homedir(),'Desktop/MRN'));
  const stateRoot=path.resolve(options.stateRoot||process.env.MRN_STATE_ROOT||path.join(project,'newspaper_staging/mrn-ingestion'));
  assert(!stateRoot.startsWith(path.join(project,'public')+path.sep),'State must remain outside public files');
  assert(!stateRoot.startsWith(source+path.sep)&&stateRoot!==source,'State cannot be inside the source collection');
  const yearRoot=path.join(stateRoot,String(year));
  fs.mkdirSync(yearRoot,{recursive:true});
  const lock=path.join(yearRoot,'run.lock'); let lockFd;
  try { lockFd=fs.openSync(lock,'wx'); fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,host:os.hostname()})); }
  catch(e) { if(e.code!=='EEXIST')throw e; const previous=JSON.parse(fs.readFileSync(lock));assert(previous.host===os.hostname(),'Another host owns the year lock');let alive=true;try{process.kill(previous.pid,0);}catch(err){if(err.code==='ESRCH')alive=false;else throw err;}assert(!alive,`Year ${year} is already running (PID ${previous.pid})`);fs.unlinkSync(lock);lockFd=fs.openSync(lock,'wx');fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,host:os.hostname()})); }
  const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
  const runDir=path.join(yearRoot,'runs',runId);fs.mkdirSync(runDir,{recursive:true});
  const checkpointFile=path.join(yearRoot,'checkpoint.json');
  const checkpoint=fs.existsSync(checkpointFile)?JSON.parse(fs.readFileSync(checkpointFile)): {year,source,validatedPages:{},ocr:{}};
  assert(checkpoint.year===year&&checkpoint.source===source,'Checkpoint belongs to another source; use a separate state root');
  const writeCheckpoint=()=>{save(checkpointFile,checkpoint);save(path.join(runDir,'checkpoint.json'),checkpoint);};
  const log=(event,details={})=>{fs.appendFileSync(path.join(runDir,'events.jsonl'),JSON.stringify({time:new Date().toISOString(),event,...details})+'\n');};
  const progress=message=>{console.log(message);log('progress',{message});};
  const guarded=kind=>{assert(!options.dryRun,'Dry-run mutation blocked');assert(year>config.protectedThroughYear&&!checkpoint.verified,'Verified year is read-only');log('mutation',{kind});};
  const auth={apikey:key,Authorization:'Bearer '+key};
  async function fetchRetry(address,init={},timeout=120000) {
    let last;
    for(let attempt=0;attempt<3;attempt++) {try{const response=await fetch(address,{...init,signal:AbortSignal.timeout(timeout)});if(response.ok||response.status===404)return response;const code=response.status;await response.body?.cancel();if(code!==429&&code<500)throw Object.assign(Error(`Request failed (HTTP ${code})`),{permanent:true});last=Error(`Request failed (HTTP ${code})`);}catch(e){last=e;if(e.permanent)throw e;}if(attempt<2)await sleep(1500*(attempt+1));}throw last;
  }
  async function jsonGet(address,authenticated=false) {const r=await fetchRetry(address,{headers:authenticated?auth:{}});assert(r.ok,`Missing resource: ${new URL(address).pathname}`);return r.json();}
  const publicUrl=k=>url+'/storage/v1/object/public/media/'+k;
  async function list(folder,search) {let rows=[];for(let offset=0;;offset+=100){const r=await fetchRetry(url+'/storage/v1/object/list/'+config.bucket,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({prefix:folder,search,limit:100,offset,sortBy:{column:'name',order:'asc'}})});assert(r.ok,'Storage inventory failed');const batch=await r.json();assert(Array.isArray(batch),'Invalid storage inventory');rows.push(...batch);if(batch.length<100)return rows;}}
  const scope=k=>assert(k.startsWith(`${PREFIX}/${year}-`)&&/^newspapers\/midwest-racing-news\/\d{4}-\d{2}-\d{2}\/(?:\d+\.jpg|front-cover\.jpg|back-cover\.jpg|thumbnail\.jpg|newspaper\.json|ocr\.txt)$/.test(k),'Out-of-year storage write rejected');
  async function upload(k,bytes,type) {scope(k);guarded('storage_insert');const r=await fetchRetry(url+'/storage/v1/object/'+config.bucket+'/'+k,{method:'POST',headers:{...auth,'Content-Type':type,'x-upsert':'false'},body:bytes});assert(r.ok,`Storage insert failed: ${k}`);log('uploaded',{key:k,bytes:bytes.length});}
  async function readOcr() {let rows=[];for(let offset=0;;offset+=250){const q=new URLSearchParams({select:'id,publication_code,issue_date,page_label,storage_path,mime_type,status,ocr_engine,ocr_model,ocr_text,ocr_json,error_message,search_vector',publication_code:'eq.midwest-racing-news',and:`(issue_date.gte.${year}-01-01,issue_date.lt.${year+1}-01-01)`,order:'id.asc',limit:'250',offset:String(offset)});const batch=await jsonGet(url+'/rest/v1/newspaper_ocr_pages?'+q,true);rows.push(...batch);if(batch.length<250)return rows;}}
  async function upsertOcr(record) {scope(record.storage_path);assert(record.issue_date.startsWith(year+'-')&&record.publication_code==='midwest-racing-news','Out-of-year/publication OCR write rejected');guarded('existing_ocr_table_upsert');const payload=Object.fromEntries(['publication_code','issue_date','page_label','storage_path','mime_type','status','ocr_engine','ocr_model','ocr_text','ocr_json','error_message'].map(k=>[k,record[k]]));const r=await fetchRetry(url+'/rest/v1/newspaper_ocr_pages?on_conflict=storage_path',{method:'POST',headers:{...auth,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({...payload,updated_at:new Date().toISOString(),processed_at:new Date().toISOString()})});assert(r.ok,'OCR upsert failed');log('ocr_synchronized',{key:record.storage_path});}
  let report={year,dry_run:options.dryRun,run_id:runId,source,checkpoint:checkpointFile,completed:false};
  try {
    progress(`Discovering and validating MRN ${year} sources…`);
    const folder=path.join(source,String(year));assert(fs.existsSync(folder),`Source year not found: ${folder}`);
    const children=fs.readdirSync(folder,{withFileTypes:true});
    const issues=[];
    for(const child of children) {
      assert(child.isDirectory()&&!child.isSymbolicLink(),`Unexpected year-level item: ${child.name}; source must contain issue folders`);
      const parsed=parseIssue(child.name,year),issueFolder=path.join(folder,child.name);
      const allFiles=fs.readdirSync(issueFolder,{withFileTypes:true});
      const files=allFiles.filter(f=>{
        if(f.isFile()&&!f.isSymbolicLink()&&f.name.toLowerCase()==='thumbs.db'){log('ignored_windows_thumbnail_cache',{path:path.join(issueFolder,f.name)});return false;}
        return true;
      });
      assert(files.every(f=>f.isFile()&&!f.isSymbolicLink()&&/^\d+\.jpe?g$/i.test(f.name)),`Unexpected files in ${child.name}; numbered JPEG pages required, no source files are silently ignored`);
      const pages=files.map(f=>({number:Number(path.parse(f.name).name),source_filename:f.name,source_path:path.join(issueFolder,f.name),key:`${PREFIX}/${parsed.date}/${Number(path.parse(f.name).name)}.jpg`,issue_date:parsed.date})).sort((a,b)=>a.number-b.number);
      issues.push({...parsed,name:child.name,source_folder:issueFolder,pages});
    }
    issues.sort((a,b)=>a.date.localeCompare(b.date));issues.forEach((x,i)=>x.sequence=i+1);validateIssues(issues);
    const pages=issues.flatMap(x=>x.pages);let checked=0;
    await pool(pages,4,async page=>{
      const bytes=await fs.promises.readFile(page.source_path);page.bytes=bytes.length;page.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
      const cached=checkpoint.validatedPages[page.key];
      assert(!cached||cached.sha256===page.sha256,`Source changed since checkpoint: ${page.source_path}`);
      if(cached)Object.assign(page,{width:cached.width,height:cached.height,quality_warning:cached.quality_warning});
      else {const m=await sharp(bytes,{failOn:'error'}).metadata();assert(m.format==='jpeg'&&m.width&&m.height,'Invalid JPEG');const {data,info}=await sharp(bytes,{failOn:'error'}).resize(100,100,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});let gray=0;for(let i=0;i<data.length;i+=info.channels){const [r,g,b]=data.subarray(i,i+3);if(Math.max(r,g,b)-Math.min(r,g,b)<3&&r>110&&r<150)gray++;}page.width=m.width;page.height=m.height;page.quality_warning=gray/10000>0.15?'Large mid-gray area; possible incomplete source scan':'';checkpoint.validatedPages[page.key]={sha256:page.sha256,width:page.width,height:page.height,quality_warning:page.quality_warning};}
      log('source_page',{...page});if(++checked%50===0){writeCheckpoint();progress(`Source pages checked: ${checked}/${pages.length}`);}
    });
    writeCheckpoint();save(path.join(runDir,'source-audit.json'),{year,issues,pages,originals_unchanged:true});
    report.source_issue_count=issues.length;report.source_page_count=pages.length;report.uncertain_dates=[];report.source_quality_flagged_pages=pages.filter(p=>p.quality_warning).length;
    const remote=execFileSync('git',['config','--get','remote.origin.url'],{cwd:project,encoding:'utf8'}).trim();
    const github=remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);assert(github,'Existing origin must be a GitHub repository');const repository=github[1]+'/'+github[2];
    const githubHeaders={};if(process.env.GH_TOKEN||process.env.GITHUB_TOKEN)githubHeaders.Authorization='Bearer '+(process.env.GH_TOKEN||process.env.GITHUB_TOKEN);
    async function gitHubJson(suffix){const r=await fetchRetry('https://api.github.com/repos/'+repository+suffix,{headers:githubHeaders});assert(r.ok,'GitHub inspection failed');return r.json();}
    async function checkedInManifest(){const commit=await gitHubJson('/commits/'+config.productionBranch);const r=await fetchRetry('https://raw.githubusercontent.com/'+repository+'/'+commit.sha+'/'+config.manifestPath,{headers:githubHeaders});assert(r.ok,'Checked-in manifest unavailable');return {commit:commit.sha,raw:await r.text()};}
    const baseline=await checkedInManifest(),manifest=JSON.parse(baseline.raw);
    assert(Array.isArray(manifest),'Existing manifest must remain an array');
    const prior=manifest.filter(x=>!isTarget(x,year));save(path.join(runDir,'prior-manifest.json'),prior);
    const liveManifest=await jsonGet(config.productionUrl+'/data/newspapers-manifest.json');
    const yearEntries=manifest.filter(x=>isTarget(x,year));assert(new Set(yearEntries.map(x=>x.issueDate)).size===yearEntries.length,'Duplicate manifest dates');
    const rootObjects=await list(PREFIX,year+'-');
    const storageDates=rootObjects.filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.name)&&x.id===null).map(x=>x.name);
    const sourceDates=new Set(issues.map(x=>x.date));
    const extraIssues=storageDates.filter(d=>!sourceDates.has(d));assert(!extraIssues.length,`Extra live issues absent from source: ${extraIssues.join(', ')}`);
    const objects=new Map();await pool(issues,2,async issue=>{for(const object of await list(`${PREFIX}/${issue.date}`))objects.set(`${PREFIX}/${issue.date}/${object.name}`,object);});
    let ocr=await readOcr();assert(new Set(ocr.map(x=>x.storage_path)).size===ocr.length,'Duplicate OCR storage paths');
    const expectedKeys=new Set(pages.map(p=>p.key));
    assert(ocr.every(x=>expectedKeys.has(x.storage_path)),'Extra OCR pages absent from local source');
    const extraPages=[...objects.keys()].filter(k=>/\/\d+\.jpg$/.test(k)&&!expectedKeys.has(k));assert(!extraPages.length,`Extra stored pages: ${extraPages.join(', ')}`);
    const rows=new Map(ocr.map(x=>[x.storage_path,x]));
    const missingPages=pages.filter(p=>!objects.has(p.key));
    for(const p of pages){const object=objects.get(p.key);if(object)assert(Number(object.metadata?.size)===p.bytes,`Existing page size conflict: ${p.key}`);const hash=rows.get(p.key)?.ocr_json?.source_sha256;if(hash)assert(hash===p.sha256,`Existing source hash conflict: ${p.key}`);else if(object){const r=await fetchRetry(publicUrl(p.key));assert(r.ok,'Existing page unavailable for hash comparison');assert(crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')===p.sha256,`Existing page content conflict: ${p.key}`);log('existing_page_hash_verified',{key:p.key});}}
    const needsOcr=pages.filter(p=>!complete(rows.get(p.key)));
    const template=await jsonGet(publicUrl(`${PREFIX}/${config.templateIssue}/newspaper.json`));assert(template.publicationSlug==='midwest-racing-news'&&template.year===1981,'1981 template validation failed');
    const entries=[],metadataEntries=[],missingAssets=[];
    for(const issue of issues){const f=`${PREFIX}/${issue.date}`;const existing=objects.has(f+'/newspaper.json')?await jsonGet(publicUrl(f+'/newspaper.json')):null;
      const entry=metadata(template,issue,year,publicUrl,existing?.generatedAt||checkpoint.generatedAt||(checkpoint.generatedAt=new Date().toISOString()));
      if(existing)assert(same(existing,entry),`Existing metadata conflict: ${issue.date}`);
      metadataEntries.push(entry);
      entries.push(preservedManifestEntry(yearEntries.find(e=>e.issueDate===issue.date),entry,year<=config.protectedThroughYear||checkpoint.verified));
      for(const name of ['front-cover.jpg','back-cover.jpg','thumbnail.jpg','newspaper.json','ocr.txt']){const object=objects.get(f+'/'+name);if(object)assert(Number(object.metadata?.size)>0,`Empty existing asset: ${f}/${name}`);else missingAssets.push({issue,name,key:f+'/'+name});}
    }
    const merged=mergeManifest(baseline.raw,entries,year);
    const deployed=liveManifest.filter(x=>isTarget(x,year));
    const deploymentNeeded=!same(deployed,entries);
    report.proposed_changes={page_uploads:missingPages.length,ocr_pages:needsOcr.length,asset_uploads:missingAssets.length,manifest_issues_added:merged.added,deployment:deploymentNeeded||merged.added>0};
    report.supabase_issue_count=storageDates.length;report.supabase_page_count=pages.length-missingPages.length;
    report.missing_issues=issues.filter(x=>!storageDates.includes(x.date)).map(x=>x.date);report.missing_pages=missingPages.map(x=>x.key);report.duplicate_dates=[];
    save(path.join(runDir,'plan.json'),report);writeCheckpoint();progress(`Source ${issues.length} issues / ${pages.length} pages; missing pages ${missingPages.length}, unfinished OCR ${needsOcr.length}, missing assets ${missingAssets.length}, manifest additions ${merged.added}.`);
    const changes=missingPages.length+needsOcr.length+missingAssets.length+merged.added+(deploymentNeeded?1:0);
    if(year<=config.protectedThroughYear||checkpoint.verified)assert(changes===0,`Verified year ${year} has differences; this tool will not modify it. See plan.json.`);
    if(!options.dryRun&&changes){
      await pool(missingPages,4,async p=>{const bytes=await fs.promises.readFile(p.source_path);assert(crypto.createHash('sha256').update(bytes).digest('hex')===p.sha256,'Source changed during run');await upload(p.key,bytes,'image/jpeg');});
      const tesseract=options.tesseract||process.env.MRN_TESSERACT|| (process.platform==='win32'?path.join(process.env.ProgramFiles||'C:/Program Files','Tesseract-OCR/tesseract.exe'):'tesseract');
      if(needsOcr.length)execFileSync(tesseract,['--version'],{stdio:'ignore'});
      const ocrDir=path.join(yearRoot,'page-ocr');fs.mkdirSync(ocrDir,{recursive:true});let processed=0;
      await pool(needsOcr,config.ocrWorkers,async p=>{const file=path.join(ocrDir,`${p.issue_date}_${p.number}.json`);let record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
        if(!record?.ocr_text?.trim()||record.status!=='complete'||record.ocr_json?.source_sha256!==p.sha256||record.storage_path!==p.key||record.issue_date!==p.issue_date||record.publication_code!=='midwest-racing-news'||record.page_label!==p.number+'.jpg'){const target=file.slice(0,-5);let stderr='';const code=await new Promise((resolve,reject)=>{const child=spawn(tesseract,[p.source_path,target,'-l','eng','--psm','11'],{env:{...process.env,OMP_THREAD_LIMIT:'1'},windowsHide:true,stdio:['ignore','ignore','pipe']});const timer=setTimeout(()=>child.kill(),config.ocrTimeoutMs);child.stderr.on('data',x=>stderr=(stderr+x).slice(-1000));child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',c=>{clearTimeout(timer);resolve(c);});});const text=fs.existsSync(target+'.txt')?fs.readFileSync(target+'.txt','utf8').trim():'';
          record={publication_code:'midwest-racing-news',issue_date:p.issue_date,page_label:p.number+'.jpg',storage_path:p.key,mime_type:'image/jpeg',status:code===0&&text?'complete':'failed',ocr_engine:'Tesseract',ocr_model:'eng --psm 11',ocr_text:text,ocr_json:{source_sha256:p.sha256,source_quality_warning:p.quality_warning},error_message:code===0&&text?null:stderr||'OCR failed or blank'};save(file,record);}
        await upsertOcr(record);checkpoint.ocr[p.key]={status:record.status,sha256:p.sha256};writeCheckpoint();if(++processed%10===0)progress(`OCR synchronized: ${processed}/${needsOcr.length}`);
      });
      ocr=await readOcr();rows.clear();ocr.forEach(r=>rows.set(r.storage_path,r));assert(pages.every(p=>complete(rows.get(p.key))),'OCR failures remain; rerun to resume. No manifest will be published.');
      for(const asset of missingAssets){const {issue,name,key:k}=asset;let bytes,type;
        if(name==='newspaper.json'){bytes=Buffer.from(JSON.stringify(metadataEntries.find(e=>e.issueDate===issue.date),null,2));type='application/json';}
        else if(name==='ocr.txt'){bytes=Buffer.from(issue.pages.map(p=>'--- '+p.number+'.jpg ---\n'+rows.get(p.key).ocr_text).join('\n\n'));type='text/plain; charset=utf-8';}
        else {const p=name==='back-cover.jpg'?issue.pages.at(-1):issue.pages[0];let image=sharp(p.source_path);if(name==='thumbnail.jpg')image=image.resize({width:520,withoutEnlargement:true});bytes=await image.jpeg({quality:name==='thumbnail.jpg'?82:88}).toBuffer();type='image/jpeg';}
        await upload(k,bytes,type);
      }
    }
    const accessibility={checked:0,verified:0,errors:[]};
    const publicPages=options.dryRun?pages.filter(p=>objects.has(p.key)):pages;
    await pool(publicPages,config.imageWorkers,async p=>{try{await sleep(config.imageDelayMs);const r=await fetchRetry(publicUrl(p.key),{method:'HEAD'});assert(r.status===200&&r.headers.get('content-type')?.includes('image/jpeg'),'Image unavailable or incorrect content type');assert(Number(r.headers.get('content-length'))===p.bytes,'Public image size differs');accessibility.verified++;log('public_image_verified',{key:p.key});}catch(e){accessibility.errors.push({key:p.key,error:e.message});}if(++accessibility.checked%50===0)progress(`Public pages verified: ${accessibility.verified}/${publicPages.length}`);});
    save(path.join(runDir,'public-page-verification.json'),accessibility);assert(!accessibility.errors.length,'Public image checks failed; no manifest will be published');
    let manifestCommit=baseline.commit;
    if(!options.dryRun&&merged.added){guarded('git_manifest_commit_and_push');const repo=path.join(runDir,'deployment-checkout');
      execFileSync('git',['clone','--filter=blob:none','--no-checkout',remote,repo],{stdio:'inherit',windowsHide:true});
      execFileSync('git',['sparse-checkout','set','public/data'],{cwd:repo,stdio:'inherit',windowsHide:true});execFileSync('git',['checkout',config.productionBranch],{cwd:repo,stdio:'inherit',windowsHide:true});
      const file=path.join(repo,config.manifestPath),currentRaw=fs.readFileSync(file,'utf8'),current=JSON.parse(currentRaw);
      for(const entry of prior)assert(current.some(e=>same(e,entry)),'Prior manifest changed concurrently; stopping before push');
      const update=mergeManifest(currentRaw,entries,year);if(update.added){fs.writeFileSync(file,update.raw);execFileSync('git',['add','--',config.manifestPath],{cwd:repo,stdio:'inherit'});execFileSync('git',['commit','-m',`Add verified ${year} Midwest Racing News archive issues`],{cwd:repo,stdio:'inherit'});execFileSync('git',['push','origin',config.productionBranch],{cwd:repo,stdio:'inherit',windowsHide:true});}
      manifestCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();checkpoint.manifestCommit=manifestCommit;writeCheckpoint();
    }
    if(!options.dryRun&&changes){progress('Waiting for the existing GitHub/Vercel production deployment…');const deadline=Date.now()+config.deploymentTimeoutMs;let ready=false;
      while(Date.now()<deadline){const status=await gitHubJson('/commits/'+manifestCommit+'/status');const production=status.statuses.find(x=>x.context===config.deploymentContext);assert(!['failure','error'].includes(production?.state),'Existing Vercel production deployment failed');if(production?.state==='success'){const live=await jsonGet(config.productionUrl+'/data/newspapers-manifest.json');if(same(live.filter(e=>isTarget(e,year)),entries)){ready=true;break;}}await sleep(30000);}
      assert(ready,'Production deployment not verified before timeout; rerun to continue verification');
    }
    const finalManifest=await jsonGet(config.productionUrl+'/data/newspapers-manifest.json'),finalTarget=finalManifest.filter(x=>isTarget(x,year));
    if(!changes||!options.dryRun){assert(same(finalTarget,entries),'Production manifest does not match source/metadata');for(const e of prior)assert(finalManifest.some(x=>same(e,x)),'Prior manifest entry changed');}
    const finalOcr=await readOcr();const good=finalOcr.filter(complete);report.ocr_complete_page_count=good.length;report.missing_ocr_pages=pages.filter(p=>!finalOcr.some(r=>r.storage_path===p.key)).map(p=>p.key);report.blank_ocr_pages=finalOcr.filter(r=>!r.ocr_text?.trim()).map(r=>r.storage_path);report.failed_ocr_pages=finalOcr.filter(r=>r.status!=='complete').map(r=>r.storage_path);report.missing_search_vectors=finalOcr.filter(r=>!r.search_vector).map(r=>r.storage_path);
    report.public_page_urls_verified=accessibility.verified;report.public_image_errors=accessibility.errors;report.production_manifest_commit=manifestCommit;report.prior_manifest_entries_preserved=prior.length;
    report.live_archive_issue_count=finalTarget.length;report.live_archive_page_count=finalTarget.reduce((n,e)=>n+e.pages.length,0);
    if(!changes||!options.dryRun){assert(good.length===pages.length&&new Set(finalOcr.map(r=>r.storage_path)).size===pages.length,'OCR/search completeness differs from source');
      const finalStorageDates=(await list(PREFIX,year+'-')).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.name)&&x.id===null).map(x=>x.name).sort();assert(same(finalStorageDates,issues.map(x=>x.date)),'Final storage issue dates differ from source');
      let storedPageCount=0;for(const issue of issues){const folder=`${PREFIX}/${issue.date}`,stored=await list(folder),numeric=stored.filter(x=>/^\d+\.jpg$/.test(x.name));assert(same(numeric.map(x=>x.name).sort(),issue.pages.map(p=>p.number+'.jpg').sort()),'Final storage page numbers differ from source');storedPageCount+=numeric.length;for(const name of ['front-cover.jpg','back-cover.jpg','thumbnail.jpg','newspaper.json','ocr.txt'])assert(stored.some(x=>x.name===name&&Number(x.metadata?.size)>0),'Missing or empty issue asset');assert(same(await jsonGet(publicUrl(folder+'/newspaper.json')),metadataEntries.find(x=>x.issueDate===issue.date)),'Final metadata differs');}
      report.supabase_issue_count=finalStorageDates.length;report.supabase_page_count=storedPageCount;
      const finalCheckedIn=await checkedInManifest();assert(same(finalManifest,JSON.parse(finalCheckedIn.raw)),'Production manifest differs from checked-in production branch');manifestCommit=finalCheckedIn.commit;report.production_manifest_commit=manifestCommit;report.production_manifest_matches_checked_in=true;
      const archive=await fetchRetry(config.productionUrl+`/media/newspapers/midwest-racing-news/year/${year}`);assert(archive.status===200,'Public year archive unavailable');const html=await archive.text();for(const issue of issues)assert(html.includes('/midwest-racing-news/'+issue.date),'Public archive is missing an issue');
      const q=new URLSearchParams({q:'Raceway Park',source:'midwest-racing-news',year:String(year),pageSize:'25'});const search=await jsonGet(config.productionUrl+'/api/newspaper-search?'+q);assert(search.total>0&&search.results.every(r=>r.publicationYear===year&&r.sourceKey==='midwest-racing-news'),'Public year-filtered search verification failed');
      const filters=new URLSearchParams({select:'id',publication_code:'eq.midwest-racing-news',and:`(issue_date.gte.${year}-01-01,issue_date.lt.${year+1}-01-01)`,status:'eq.complete',search_vector:'wfts(simple).Raceway Park'});const r=await fetchRetry(url+'/rest/v1/newspaper_ocr_pages?'+filters,{method:'HEAD',headers:{...auth,Prefer:'count=exact'}});assert(r.ok,'Search index count query failed');const total=Number(r.headers.get('content-range')?.split('/')[1]);assert(total===search.total,'Public search count differs from existing index');
      report.raceway_park_search_matches=search.total;report.raceway_park_literal_phrase_matches=good.filter(r=>/raceway park/i.test(r.ocr_text)).length;save(path.join(runDir,'public-search-verification.json'),search);
      const status=await gitHubJson('/commits/'+manifestCommit+'/status');report.production_deployment=status.statuses.find(s=>s.context===config.deploymentContext)?.state;assert(report.production_deployment==='success','Checked-in manifest deployment is not successful');
      report.completed=true;report.missing_issues=[];report.missing_pages=[];
      if(!options.dryRun){checkpoint.verified=true;checkpoint.verifiedAt=new Date().toISOString();writeCheckpoint();}
    }
    report.no_changes_proposed=changes===0;report.finished_at=new Date().toISOString();save(path.join(runDir,'verification-report.json'),report);save(path.join(yearRoot,'latest-report.json'),report);progress(`Report: ${path.join(runDir,'verification-report.json')}`);
    if(options.dryRun)progress(changes===0?'DRY RUN: already complete; no changes proposed.':'DRY RUN: unfinished work listed in plan.json; no production changes made.');else progress('Year fully verified. No other year was processed.');
    return report;
  } catch(e) {
    report.error=e.message;report.finished_at=new Date().toISOString();
    if(report.source_page_count){try{const records=await readOcr();report.ocr_complete_page_count=records.filter(complete).length;report.blank_ocr_pages=records.filter(r=>!r.ocr_text?.trim()).map(r=>r.storage_path);report.failed_ocr_pages=records.filter(r=>r.status!=='complete').map(r=>r.storage_path);report.missing_search_vectors=records.filter(r=>!r.search_vector).map(r=>r.storage_path);}catch{report.ocr_verification_unavailable=true;}}
    const imageFile=path.join(runDir,'public-page-verification.json');if(fs.existsSync(imageFile)){const images=JSON.parse(fs.readFileSync(imageFile));report.public_image_errors=images.errors;report.public_page_urls_verified=images.verified;}
    save(path.join(runDir,'verification-report.json'),report);save(path.join(yearRoot,'latest-report.json'),report);log('failed',{error:e.message});throw e;
  }
  finally {fs.closeSync(lockFd);fs.unlinkSync(lock);}
}
module.exports={main,argumentsFor};
if(require.main===module)main().catch(e=>{console.error('MRN ingestion stopped: '+e.message);process.exitCode=1;});
