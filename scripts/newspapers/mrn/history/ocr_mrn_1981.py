from pathlib import Path
import json, subprocess, concurrent.futures
base=Path('C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1981')
audit=json.loads((base/'audit.json').read_text())
out=base/'page-ocr'; out.mkdir(exist_ok=True)
def run(p):
    key=p['issue_date']+'_'+str(p['page_number'])
    result=out/(key+'.json')
    if result.exists() and json.loads(result.read_text())['ocr_text'].strip(): return
    target=out/key
    r=subprocess.run(['C:/Program Files/Tesseract-OCR/tesseract.exe',p['output_path'],str(target),'-l','eng','--psm','11'],capture_output=True,text=True,timeout=180)
    text=target.with_suffix('.txt').read_text(encoding='utf-8').strip() if target.with_suffix('.txt').exists() else ''
    data=dict(publication_code='midwest-racing-news',issue_date=p['issue_date'],page_label=str(p['page_number'])+'.jpg',storage_path=p['object_key'],mime_type='image/jpeg',status='complete' if text and r.returncode==0 else 'failed',ocr_engine='Tesseract',ocr_model='eng --psm 11',ocr_text=text,ocr_json={'source_sha256':p['sha256'],'source_quality_warning':p['quality_warning']},error_message=None if text and r.returncode==0 else r.stderr[-1000:])
    result.write_text(json.dumps(data),encoding='utf-8')
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for i,_ in enumerate(pool.map(run,audit['pages']),1):
        if i%10==0: print(f'OCR checked {i}/492',flush=True)
print('OCR pass finished',flush=True)
