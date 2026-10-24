import fs from 'node:fs';
import path from 'node:path';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),root=path.resolve(dir,'../..');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const tasks=read('weapons_items.helper.pending.jsonl').trim().split(/\r?\n/).map(JSON.parse);
const output=JSON.parse(read('weapons_items.helper.translations.json'));
const glossary=JSON.parse(read('weapons_items.helper.glossary.json'));
const state=JSON.parse(fs.readFileSync(path.join(root,'source/current.json'),'utf8'));
const tables=new Map(Object.entries(state.tables).filter(([t])=>t!=='MSkillMutationData').map(([t,m])=>[t,new Map(JSON.parse(fs.readFileSync(path.join(root,m.file),'utf8')).map(r=>[r.id,r]))]));
const numbers=s=>s.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g)||[];
const placeholders=s=>(s.match(/\{\d+\}/g)||[]).sort().join(' ');
const permitted=glossary.filter(t=>t.preserve).map(t=>t.ja).sort((a,b)=>b.length-a.length);
const errors=[];let rows=0;
for(const task of tasks){
 const target=output[task.key];
 if(typeof target!=='string'){errors.push({kind:'missing',source:task.key});continue;}
 if(placeholders(task.key)!==placeholders(target))errors.push({kind:'placeholder',source:task.key,target});
 if((task.key.match(/\\n/g)||[]).length!==(target.match(/\\n/g)||[]).length)errors.push({kind:'literalNewline',source:task.key,target});
 for(const ref of task.references){
  const source=tables.get(ref.table).get(ref.id).d, values=numbers(source);
  const rendered=target.replace(/\{(\d+)\}/g,(_,i)=>values[+i]);
  if(numbers(source).sort().join(' ')!==numbers(rendered).sort().join(' '))errors.push({kind:'numeric',ref,source,rendered});
  let remaining=rendered;
  for(const literal of permitted)remaining=remaining.split(literal).join('');
  if(/[ぁ-ヺ]/u.test(remaining))errors.push({kind:'kana',ref,source,rendered,remaining});
  rows++;
 }
}
const report={total:tasks.length,translated:Object.keys(output).length,rows,preserved:permitted.length,errors};
fs.writeFileSync(path.join(dir,'weapons_items.helper.validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
