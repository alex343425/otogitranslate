import fs from 'node:fs';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const root=path.resolve(dir,'../..');
const tasks=fs.readFileSync(path.join(dir,'materials.pending.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
const output=JSON.parse(fs.readFileSync(path.join(dir,'materials.translations.json'),'utf8'));
const glossary=JSON.parse(fs.readFileSync(path.join(dir,'materials.glossary.json'),'utf8'));
const state=JSON.parse(fs.readFileSync(path.join(root,'source/current.json'),'utf8'));
const byTable=new Map(Object.entries(state.tables).filter(([table])=>table!=='MSkillMutationData').map(([table,meta])=>[table,new Map(JSON.parse(fs.readFileSync(path.join(root,meta.file),'utf8')).map(r=>[r.id,r]))]));
const literals=glossary.map(e=>e.ja).sort((a,b)=>b.length-a.length);
const numbers=x=>x.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g)||[];
const placeholders=x=>(x.match(/\{\d+\}/g)||[]).sort().join(' ');
const errors=[];
for(const [source,fragment] of [
 ['関羽の心が封じられた魔石','關羽的心'],
 ['フレーダ 黒ナースver.の心が封じられた魔石','黑護士ver.'],
 ['{0}枚で{1}度キャラのアビリティを創造することができるメダル','{1}次能力'],
 ['アニエスの心の心が封じられた魔石','心之心'],
]){
 if(!output[source]?.includes(fragment))errors.push({kind:'reviewRegression',source,fragment,target:output[source]});
}
let rowCount=0;
for(const task of tasks){
 const target=output[task.key];
 if(typeof target!=='string'){errors.push({kind:'missing',source:task.key});continue;}
 if(placeholders(task.key)!==placeholders(target))errors.push({kind:'placeholder',source:task.key,target});
 if((task.key.match(/\\n/g)||[]).length!==(target.match(/\\n/g)||[]).length)errors.push({kind:'literalNewline',source:task.key,target});
 for(const ref of task.references){
  const row=byTable.get(ref.table).get(ref.id), values=numbers(row.d);
  const rendered=target.replace(/\{(\d+)\}/g,(_,i)=>values[Number(i)]);
  if([...numbers(row.d)].sort().join(' ')!==numbers(rendered).sort().join(' '))errors.push({kind:'numeric',ref,source:row.d,target:rendered});
  let remaining=rendered;
  for(const literal of literals)remaining=remaining.split(literal).join('');
  if(/[ぁ-ゖァ-ヺ]/u.test(remaining))errors.push({kind:'kana',ref,source:row.d,target:rendered,remaining});
  rowCount++;
 }
}
const report={total:tasks.length,translated:Object.keys(output).length,rows:rowCount,glossaryEntries:glossary.length,errors};
fs.writeFileSync(path.join(dir,'materials.validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
