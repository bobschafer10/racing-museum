#!/usr/bin/env python3
import base64, csv, gzip, hashlib, io, json, os, re, subprocess, tempfile, time, urllib.request, urllib.error

csv.field_size_limit(10_000_000)
PROJECT='szvkleurojiwqkkztxtr'
PUB='checkered-flag-racing-news'
ISSUE=os.environ['ISSUE']
PAGE_COUNT=int(os.environ['PAGE_COUNT'])
ROOT=f'https://{PROJECT}.supabase.co/storage/v1/object/public/media/newspapers/{PUB}/{ISSUE}'
IMPORT=f'https://{PROJECT}.supabase.co/functions/v1/newspaper-ocr-1988-import'
OIDC_URL=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']
OIDC_REQ=os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']
UA='UMARM CFRN 1988 staged OCR/1.0'

def get(url, attempts=6):
    last=None
    for a in range(1,attempts+1):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA})
            with urllib.request.urlopen(req,timeout=120) as r:
                return r.read()
        except Exception as e:
            last=e
            if a<attempts:
                time.sleep(min(a*4,20))
    raise RuntimeError(f'GET failed {url}: {last}')

def oidc():
    sep='&' if '?' in OIDC_URL else '?'
    req=urllib.request.Request(
        f'{OIDC_URL}{sep}audience=umarm-newspaper-ocr-import',
        headers={'Authorization':f'bearer {OIDC_REQ}','User-Agent':UA}
    )
    with urllib.request.urlopen(req,timeout=30) as r:
        token=json.loads(r.read().decode()).get('value')
    if not token:
        raise RuntimeError('OIDC token missing')
    return token

def api(payload, attempts=8, timeout=120):
    body=json.dumps(payload,separators=(',',':')).encode()
    last=None
    for a in range(1,attempts+1):
        try:
            req=urllib.request.Request(
                IMPORT,data=body,method='POST',
                headers={
                    'Authorization':f'Bearer {oidc()}',
                    'Content-Type':'application/json',
                    'User-Agent':UA
                }
            )
            with urllib.request.urlopen(req,timeout=timeout) as r:
                out=json.loads(r.read().decode())
            if out.get('ok'):
                return out
            last=RuntimeError(f'bad response {out}')
        except urllib.error.HTTPError as e:
            last=RuntimeError(f'HTTP {e.code}: {e.read().decode("utf-8","replace")}')
        except Exception as e:
            last=e
        if a<attempts:
            time.sleep(min(a*8,45))
    raise RuntimeError(f'API request failed after {attempts} attempts: {last}')

def clean_text(value, limit=180):
    value=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', value or '')
    value=' '.join(value.split())
    return value[:limit] if len(value)>limit else value

