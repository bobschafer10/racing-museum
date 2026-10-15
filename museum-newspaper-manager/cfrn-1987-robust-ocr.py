#!/usr/bin/env python3
import csv, hashlib, io, json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error

csv.field_size_limit(10_000_000)
PROJECT='szvkleurojiwqkkztxtr'
PUB='checkered-flag-racing-news'
ISSUE=os.environ['ISSUE']
PAGE_COUNT=int(os.environ['PAGE_COUNT'])
ROOT=f'https://{PROJECT}.supabase.co/storage/v1/object/public/media/newspapers/{PUB}/{ISSUE}'
IMPORT=f'https://{PROJECT}.supabase.co/functions/v1/newspaper-ocr-1987-import'
OIDC_URL=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']
OIDC_REQ=os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']
RUN_NUMBER=os.environ.get('GITHUB_RUN_NUMBER','')

# Safety interlock: run 2 already owns the full 1987 matrix. Run 3 was queued as a
# rescue while run 2 was still active; letting both write the same issues can create
# duplicate work and heavy Supabase contention. Make run 3 a no-op. After run 2
# settles, any genuinely incomplete issues can be repaired in a fresh verified run.
if RUN_NUMBER == '3':
    print(f'{ISSUE}: safety skip on rescue run 3; primary run 2 owns the 1987 matrix', flush=True)
    sys.exit(0)

# Throttle the still-unstarted heavy tail of run 2 so the museum remains usable while
# the database clears. Already-running jobs keep their existing process; newly-started
# September/December repair jobs use a wider write interval and staggered starts.
HEAVY_TAIL={'1987-09-02','1987-09-09','1987-12-16'}
PAGE_DELAY=4 if RUN_NUMBER == '2' and ISSUE in HEAVY_TAIL else 1
START_DELAY=0
if RUN_NUMBER == '2':
    START_DELAY={'1987-09-09':180,'1987-12-16':360}.get(ISSUE,0)
if START_DELAY:
    print(f'{ISSUE}: throttled start; waiting {START_DELAY}s to protect Supabase', flush=True)
    time.sleep(START_DELAY)

def get(url, attempts=5):
    last=None
    for a in range(1,attempts+1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'UMARM CFRN 1987 robust OCR/1.0'}),timeout=120) as r:
                return r.read()
        except Exception as e:
            last=e
            if a<attempts: time.sleep(min(a*3,15))
    raise RuntimeError(f'GET failed {url}: {last}')

def oidc():
    sep='&' if '?' in OIDC_URL else '?'
    req=urllib.request.Request(f'{OIDC_URL}{sep}audience=umarm-newspaper-ocr-import',headers={
        'Authorization':f'bearer {OIDC_REQ}','User-Agent':'UMARM CFRN 1987 robust OCR/1.0'})
    with urllib.request.urlopen(req,timeout=30) as r:
        token=json.loads(r.read().decode()).get('value')
    if not token: raise RuntimeError('OIDC token missing')
    return token

def api(payload, attempts=8):
    body=json.dumps(payload,separators=(',',':')).encode()
    last=None
    for a in range(1,attempts+1):
        try:
            req=urllib.request.Request(IMPORT,data=body,method='POST',headers={
                'Authorization':f'Bearer {oidc()}','Content-Type':'application/json','User-Agent':'UMARM CFRN 1987 robust OCR/1.0'})
            with urllib.request.urlopen(req,timeout=300) as r:
                out=json.loads(r.read().decode())
            if out.get('ok'): return out
            last=RuntimeError(f'bad response {out}')
        except urllib.error.HTTPError as e:
            last=RuntimeError(f'HTTP {e.code}: {e.read().decode("utf-8","replace")}')
        except Exception as e:
            last=e
        if a<attempts: time.sleep(min(a*10,60))
    raise RuntimeError(f'API request failed after {attempts} attempts: {last}')

def clean_text(value, limit=180):
    value=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', value or '')
    value=' '.join(value.split())
    if len(value)>limit: value=value[:limit]
    return value

