'use strict';
const assert = require('node:assert/strict');
const PREFIX = 'newspapers/midwest-racing-news';
const isTarget = (entry, year) => entry.publicationSlug === 'midwest-racing-news' && Number(entry.year) === year;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
function parseIssue(name, year) {
  let m = name.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})-(\d+)$/);
  let month, day, sourceYear, number;
  if (m) { month = +m[1]; day = +m[2]; sourceYear = m[3].length === 2 ? Math.floor(year / 100) * 100 + +m[3] : +m[3]; number = +m[4]; }
  else { m = name.match(/^(\d{4})-(\d{2})-(\d{2})(?:-(\d+))?$/); assert(m, `Unrecognized issue name: ${name}`); sourceYear = +m[1]; month = +m[2]; day = +m[3]; number = m[4] ? +m[4] : null; }
  const date = `${sourceYear}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  assert(sourceYear === year && new Date(date + 'T12:00:00Z').toISOString().slice(0,10) === date, `Invalid issue date: ${name}`);
  assert(number === null || number > 0, `Invalid issue number: ${name}`);
  return {date, number, date_evidence: `source name ${name}`, date_uncertain: false};
}
function validateIssues(issues) {
  assert(issues.length > 0, 'No source issues found');
  assert(new Set(issues.map(x => x.date)).size === issues.length, 'Duplicate source issue dates');
  const numbers = issues.map(x => x.number).filter(x => x !== null).sort((a,b) => a-b);
  if (numbers.length) { assert(numbers.length === issues.length, 'Mixed numbered and unnumbered issue folders'); assert.deepEqual(numbers, Array.from({length:numbers.length},(_,i)=>i+1), 'Missing or duplicate source issue numbers'); }
  for (const issue of issues) { assert(issue.pages.length > 0, `Empty issue ${issue.date}`); assert.deepEqual(issue.pages.map(x => x.number), Array.from({length:issue.pages.length},(_,i)=>i+1), `Missing or duplicate pages in ${issue.date}`); }
}
function complete(row) { return row?.status === 'complete' && !!row.ocr_text?.trim() && !!row.search_vector; }
function preservedManifestEntry(existing, expected, protectedYear) {
  if (!existing || !protectedYear) return expected;
  // Verified 1981 manifest entries predate final OCR metadata. Preserve their historical summary fields.
  const substantive = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['generatedAt','ocrSourceCount'].includes(key)));
  assert(same(substantive(existing),substantive(expected)), `Verified manifest content conflict at ${expected.issueDate}`);
  return existing;
}
function roman(n) { let s=''; for(const [value,text] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]) while(n>=value){s+=text;n-=value;} return s; }
function metadata(template, issue, year, publicUrl, generatedAt) {
  const folder = `${PREFIX}/${issue.date}`;
  const title = new Date(issue.date+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  return {...template,slug:issue.date,title,year,issueDate:issue.date,
    summary:`This ${title} issue of Midwest Racing News preserves regional short-track racing coverage from the Upper Midwest, including race reports, photographs, schedules, advertisements, and period racing news from the season.`,
    ocrSourceCount:issue.pages.length,ocrTextPath:publicUrl(folder+'/ocr.txt'),coverImage:publicUrl(folder+'/front-cover.jpg'),backCoverImage:publicUrl(folder+'/back-cover.jpg'),thumbnail:publicUrl(folder+'/thumbnail.jpg'),pages:issue.pages.map(p=>publicUrl(p.key)),
    generatedBy:`Museum Newspaper Manager v1.2.2 compatible ${year} ingestion`,generatedAt,originalFolderName:issue.name,normalizedFolder:`midwest-racing-news/${issue.date}`,number:String(issue.number ?? issue.sequence),volume:roman(year-1958)};
}
function mergeManifest(raw, entries, year) {
  const old = JSON.parse(raw); const target = old.filter(x=>isTarget(x,year));
  assert(new Set(target.map(x=>x.issueDate)).size===target.length, 'Duplicate checked-in issue dates');
  const intended = new Map(entries.map(x=>[x.issueDate,x]));
  for(const entry of target) assert(intended.has(entry.issueDate) && same(entry,intended.get(entry.issueDate)), `Existing manifest conflict at ${entry.issueDate}; refusing replacement`);
  const added = entries.filter(x=>!target.some(y=>y.issueDate===x.issueDate));
  if(!added.length) return {raw,added:0};
  const position=raw.lastIndexOf(']'); assert(position>=0,'Invalid manifest');
  const result=raw.slice(0,position).trimEnd()+(old.length?',':'')+JSON.stringify(added,null,2).slice(1,-1)+'\n'+raw.slice(position);
  assert(same(JSON.parse(result),old.concat(added)), 'Manifest preservation check failed');
  return {raw:result,added:added.length};
}
module.exports={PREFIX,isTarget,same,parseIssue,validateIssues,complete,metadata,mergeManifest,preservedManifestEntry};
