import fs from 'node:fs';
import crypto from 'node:crypto';
const base=new URL('./',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,base),'utf8'));
const tasks=fs.readFileSync(new URL('accessory_foods.pending.jsonl',base),'utf8').trim().split('\n').map(JSON.parse);
const out=read('accessory_foods.translations.json');
const glossary=read('accessory_foods.glossary.json');
const approved=JSON.parse(fs.readFileSync(new URL('../../translations/glossary.json',base),'utf8'));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const allowed=new RegExp([...approved,...glossary].filter(x=>x.preserve).map(x=>x.ja).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
const signature=s=>JSON.stringify((s.match(/\{\d+\}/g)||[]).sort());
const percents=s=>(s.match(/[%％]/g)||[]).length;
const originalKeys=new Set(tasks.map(x=>x.key));
const errors=[];
for(const task of tasks){
 const target=out[task.key];
 if(typeof target!=='string'||!target.trim()){errors.push({key:task.key,error:'missing-or-empty'});continue;}
 if(signature(task.key)!==signature(target))errors.push({key:task.key,error:'placeholder-mismatch'});
 if(percents(task.key)!==percents(target))errors.push({key:task.key,error:'percent-sign-count'});
 if(/[\uE000-\uF8FF]/.test(target))errors.push({key:task.key,error:'private-use-marker'});
 if(/[ぁ-ゖァ-ヺ]/.test(target.replace(allowed,'')))errors.push({key:task.key,error:'unapproved-kana'});
 if(target===task.key)errors.push({key:task.key,error:'untranslated-whole-description'});
 if(/恢復魔力|\{\d+\}倍變為/.test(target))errors.push({key:task.key,error:'style-guide'});
}
for(const key of Object.keys(out))if(!originalKeys.has(key))errors.push({key,error:'unexpected-key'});
const approvedMap=new Map(approved.map(x=>[x.ja,x.zhTW]));
for(const term of glossary)if(approvedMap.has(term.ja)&&approvedMap.get(term.ja)!==term.zhTW)errors.push({term:term.ja,error:'approved-term-conflict'});
const digest=n=>crypto.createHash('sha256').update(fs.readFileSync(new URL(n,base))).digest('hex');
const report={
 tasks:tasks.length,provided:Object.keys(out).length,
 sourceTables:[...new Set(tasks.flatMap(x=>x.references.map(r=>r.table)))],
 handTranslatedFoods:tasks.filter(x=>x.references.some(r=>r.table==='MFoods')).length,
 fullManualEntries:Object.keys(read('accessory_foods.manual.json')).length,
 parentEntries:['parent','parent2','parent3'].map(n=>({batch:n,entries:Object.keys(read('accessory_foods.'+n+'.translations.json')).length})),
 pairedNecklaces:tasks.filter(x=>x.key.includes('との絆を示すペアネックレス。')).length,
 glossaryAdditions:glossary.length,preservedNames:glossary.filter(x=>x.preserve).length,
 checks:['key-coverage','nonempty-target','placeholder-multiset','percent-sign-count','no-private-use-markers','no-unapproved-kana','no-unchanged-description','style-guide','no-existing-glossary-conflicts'],
 errors,
 sha256:{pending:digest('accessory_foods.pending.jsonl'),translations:digest('accessory_foods.translations.json'),glossary:digest('accessory_foods.glossary.json'),localNameSnapshot:digest('accessory_foods.names.json')}
};
fs.writeFileSync(new URL('accessory_foods.validation.json',base),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
