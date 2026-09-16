from pathlib import Path
from datetime import date
import csv, hashlib, json, shutil
from PIL import Image

source = Path('C:/Users/schaf/Desktop/MRN/1981')
root = Path('C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1981')
if root.exists():
    raise SystemExit('Output already exists; refusing to overwrite')
issues, pages = [], []
plan = []
for folder in source.iterdir():
    if not folder.is_dir(): continue
    m, d, y, number = map(int, folder.name.split('-'))
    issue_date = date(1900+y, m, d).isoformat()
    assert issue_date.startswith('1981-')
    files = sorted(folder.glob('*.jpg'), key=lambda p: int(p.stem))
    assert [int(p.stem) for p in files] == list(range(1, len(files)+1)), folder
    plan.append((issue_date, folder, files))
root.mkdir()
for issue_date, folder, files in sorted(plan):
    keydir = 'newspapers/midwest-racing-news/'+issue_date
    destdir = root/keydir
    destdir.mkdir(parents=True)
    warnings=[]
    for p in files:
        dest=destdir/p.name
        before=hashlib.sha256(p.read_bytes()).hexdigest()
        shutil.copyfile(p,dest)
        assert hashlib.sha256(dest.read_bytes()).hexdigest()==before
        with Image.open(dest) as im:
            im.load()
            width,height=im.size
            sample=im.convert('RGB').resize((100,100))
            gray=sum(1 for r,g,b in sample.getdata() if max(r,g,b)-min(r,g,b)<3 and 110<r<150)/10000
        warning='Large mid-gray area; possible incomplete scan; review source' if gray>0.15 else ''
        if warning: warnings.append(p.name)
        pages.append(dict(issue_date=issue_date,source_filename=p.name,source_path=str(p),output_path=str(dest),bucket='media',object_key=keydir+'/'+p.name,content_type='image/jpeg',upsert=False,page_number=int(p.stem),bytes=dest.stat().st_size,width=width,height=height,sha256=before,quality_warning=warning,upload_status='not_uploaded'))
    issues.append(dict(issue_date=issue_date,source_folder=str(folder),source_type='existing_jpeg_pages_no_pdf',page_count=len(files),output_path=str(destdir),date_evidence='source folder '+folder.name,date_uncertain=False,front_page_verified=issue_date=='1981-04-02',quality_review_pages=';'.join(warnings)))
for name,rows in [('issues.csv',issues),('pages-upload-manifest.csv',pages)]:
    with (root/name).open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
(root/'audit.json').write_text(json.dumps(dict(source=str(source),processed_year=1981,stopped_for_verification=True,originals_unchanged=True,copy_hashes_verified=True,upload_performed=False,issues=issues,pages=pages),indent=2),encoding='utf-8')
(root/'README.txt').write_text('1981 ONLY. Stopped for user verification. Originals copied byte-for-byte, not modified. Source contains JPG pages, no PDFs. Dates parsed as month-day-year-issue from source folders; only April 2 front page visually verified. Review quality warnings before uploading. Upload manifest targets existing media bucket with image/jpeg and upsert=false. No uploads performed. Do not replace any existing object. 1959-1980 and 1982 onward untouched.\n',encoding='utf-8')
print(json.dumps(dict(issues=len(issues),pages=len(pages),bytes=sum(p['bytes'] for p in pages),quality_flagged_pages=sum(bool(p['quality_warning']) for p in pages),output=str(root))))
