import fs from 'node:fs';
const base=new URL('./',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,base),'utf8'));
const batch=read(process.argv[2]||'accessory_foods.batch.json');
const work=read('accessory_foods.work.parts.json');
const dest=new URL('accessory_foods.manual.json',base);
const out=fs.existsSync(dest)?read('accessory_foods.manual.json'):{};
for(const [index,target]of Object.entries(batch)){const p=work[+index];if(!p||p.i!==+index)throw new Error('Bad index '+index);out[p.key]=target+p.tail;}
fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');console.log({added:Object.keys(batch).length,total:Object.keys(out).length});