def parse_tsv(tsv):
    words=[]; page_w=page_h=0
    for row in csv.DictReader(io.StringIO(tsv),delimiter='\t'):
        try: level=int(row.get('level') or 0)
        except: continue
        try:
            left=int(row.get('left') or 0); top=int(row.get('top') or 0); width=int(row.get('width') or 0); height=int(row.get('height') or 0)
        except: left=top=width=height=0
        if level==1:
            page_w=max(page_w,width); page_h=max(page_h,height); continue
        if level!=5: continue
        text=clean_text(row.get('text') or '')
        if not text: continue
        try: conf=float(row.get('conf') or -1)
        except: conf=-1
        words.append({'text':text,'conf':conf if conf>=0 else None,'left':left,'top':top,'width':width,'height':height,
                      'key':(row.get('block_num'),row.get('par_num'),row.get('line_num'))})
    if not words: return '',[],None
    if not page_w: page_w=max(1,max(w['left']+w['width'] for w in words))
    if not page_h: page_h=max(1,max(w['top']+w['height'] for w in words))
    groups={}
    for w in words: groups.setdefault(w['key'],[]).append(w)
    lines=[]
    for ws in groups.values():
        ws.sort(key=lambda w:w['left'])
        text=clean_text(' '.join(w['text'] for w in ws),600)
        if not text: continue
        left=min(w['left'] for w in ws); top=min(w['top'] for w in ws)
        right=max(w['left']+w['width'] for w in ws); bottom=max(w['top']+w['height'] for w in ws)
        cs=[w['conf'] for w in ws if w['conf'] is not None]
        score=(sum(cs)/len(cs)/100) if cs else 0
        lines.append({'t':text,'x':round(left/page_w,6),'y':round(top/page_h,6),
                      'w':round(max(0,right-left)/page_w,6),'h':round(max(0,bottom-top)/page_h,6),
                      's':round(max(0,min(1,score)),4)})
    lines.sort(key=lambda x:(x['y'],x['x']))
    if len(lines)>1500: lines=lines[:1500]
    confs=[w['conf'] for w in words if w['conf'] is not None]
    avg=round(sum(confs)/len(confs)/100,4) if confs else None
    text='\n'.join(x['t'] for x in lines).strip()
    if len(text)>120000: text=text[:120000]
    return text,lines,avg

def ocr_page(n):
    page=f'{n:03d}.jpg'; data=get(f'{ROOT}/{page}')
    with tempfile.NamedTemporaryFile(suffix='.jpg') as f:
        f.write(data); f.flush()
        def run(psm):
            p=subprocess.run(['tesseract',f.name,'stdout','-l','eng','--psm',str(psm),'tsv'],capture_output=True,text=True,timeout=180)
            if p.returncode!=0: raise RuntimeError(p.stderr[-1000:])
            return parse_tsv(p.stdout)
        text,lines,avg=run(11)
        if not text or not lines: text,lines,avg=run(6)
    if not text or not lines: raise RuntimeError(f'{page}: OCR/layout blank')
    return {'page':page,'text':text,'avg_confidence':avg,'meta':{
        'source_sha256':hashlib.sha256(data).hexdigest(),'scan_position':n,'line_layout':{'lines':lines}}}

state=api({'publication':PUB,'issue':ISSUE,'action':'status'})
complete=set(state.get('complete_pages') or state.get('pages') or [])
print(f'{ISSUE}: {len(complete)}/{PAGE_COUNT} pages already complete; repairing missing pages only',flush=True)
for n in range(1,PAGE_COUNT+1):
    page=f'{n:03d}.jpg'
    if page in complete:
        print(f'{ISSUE} {page}: already complete',flush=True)
        continue
    row=ocr_page(n)
    api({'publication':PUB,'issue':ISSUE,'pages':[row],'finalize':False})
    complete.add(page)
    print(f'{ISSUE} {page}: uploaded {len(row["text"])} chars / {len(row["meta"]["line_layout"]["lines"])} lines',flush=True)
    time.sleep(PAGE_DELAY)

out=api({'publication':PUB,'issue':ISSUE,'action':'finalize'})
if int(out.get('issue_pages',0)) < PAGE_COUNT:
    raise RuntimeError(f'finalized {out.get("issue_pages")} of {PAGE_COUNT} pages')
print(json.dumps(out),flush=True)