def parse_tsv(tsv):
    words=[]
    page_w=page_h=0
    for row in csv.DictReader(io.StringIO(tsv),delimiter='\t'):
        try:
            level=int(row.get('level') or 0)
        except Exception:
            continue
        try:
            left=int(row.get('left') or 0)
            top=int(row.get('top') or 0)
            width=int(row.get('width') or 0)
            height=int(row.get('height') or 0)
        except Exception:
            left=top=width=height=0
        if level==1:
            page_w=max(page_w,width)
            page_h=max(page_h,height)
            continue
        if level!=5:
            continue
        text=clean_text(row.get('text') or '')
        if not text:
            continue
        try:
            conf=float(row.get('conf') or -1)
        except Exception:
            conf=-1
        words.append({
            'text':text,'conf':conf if conf>=0 else None,
            'left':left,'top':top,'width':width,'height':height,
            'key':(row.get('block_num'),row.get('par_num'),row.get('line_num'))
        })
    if not words:
        return '',[],None
    if not page_w:
        page_w=max(1,max(w['left']+w['width'] for w in words))
    if not page_h:
        page_h=max(1,max(w['top']+w['height'] for w in words))

    groups={}
    for w in words:
        groups.setdefault(w['key'],[]).append(w)

    lines=[]
    for ws in groups.values():
        ws.sort(key=lambda w:w['left'])
        text=clean_text(' '.join(w['text'] for w in ws),600)
        if not text:
            continue
        left=min(w['left'] for w in ws)
        top=min(w['top'] for w in ws)
        right=max(w['left']+w['width'] for w in ws)
        bottom=max(w['top']+w['height'] for w in ws)
        cs=[w['conf'] for w in ws if w['conf'] is not None]
        score=(sum(cs)/len(cs)/100) if cs else 0
        lines.append({
            't':text,
            'x':round(left/page_w,6),
            'y':round(top/page_h,6),
            'w':round(max(0,right-left)/page_w,6),
            'h':round(max(0,bottom-top)/page_h,6),
            's':round(max(0,min(1,score)),4)
        })
    lines.sort(key=lambda x:(x['y'],x['x']))
    if len(lines)>1500:
        lines=lines[:1500]
    confs=[w['conf'] for w in words if w['conf'] is not None]
    avg=round(sum(confs)/len(confs)/100,4) if confs else None
    text='\n'.join(x['t'] for x in lines).strip()
    if len(text)>120000:
        text=text[:120000]
    return text,lines,avg

def ocr_page(n):
    page=f'{n:03d}.jpg'
    data=get(f'{ROOT}/{page}')
    with tempfile.NamedTemporaryFile(suffix='.jpg') as f:
        f.write(data)
        f.flush()
        def run(psm):
            p=subprocess.run(
                ['tesseract',f.name,'stdout','-l','eng','--psm',str(psm),'tsv'],
                capture_output=True,text=True,timeout=180
            )
            if p.returncode!=0:
                raise RuntimeError(p.stderr[-1000:])
            return parse_tsv(p.stdout)
        text,lines,avg=run(11)
        if not text or not lines:
            text,lines,avg=run(6)
    if not text or not lines:
        raise RuntimeError(f'{page}: OCR/layout blank')
    return {
        'page':page,
        'text':text,
        'avg_confidence':avg,
        'meta':{
            'source_sha256':hashlib.sha256(data).hexdigest(),
            'scan_position':n,
            'line_layout':{'lines':lines}
        }
    }

state=api({'publication':PUB,'issue':ISSUE,'action':'status'}, attempts=6, timeout=60)
complete=set(state.get('complete_pages') or state.get('pages') or [])
print(
    f'{ISSUE}: {len(complete)}/{PAGE_COUNT} pages already complete/staged '
    f'(production={state.get("main_count",0)}, stage={state.get("staged_count",0)})',
    flush=True
)

for n in range(1,PAGE_COUNT+1):
    page=f'{n:03d}.jpg'
    if page in complete:
        print(f'{ISSUE} {page}: already complete/staged; skip',flush=True)
        continue

    row=ocr_page(n)
    packed=gzip.compress(json.dumps(row,separators=(',',':')).encode(),compresslevel=6)
    encoded=base64.b64encode(packed).decode('ascii')
    out=api({'publication':PUB,'issue':ISSUE,'encoded_page':encoded,'stage':True}, attempts=8, timeout=120)
    if not out.get('staged') or int(out.get('pages',0))!=1:
        raise RuntimeError(f'{page}: unexpected staging response {out}')

    complete.add(page)
    print(
        f'{ISSUE} {page}: staged {len(row["text"])} chars / '
        f'{len(row["meta"]["line_layout"]["lines"])} lines; packed={len(packed)}',
        flush=True
    )
    time.sleep(1.5)

if len(complete)<PAGE_COUNT:
    raise RuntimeError(f'{ISSUE}: only {len(complete)} of {PAGE_COUNT} pages complete/staged')
print(json.dumps({'ok':True,'issue':ISSUE,'complete_or_staged':len(complete),'expected':PAGE_COUNT}),flush=True)
