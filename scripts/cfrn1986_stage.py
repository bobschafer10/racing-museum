import base64
import csv
import gzip
import hashlib
import io
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

csv.field_size_limit(10_000_000)

PROJECT = 'szvkleurojiwqkkztxtr'
PUB = 'checkered-flag-racing-news'
ISSUE = os.environ['ISSUE']
PAGE_COUNT = int(os.environ['PAGE_COUNT'])
ROOT = f'https://{PROJECT}.supabase.co/storage/v1/object/public/media/newspapers/{PUB}/{ISSUE}'
IMPORT = f'https://{PROJECT}.supabase.co/functions/v1/newspaper-ocr-1986-import'
OIDC_URL = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']
OIDC_REQ = os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']


def get(url, attempts=5):
    last = None
    for a in range(1, attempts + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'UMARM CFRN 1986 stage/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:
            last = e
            if a < attempts:
                time.sleep(a * 2)
    raise RuntimeError(f'GET failed {url}: {last}')


def fresh_token():
    sep = '&' if '?' in OIDC_URL else '?'
    req = urllib.request.Request(
        f'{OIDC_URL}{sep}audience=umarm-newspaper-ocr-import',
        headers={'Authorization': f'bearer {OIDC_REQ}', 'User-Agent': 'UMARM CFRN 1986 stage/1.0'},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        token = json.loads(r.read().decode()).get('value')
    if not token:
        raise RuntimeError('OIDC token missing')
    return token


def post(payload, attempts=5, timeout=90):
    body = json.dumps(payload, separators=(',', ':')).encode()
    last = None
    for a in range(1, attempts + 1):
        token = fresh_token()
        req = urllib.request.Request(
            IMPORT,
            data=body,
            method='POST',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'User-Agent': 'UMARM CFRN 1986 stage/1.0',
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            try:
                detail = e.read().decode(errors='replace')
            except Exception:
                detail = ''
            last = RuntimeError(f'HTTP {e.code}: {detail[:1000]}')
        except Exception as e:
            last = e
        if a < attempts:
            time.sleep(a * 3)
    raise RuntimeError(f'POST failed after retries: {last}')


def parse_tsv(tsv):
    reader = csv.DictReader(io.StringIO(tsv), delimiter='\t')
    words = []
    page_w = 0
    page_h = 0
    for row in reader:
        try:
            level = int(row.get('level') or 0)
        except Exception:
            continue
        try:
            left = int(row.get('left') or 0)
            top = int(row.get('top') or 0)
            width = int(row.get('width') or 0)
            height = int(row.get('height') or 0)
        except Exception:
            left = top = width = height = 0
        if level == 1:
            page_w = max(page_w, width)
            page_h = max(page_h, height)
            continue
        if level != 5:
            continue
        text = (row.get('text') or '').strip()
        if not text:
            continue
        try:
            conf = float(row.get('conf') or -1)
        except Exception:
            conf = -1
        words.append({
            'text': text,
            'conf': conf if conf >= 0 else None,
            'left': left,
            'top': top,
            'width': width,
            'height': height,
            'key': (row.get('block_num'), row.get('par_num'), row.get('line_num')),
        })
    if not words:
        return '', [], None
    if not page_w:
        page_w = max(1, max(w['left'] + w['width'] for w in words))
    if not page_h:
        page_h = max(1, max(w['top'] + w['height'] for w in words))
    groups = {}
    for w in words:
        groups.setdefault(w['key'], []).append(w)
    lines = []
    for ws in groups.values():
        ws.sort(key=lambda w: w['left'])
        text = ' '.join(w['text'] for w in ws).strip()
        if not text:
            continue
        left = min(w['left'] for w in ws)
        top = min(w['top'] for w in ws)
        right = max(w['left'] + w['width'] for w in ws)
        bottom = max(w['top'] + w['height'] for w in ws)
        cs = [w['conf'] for w in ws if w['conf'] is not None]
        score = (sum(cs) / len(cs) / 100) if cs else 0
        lines.append({
            't': text,
            'x': left / page_w,
            'y': top / page_h,
            'w': max(0, right - left) / page_w,
            'h': max(0, bottom - top) / page_h,
            's': max(0, min(1, score)),
        })
    lines.sort(key=lambda x: (x['y'], x['x']))
    confs = [w['conf'] for w in words if w['conf'] is not None]
    avg = (sum(confs) / len(confs) / 100) if confs else None
    text = '\n'.join(x['t'] for x in lines).strip()
    return text, lines, avg


status = post({'publication': PUB, 'issue': ISSUE, 'action': 'status'}, attempts=5, timeout=60)
existing = set(status.get('complete_pages') or status.get('pages') or [])
print(f'{ISSUE}: {len(existing)}/{PAGE_COUNT} pages already complete/staged', flush=True)

for n in range(1, PAGE_COUNT + 1):
    page = f'{n:03d}.jpg'
    if page in existing:
        print(f'{ISSUE} {page}: already complete/staged; skip', flush=True)
        continue
    data = get(f'{ROOT}/{page}')
    with tempfile.NamedTemporaryFile(suffix='.jpg') as f:
        f.write(data)
        f.flush()

        def run(psm):
            p = subprocess.run(
                ['tesseract', f.name, 'stdout', '-l', 'eng', '--psm', str(psm), 'tsv'],
                capture_output=True,
                text=True,
                timeout=240,
            )
            if p.returncode != 0:
                raise RuntimeError(p.stderr[-1000:])
            return parse_tsv(p.stdout)

        text, lines, avg = run(11)
        if not text or not lines:
            text, lines, avg = run(6)
    if not text or not lines:
        raise RuntimeError(f'{page}: OCR/layout blank')

    row = {
        'page': page,
        'text': text,
        'avg_confidence': avg,
        'meta': {
            'source_sha256': hashlib.sha256(data).hexdigest(),
            'scan_position': n,
            'line_layout': {'lines': lines},
        },
    }
    packed = gzip.compress(json.dumps(row, separators=(',', ':')).encode(), compresslevel=6)
    encoded = base64.b64encode(packed).decode('ascii')
    out = post({'publication': PUB, 'issue': ISSUE, 'encoded_page': encoded, 'stage': True}, attempts=5, timeout=90)
    if not out.get('ok') or int(out.get('pages', 0)) != 1 or not out.get('staged'):
        raise RuntimeError(f'{page}: bad staging response {out}')
    existing.add(page)
    print(f'{ISSUE} {page}: staged {len(text)} chars / {len(lines)} lines; packed={len(packed)}', flush=True)

print(json.dumps({'ok': True, 'issue': ISSUE, 'complete_or_staged': len(existing), 'expected': PAGE_COUNT}), flush=True)
