from pathlib import Path
import subprocess,json
repo=Path('C:/Users/schaf/Desktop/PHOTOS II/mrn-site-1981')
base=Path('C:/Users/schaf/Desktop/PHOTOS II/mrn-prepared-1982')
raw=subprocess.check_output(['git','show','HEAD:public/data/newspapers-manifest.json'],cwd=repo)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
old=json.loads(raw)
entries=json.loads((base/'1982-manifest-entries.json').read_text())
assert len(entries)==26 and len({x['issueDate'] for x in entries})==26
assert sum(len(x['pages']) for x in entries)==468
assert not any(x.get('publicationSlug')=='midwest-racing-news' and x.get('year')==1982 for x in old)
assert all(x['year']==1982 for x in entries)
pos=raw.rfind(b']'); result=raw[:pos].rstrip()+b','+json.dumps(entries,indent=2).encode()[1:-1]+b'\n'+raw[pos:]
assert json.loads(result)==old+entries
(base/'production-manifest-baseline.json').write_bytes(raw)
(base/'production-manifest-baseline-commit.txt').write_text(commit)
(repo/'public/data/newspapers-manifest.json').write_bytes(result)
(base/'manifest-preservation-check.json').write_text(json.dumps({'baseline_commit':commit,'prior_entries_preserved':len(old),'added_issues':26,'added_pages':468}))
print({'prior_entries_preserved':len(old),'added_issues':26,'added_pages':468})
