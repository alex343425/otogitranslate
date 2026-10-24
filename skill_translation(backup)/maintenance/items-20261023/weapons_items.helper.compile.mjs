import fs from 'node:fs';
const dir=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,dir),'utf8').replace(/^\uFEFF/,'');
const tasks=read('weapons_items.helper.pending.jsonl').trim().split(/\r?\n/).map(JSON.parse);
const names=JSON.parse(read('materials.names.json'));
const existing=JSON.parse(fs.readFileSync(new URL('../../translations/glossary.json',dir),'utf8'));
const extra={'ラディカルスピード':'速度激化','フィギー':'菲姬','ブニターリカ':'布尼塔利卡','バイレ・アス・ハロウィン':'拜萊・阿斯・萬聖節'};
// The targets are already Chinese prose. Only replace Japanese lexical inputs;
// generic Kanji keys such as 現在 must not rewrite Chinese sentences in place.
const lexical=Object.fromEntries(Object.entries({...names,...Object.fromEntries(existing.filter(e=>!e.preserve).map(e=>[e.ja,e.zhTW])),...extra}).filter(([ja])=>ja.length>1&&/[ぁ-ヺ]/u.test(ja)));
const escaping=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let proper=[];try{proper=JSON.parse(read('weapons_items.helper.preserve.json'))}catch(e){if(e.code!=='ENOENT')throw e;}
proper.sort((a,b)=>b.length-a.length);
const nameRE=new RegExp([...new Set([...Object.keys(lexical),...proper])].sort((a,b)=>b.length-a.length).map(escaping).join('|'),'g');
const out={},kana=[],glossary=new Map();
for(const line of read('weapons_items.helper.manual.tsv').trim().split(/\r?\n/)){
 const p=line.indexOf('\t'),index=+line.slice(0,p),source=tasks[index].key;
 let target=line.slice(p+1);
 target=target.replace(nameRE,s=>{
  if(lexical[s])return lexical[s];
  glossary.set(s,{ja:s,zhTW:s,preserve:true,reason:'武器背景中明確引用的角色、地名、團體、裝備或世界觀專名；尚無核准譯名，以引號標示並保留來源完整名稱。'});
  return `「${s}」`;
 });
 let remaining=target;
 for(const term of [...glossary.values()].filter(e=>e.preserve).sort((a,b)=>b.ja.length-a.ja.length))remaining=remaining.split(term.ja).join('');
 if(/[ぁ-ヺ]/u.test(remaining))kana.push({index,source,target,remaining});
 const ph=s=>(s.match(/\{\d+\}/g)||[]).sort().join(' ');
 if(ph(source)!==ph(target))throw new Error('Placeholder mismatch '+index+' '+source+' => '+target);
 out[source]=target;
}
fs.writeFileSync(new URL('weapons_items.helper.translations.json',dir),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(new URL('weapons_items.helper.kana.json',dir),JSON.stringify(kana,null,2)+'\n');
for(const [ja,zhTW]of Object.entries(extra))glossary.set(ja,{ja,zhTW,reason:ja==='ラディカルスピード'?'師團名稱用語，與既有技巧激化及力量激化對應。':ja==='フィギー'?'沿用核准全名フィギー・ムー中菲姬的簡稱。':'沿用同批武器描述代理已採用的地名譯法。'});
fs.writeFileSync(new URL('weapons_items.helper.glossary.json',dir),JSON.stringify([...glossary.values()],null,2)+'\n');
console.log({total:tasks.length,translated:Object.keys(out).length,kana:kana.length,glossary:glossary.size});
