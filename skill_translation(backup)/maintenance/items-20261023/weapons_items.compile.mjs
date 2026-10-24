import fs from 'node:fs';
import {Converter} from 'opencc-js';
const jpToTw=Converter({from:'jp',to:'tw'});
const dir=new URL('./',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,dir),'utf8').replace(/^\uFEFF/,'');
const tasks=read('weapons_items.pending.jsonl').trim().split(/\r?\n/).map(JSON.parse);
const weapons=tasks.filter(x=>x.references[0].table==='MWeapons'),items=tasks.filter(x=>x.references[0].table==='MItems');
let extra={};try{extra=JSON.parse(read('weapons_items.lexicon.json'))}catch{}
// Snapshot only the names used by this batch from the existing local 童前字典.
const story=JSON.parse(read('weapons_items.known-names.json'));
const approved=JSON.parse(fs.readFileSync(new URL('../../translations/glossary.json',dir),'utf8'));
// Chinese narrative is already reviewed: never rewrite kanji-only words in it.
// In particular, single-character kana entries must not corrupt longer names.
const lex=Object.fromEntries(Object.entries({...story,...extra,...Object.fromEntries(approved.filter(x=>!x.preserve).map(x=>[x.ja,x.zhTW]))}).filter(([ja])=>(/[ぁ-ゖァ-ヺ]/.test(ja)&&ja.length>1) || ja==='Xmas'));
const mainPreserve=JSON.parse(read('weapons_items.preserve.json'));
for(const name of mainPreserve)lex[name]=name;
const escaping=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp(Object.keys(lex).sort((a,b)=>b.length-a.length).map(escaping).join('|'),'g');
const lexical=s=>s.replace(re,x=>lex[x]);
const sourceLabel=s=>{const tokens=[];const masked=s.replace(re,x=>'\uE000'+(tokens.push(lex[x])-1)+'\uE001');return jpToTw(masked).replace(/郞/g,'郎').replace(/甁/g,'瓶').replace(/\uE000(\d+)\uE001/g,(_,i)=>tokens[+i]);};
const out={};
function parseFile(n,fn){try{for(const line of read(n).split(/\r?\n/)){if(!line.trim()||line.startsWith('#'))continue;const p=line.indexOf('\t');if(p<0)throw Error(line);fn(+line.slice(0,p),line.slice(p+1));}}catch(e){if(e.code!=='ENOENT')throw e}}
const typeRE=/短剣|大剣|大槌|大斧|弓|剣|杖|槍|槌|斧|本/g;
const typeLex={'短剣':'短劍','大剣':'大劍','大槌':'大槌','大斧':'大斧','弓':'弓','剣':'劍','杖':'杖','槍':'槍','槌':'槌','斧':'斧','本':'本'};
parseFile('weapons_items.groups.tsv',(i,t)=>{const n=weapons[i].key.replace(typeRE,'〈武器〉');for(const r of weapons){if(r.key.replace(typeRE,'〈武器〉')===n){let tokens=[...r.key.matchAll(typeRE)].map(x=>x[0]),c=0;out[r.key]=t.replace(/〈武器〉/g,()=>typeLex[tokens[c++]]);}}});
parseFile('weapons_items.manual.tsv',(i,t)=>out[weapons[i].key]=t);
// Reviewed item labels and productive ticket syntax; unknown kana stays pending.
const itemLabels=s=>s.replace(/の/g,'的').replace(/or/g,'或').replace(/周年/g,'週年').replace(/属性/g,'屬性').replace(/確定/g,'保證').replace(/枠拡張/g,'欄位擴充').replace(/戦績/g,'戰績').replace(/総選挙/g,'總選舉');
for(const r of items){let s=r.key,t;
 if(/(?:ガチャP(?:【[ⅠⅡⅢⅣⅤⅥ]+】)?|スクラッチチケット|キャラバトルP\(.*\)|ユニゾンP\(.*\)|レイドP\(.*\)|コスモタワーP\(.*\))$/.test(s))t=s;
 else if(/ガチャ(?:\{\d+\}|W\{\d+\}|W|II|Limited|)のチケット$/.test(s))t=s.replace(/のチケット$/,'票券');
 else if(/出現率.*確定チケットガチャが引けるチケット$/.test(s))t='可進行'+s.replace(/が引けるチケット$/,'')+'的票券';
 else if(/^新キャラ.*確定チケットガチャが引けるチケット（ラインナップ：/.test(s))t='可進行'+s.replace(/が引けるチケット/,'')+'的票券';
 else if(/^UNA機関が特別にセレクションした未所持の限定/.test(s))t=s.replace(/^UNA機関が特別にセレクションした未所持の限定/,'可獲得UNA機關特別精選的尚未持有限定').replace(/キャラが出現するチケット/,'角色的票券');
 else if(/^星の魔宮殿で入手した.*の残滓。$/.test(s))t=s.replace(/^星の魔宮殿で入手した/,'在星之魔宮殿取得的').replace(/の残滓。$/,'殘滓。');
 else if(/と特別なひと時を過ごすためのアイテム$/.test(s))t=s.replace(/と特別なひと時を過ごすためのアイテム$/,'共度特別時光的道具').replace(/^/,'用來與');
 else if(/^バトル(?:カード|チケット)(?:\(.*\))?$/.test(s))t=s;
 else if(/^(?:天|地|冥|海|火|樹|水|光|闇)の戦績$/.test(s))t=s;
 else if(/^好きな(.+)と交換できる(.+)$/.test(s)){const m=s.match(/^好きな(.+)と交換できる(.+)$/);t='可兌換任選'+m[1].replace(/リリースまでの/g,'上市以前的').replace(/年登場/g,'年登場的').replace(/リリース初期/g,'上市初期').replace(/アディションを除く/g,'追加融合以外的').replace(/衣装替え/g,'換裝').replace(/黄昏の少女/g,'黃昏少女').replace(/交錯する天地/g,'交錯的天地')+'的'+m[2].replace(/スペシャルな/g,'特別');}
 if(t){t=itemLabels(sourceLabel(t));if(!/[ぁ-ゖァ-ヺ]/.test(t))out[s]=t;}
}
parseFile('weapons_items.items.tsv',(i,t)=>out[items[i].key]=t);
// Extending the exact, reviewed sentence dictionary is the only way to add narrative translations.
for(const k of Object.keys(out)){out[k]=lexical(out[k]);const a=[...k.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),b=[...out[k].matchAll(/\{\d+\}/g)].map(x=>x[0]).sort();if(JSON.stringify(a)!==JSON.stringify(b))throw Error('placeholder mismatch '+k+' -> '+out[k]);}
let helperGlossary=[];
try {
 const h=JSON.parse(read('weapons_items.helper.translations.json'));
 helperGlossary=JSON.parse(read('weapons_items.helper.glossary.json'));
 // Resolve only exact, individually documented names; never run the prose compiler again.
 const names=helperGlossary.filter(x=>x.preserve&&lex[x.ja]&&!/[ぁ-ゖァ-ヺ]/.test(lex[x.ja])).sort((a,b)=>b.ja.length-a.ja.length);
 for(const k of Object.keys(h))for(const n of names)h[k]=h[k].split(n.ja).join(lex[n.ja]);
 Object.assign(out,h);
} catch(e) { if(e.code!=='ENOENT')throw e; }
const arthurSource='我らがボスのアーサーが持つにふさわしい聖剣エクスカリバー。いまさら語ることはないほどに有名な剣だが、性格は…アーサー専用武器';
if(out[arthurSource])out[arthurSource]=out[arthurSource].replace('持有的聖劍聖劍。','持有的「聖劍」。');
fs.writeFileSync(new URL('weapons_items.translations.json',dir),JSON.stringify(out,null,2)+'\n');
const approvedKeys=new Set(approved.map(x=>x.ja));
const sourceCorpus=tasks.flatMap(x=>[x.key,...x.examples]).join('\n'),targetCorpus=Object.values(out).join('\n');
const additions=new Map();
for(const [ja,zhTW] of Object.entries(lex))if(!approvedKeys.has(ja)&&ja!==zhTW&&sourceCorpus.includes(ja)&&targetCorpus.includes(zhTW))additions.set(ja,{ja,zhTW,reason:Object.hasOwn(story,ja)?'新增武器／道具描述沿用既有童前字典的詞彙或專名。':'新增武器／道具描述的詞彙或專名，依本批譯文統一。'});
for(const g of helperGlossary)if(!approvedKeys.has(g.ja)&&targetCorpus.includes(g.preserve?g.ja:g.zhTW)&&!(g.preserve&&lex[g.ja]&&lex[g.ja]!==g.ja))additions.set(g.ja,g);
for(const ja of mainPreserve)if(sourceCorpus.includes(ja))additions.set(ja,{ja,zhTW:ja,preserve:true,reason:/億/.test(ja)?'MWeapons 描述內明確引用的 EX 技能名稱，保留完整技能名稱及數值。':/カフェジャ|ミスラビ|ミラマギ|コイカク|放セカ/.test(ja)?'MWeapons 描述以引號明確引用的作品／品牌縮寫，來源未展開全名，保留精確專名以免臆測。':'MWeapons 描述內明確引用的武器名稱，可由來源列的武器名對照，保留引用名稱。'});
fs.writeFileSync(new URL('weapons_items.glossary.json',dir),JSON.stringify([...additions.values()],null,2)+'\n');
const retained=tasks.filter(x=>out[x.key]===x.key).map(x=>({source:x.key,reason:x.key==='CP'?'MItems 原生識別縮寫 CP，來源本身不含待譯文字，依原縮寫保留。':'來源為原生識別或數值標記，無需翻譯。'}));
fs.writeFileSync(new URL('weapons_items.retained.json',dir),JSON.stringify(retained,null,2)+'\n');
const missing=tasks.map((r,i)=>({i,key:r.key,table:r.references[0].table})).filter(r=>!(r.key in out));
fs.writeFileSync(new URL('weapons_items.missing.json',dir),JSON.stringify(missing,null,2)+'\n');
const kana=Object.entries(out).filter(([k,t])=>/[ぁ-ゖァ-ヺ]/.test(t));
fs.writeFileSync(new URL('weapons_items.kana.json',dir),JSON.stringify(kana,null,2)+'\n');
console.log({total:tasks.length,translated:Object.keys(out).length,missing:missing.length,kana:kana.length});
