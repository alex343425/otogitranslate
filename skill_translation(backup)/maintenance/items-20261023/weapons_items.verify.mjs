import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8').replace(/^\uFEFF/,'');
const tasks=read('weapons_items.pending.jsonl').trim().split(/\r?\n/).map(JSON.parse),output=JSON.parse(read('weapons_items.translations.json')),glossary=JSON.parse(read('weapons_items.glossary.json'));
const approved=JSON.parse(fs.readFileSync(path.join(root,'translations/glossary.json'),'utf8'));
const core=createRequire(import.meta.url)('../../runtime.cjs')(),dictionary=core.validate({schemaVersion:1,locale:'zh-TW',templates:output,exact:{}});
const state=JSON.parse(fs.readFileSync(path.join(root,'source/current.json'),'utf8'));
const tables=new Map(Object.entries(state.tables).filter(([t])=>t!=='MSkillMutationData').map(([t,m])=>[t,new Map(JSON.parse(fs.readFileSync(path.join(root,m.file),'utf8')).map(r=>[r.id,r]))]));
const nums=s=>(s.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g)||[]).sort().join(' '),ph=s=>(s.match(/\{\d+\}/g)||[]).sort().join(' ');
const preserved=[...approved,...glossary].filter(x=>x.preserve).map(x=>x.ja).sort((a,b)=>b.length-a.length);
const errors=[];let rows=0;
for(const task of tasks){const target=output[task.key];if(!target){errors.push({kind:'missing',source:task.key});continue;}
 if(ph(task.key)!==ph(target))errors.push({kind:'placeholder',source:task.key,target});
 for(const re of [/\\n/g,/\n/g])if((task.key.match(re)||[]).length!==(target.match(re)||[]).length)errors.push({kind:'newline',type:String(re),source:task.key,target});
 for(const ref of task.references){const source=tables.get(ref.table).get(ref.id).d,rendered=core.describe(source,dictionary);
  if(nums(source)!==nums(rendered))errors.push({kind:'numeric',ref,source,rendered});
  let remaining=rendered;for(const n of preserved)remaining=remaining.split(n).join('');
  if(/[ぁ-ゖァ-ヺ]/u.test(remaining))errors.push({kind:'kana',ref,source,rendered,remaining});
  if(rendered===source&&source!=='CP')errors.push({kind:'unchanged',ref,source});rows++;
 }
}
const report={total:tasks.length,translated:Object.keys(output).length,sourceRows:rows,glossary:glossary.length,preserved:glossary.filter(x=>x.preserve).length,retained:JSON.parse(read('weapons_items.retained.json')),errors};
fs.writeFileSync(path.join(dir,'weapons_items.validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
