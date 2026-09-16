'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {EventEmitter}=require('node:events'),{createRequire}=require('node:module');
const {main}=require('./ingest.cjs'),config=require('./config.json');

test('interrupted ingestion resumes without duplicate objects/rows/entries; verified dry-run never writes',async()=>{
  const project=process.env.MRN_TEST_PROJECT||path.resolve(__dirname,'../../..');
  const sharp=createRequire(path.join(project,'museum-newspaper-manager/package.json'))('sharp');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mrn-ingestion-test-'));
  const source=path.join(root,'source'),state=path.join(root,'state'),folder=path.join(source,'1984/4-5-84-1');fs.mkdirSync(folder,{recursive:true});
  const storage=new Map(),ocr=new Map(),writes=[],gitWrites=[];let stopSecondPage=true,failSecondOcr=true,currentCommit='baseline';
  let manifest=[{publicationSlug:'midwest-racing-news',year:1980,issueDate:'1980-04-03',pages:['prior-preserved']}];const originalPrior=JSON.stringify(manifest[0]);let clone;
  const template={slug:'1981-04-02',title:'April 2, 1981',publication:'Midwest Racing News',publicationSlug:'midwest-racing-news',year:1981,issueDate:'1981-04-02',description:null,summary:'old',highlights:[],rawOcrHighlights:[],topics:['Newspaper Coverage'],ocrConfidence:null,ocrSourceCount:16,ocrTextPath:'old',coverImage:'old',backCoverImage:'old',thumbnail:'old',pages:[],generatedBy:'old',generatedAt:'old',originalFolderName:'old',normalizedFolder:'old',number:'1',volume:'XXIII'};
  const oldDelay=config.imageDelayMs;config.imageDelayMs=0;
  const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
  const fakeFetch=async(address,init={})=>{
    const u=new URL(address),method=init.method||'GET';
    if(u.hostname==='api.github.com'){
      if(u.pathname.endsWith('/status'))return json({statuses:[{context:config.deploymentContext,state:'success'}]});
      if(u.pathname.endsWith('/commits/main'))return json({sha:currentCommit});
      throw Error('Unexpected mocked GitHub request');
    }
    if(u.hostname==='raw.githubusercontent.com')return new Response(JSON.stringify(manifest));
    if(u.origin===config.productionUrl){
      if(u.pathname==='/data/newspapers-manifest.json')return json(manifest);
      if(u.pathname.startsWith('/media/newspapers/'))return new Response('/midwest-racing-news/1984-04-05');
      if(u.pathname==='/api/newspaper-search')return json({total:2,results:[{publicationYear:1984,sourceKey:'midwest-racing-news'}]});
      throw Error('Unexpected mocked public request');
    }
    assert.equal(u.hostname,config.expectedSupabaseProject+'.supabase.co','No unmocked network may escape');
    if(u.pathname.startsWith('/storage/v1/object/list/')){
      const {prefix,search,offset,limit}=JSON.parse(init.body);let rows=[];
      if(prefix==='newspapers/midwest-racing-news'){const dates=new Set([...storage.keys()].map(k=>k.split('/')[2]));rows=[...dates].filter(d=>!search||d.includes(search)).map(name=>({name,id:null}));}
      else rows=[...storage.entries()].filter(([k])=>k.startsWith(prefix+'/')).map(([k,b])=>({name:k.slice(prefix.length+1),id:k,metadata:{size:b.length}}));
      return json(rows.sort((a,b)=>a.name.localeCompare(b.name)).slice(offset,offset+limit));
    }
    if(u.pathname.startsWith('/storage/v1/object/public/media/')){
      const k=u.pathname.split('/public/media/')[1];if(k==='newspapers/midwest-racing-news/1981-04-02/newspaper.json')return json(template);
      const bytes=storage.get(k);if(!bytes)return new Response(null,{status:404});
      return new Response(method==='HEAD'?null:bytes,{headers:{'Content-Type':k.endsWith('.jpg')?'image/jpeg':'application/json','Content-Length':String(bytes.length)}});
    }
    if(u.pathname.startsWith('/storage/v1/object/media/')){
      const k=u.pathname.split('/object/media/')[1];assert(k.startsWith('newspapers/midwest-racing-news/1984-'),'Prior storage write attempted');assert.equal(init.headers['x-upsert'],'false');
      if(stopSecondPage&&k.endsWith('/2.jpg'))return json({error:'simulated interruption'},400);
      assert(!storage.has(k),'Duplicate storage insert attempted');storage.set(k,Buffer.from(init.body));writes.push(k);return json({});
    }
    if(u.pathname==='/rest/v1/newspaper_ocr_pages'){
      if(method==='POST'){const row=JSON.parse(init.body);assert(row.issue_date.startsWith('1984-'));assert.equal(u.searchParams.get('on_conflict'),'storage_path');ocr.set(row.storage_path,{...row,id:ocr.get(row.storage_path)?.id||ocr.size+1,search_vector:'raceway park'});writes.push('ocr:'+row.storage_path);return new Response(null,{status:201});}
      if(method==='HEAD')return new Response(null,{headers:{'Content-Range':'*/2'}});
      return json([...ocr.values()].slice(Number(u.searchParams.get('offset')),Number(u.searchParams.get('offset'))+250));
    }
    throw Error('Unexpected mocked storage/database request');
  };
  const childProcess={
    execFileSync(command,args,options={}){
      if(command!=='git'){assert.deepEqual(args,['--version']);return Buffer.from('');}
      if(args[0]==='config')return 'https://github.com/bobschafer10/racing-museum.git\n';
      if(args[0]==='clone'){clone=args.at(-1);fs.mkdirSync(path.join(clone,'public/data'),{recursive:true});fs.writeFileSync(path.join(clone,config.manifestPath),JSON.stringify(manifest));return;}
      if(['sparse-checkout','checkout','add'].includes(args[0])){if(args[0]==='add')assert.deepEqual(args,['add','--',config.manifestPath]);return;}
      if(args[0]==='commit'){currentCommit='fixture-commit';gitWrites.push('commit');return;}
      if(args[0]==='push'){manifest=JSON.parse(fs.readFileSync(path.join(options.cwd,config.manifestPath)));gitWrites.push('push');return;}
      if(args[0]==='rev-parse')return currentCommit+'\n';
      throw Error('Unexpected mocked Git command');
    },
    spawn(command,args,options){assert.deepEqual(args.slice(2),['-l','eng','--psm','11']);assert.equal(options.env.OMP_THREAD_LIMIT,'1');assert.equal(options.windowsHide,true);const child=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};setImmediate(()=>{fs.writeFileSync(args[1]+'.txt',failSecondOcr&&args[0].endsWith('2.jpg')?' ':'Raceway Park fixture OCR text');child.emit('close',0);});return child;}
  };
  const argv=['--year','1984','--project-root',project,'--source-root',source,'--state-root',state];
  try{
    for(const number of [1,2])await sharp({create:{width:40,height:40,channels:3,background:number===1?'white':'black'}}).jpeg().toFile(path.join(folder,number+'.jpg'));
    await assert.rejects(()=>main(argv,{fetch:fakeFetch,childProcess}),/HTTP 400/);assert(storage.has('newspapers/midwest-racing-news/1984-04-05/1.jpg'));assert.equal(ocr.size,0);assert.equal(gitWrites.length,0);
    stopSecondPage=false;await assert.rejects(()=>main(argv,{fetch:fakeFetch,childProcess}),/OCR failures remain/);assert.equal(storage.size,2);assert.equal(ocr.size,2);assert.equal(gitWrites.length,0);const failed=JSON.parse(fs.readFileSync(path.join(state,'1984/latest-report.json')));assert.equal(failed.failed_ocr_pages.length,1);assert.equal(failed.blank_ocr_pages.length,1);
    failSecondOcr=false;const resumed=await main(argv,{fetch:fakeFetch,childProcess});assert(resumed.completed);assert.equal(resumed.proposed_changes.page_uploads,0);assert.equal(resumed.proposed_changes.ocr_pages,1);assert.equal(resumed.ocr_complete_page_count,2);assert.equal(ocr.size,2);assert.equal(storage.size,7);assert.equal(manifest.length,2);assert.equal(JSON.stringify(manifest[0]),originalPrior);assert.deepEqual(gitWrites,['commit','push']);assert.equal(writes.filter(k=>k==='ocr:newspapers/midwest-racing-news/1984-04-05/1.jpg').length,1);
    const before=writes.length,beforeGit=gitWrites.length;
    const repeated=await main(argv.concat('--dry-run'),{fetch:fakeFetch,childProcess});assert(repeated.completed&&repeated.no_changes_proposed);assert.deepEqual(repeated.proposed_changes,{page_uploads:0,ocr_pages:0,asset_uploads:0,manifest_issues_added:0,deployment:false});assert.equal(writes.length,before);assert.equal(gitWrites.length,beforeGit);assert.equal(ocr.size,2);assert.equal(manifest.length,2);
    const realRepeat=await main(argv,{fetch:fakeFetch,childProcess});assert(realRepeat.completed&&realRepeat.no_changes_proposed);assert.equal(writes.length,before);assert.equal(gitWrites.length,beforeGit);
    assert(fs.existsSync(path.join(state,'1984/checkpoint.json')));const runs=fs.readdirSync(path.join(state,'1984/runs'));assert.equal(runs.length,5);for(const r of runs){assert(fs.existsSync(path.join(state,'1984/runs',r,'verification-report.json')));assert(fs.existsSync(path.join(state,'1984/runs',r,'events.jsonl')));}
    const jpg=fs.readFileSync(path.join(folder,'1.jpg'));const audit=JSON.parse(fs.readFileSync(path.join(state,'1984/runs',runs.at(-1),'source-audit.json')));assert.equal(audit.pages[0].sha256,crypto.createHash('sha256').update(jpg).digest('hex'));
  }finally{config.imageDelayMs=oldDelay;assert(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'mrn-ingestion-test-'));fs.rmSync(root,{recursive:true,force:true});}
});
