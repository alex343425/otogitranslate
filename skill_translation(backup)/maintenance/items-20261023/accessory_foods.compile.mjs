import fs from 'node:fs';
import OpenCC from 'opencc-js';
const base = new URL('./', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
const tasks = fs.readFileSync(new URL('accessory_foods.pending.jsonl',base),'utf8').trim().split('\n').map(JSON.parse);
const tw = OpenCC.Converter({from:'cn',to:'tw'});
const approved = JSON.parse(fs.readFileSync(new URL('../../translations/glossary.json',base),'utf8'));
const approvedMap = new Map(approved.map(x=>[x.ja,x]));
const existing = JSON.parse(fs.readFileSync(new URL('../../translations/templates.zh-TW.json',base),'utf8'));
function approvedEffect(source){
 const indices=[];const key=source.replace(/\{(\d+)\}/g,(_,n)=>'{'+(indices.push(n)-1)+'}');
 const found=existing[key]??phrases[key]; if(typeof found!=='string')return null;
 return found.replace(/\{(\d+)\}/g,(_,n)=>'{'+indices[+n]+'}');
}
const lex = new Map(approved.filter(x=>!x.preserve).map(x=>[x.ja,x.zhTW]));
const baseNames=JSON.parse(fs.readFileSync(new URL('../../translations/names.json',base),'utf8'));
for(const [ja,zh] of Object.entries(baseNames)) if(!lex.has(ja)) lex.set(ja,zh);
for(const line of fs.readFileSync(new URL('../../translations/lexicon.extra.tsv',base),'utf8').split(/\r?\n/)) if(line && !line.startsWith('#')) {const [ja,zh]=line.split('\t'); if(!lex.has(ja))lex.set(ja,zh);}
lex.delete('本'); lex.delete('全ステ');
const terms = fs.readFileSync(new URL('accessory_foods.lexicon.tsv',base),'utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>x.split('\t'));
for(const [ja,zh] of terms) {if(zh===undefined) throw new Error('Bad term '+ja);lex.set(ja,approvedMap.get(ja)?.zhTW??zh);}
const canonicalNames=read('accessory_foods.names.json');
const canonicalAliases=new Map();
for(const [ja,zh]of Object.entries(canonicalNames)){
 if(approvedMap.has(ja)||Object.hasOwn(baseNames,ja))continue;
 const old=lex.get(ja);if(old&&old!==zh&&old.length>=2&&!/[ぁ-ゖァ-ヺ]/.test(old))canonicalAliases.set(old,zh);
 lex.set(ja,zh);
}
const phrases = read('accessory_foods.phrases.json');
if(fs.existsSync(new URL('accessory_foods.clauses.tsv',base)))for(const line of fs.readFileSync(new URL('accessory_foods.clauses.tsv',base),'utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#'))){const [ja,zh]=line.split('\t');if(zh===undefined)throw new Error('Bad clause '+ja);phrases[ja]=zh;}
for(const [ja,zh] of Object.entries(phrases)) lex.set(ja,zh);
const protectedNames=new Set();
const inferredNames=new Set();
const literalName=n=>{if(lex.has(n)&&!/[ぁ-ゖァ-ヺ]/.test(lex.get(n)))return lex.get(n);if(!/[ぁ-ゖァ-ヺ]/.test(n))return tw(n);inferredNames.add(n);return '「'+n+'」';};
for(const x of tasks){
 for(const m of x.key.matchAll(/EXスキル(?:名)?["”「]([^"”」]+)["”」]/g)) protectedNames.add(m[1]);
 for(const m of x.key.matchAll(/「([^」]+)」に装備/g)) protectedNames.add(m[1]);
}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp([...lex.keys()].filter(Boolean).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
const phrasePattern=new RegExp(Object.keys(phrases).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
const protectedPattern=new RegExp([...protectedNames].sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
const glossary=[...terms.map(([ja,zhTW])=>({ja,zhTW})),...[...protectedNames].filter(ja=>/[ぁ-ゖァ-ヺ]/.test(ja)).map(ja=>({ja,zhTW:ja,preserve:true,reason:'新增飾品描述內明確引用的 EX 技能名或限定裝備角色名；僅引用名稱保持原文。'}))];
function translate(s){
 const protectedParts=[];
 const protect=x=>`\uE100${String.fromCharCode(0xE200+protectedParts.push(x)-1)}\uE101`;
 s=s.replace(/^(.+?)の顔を模したお面$/,(_,n)=>protect('仿照'+literalName(n)+'面容製作的面具'));
 s=s.replace(/^([ァ-ヺーA-Za-z0-9・.＋\-]+)になれるマスク$/,(_,n)=>protect('能變成'+literalName(n)+'的面具'));
 s=s.replace(/([ァ-ヺーA-Za-z0-9・.＋\-]+)の力が秘められた([^。]+)/g,(all,n,item)=>{
   if(!/^(?:P|靴|服|袖|角|翼|手袋|帽子|シュシュ|ヘアピン|リボン|バッグ|ティアラ|ブレスレット|羽織|ネックレス|髪飾り|首飾り|腕輪|指輪|ストッキング|リング|ケープ|チョーカー|鍵型の装飾|ベール|クラウン|アンクレット|パーカー|キャップ|ミサンガ|袖飾り|草履)$/.test(item))return all;
   return protect('蘊藏著'+literalName(n)+'之力的'+tw(item.replace(pattern,x=>lex.get(x))));
 });
 s=s.replace(phrasePattern,x=>protect(phrases[x]));
 s=s.replace(/EXスキル(名)?(["”「])([^"”」]+)(["”」])/g,(_,n,a,b,c)=>'EXスキル'+(n||'')+a+protect(b)+c);
 s=s.replace(/「([^」]+)」(?=に装備)/g,(_,b)=>'「'+protect(b)+'」');
 s=s.replace(/((?:(?:CT|全パラメータ|ステータス|攻撃魔力|回復魔力|攻撃力|防御力|すばやさ|＆|&|と|減少|効果|それぞれの|ダウン))+?)を(確実に|高確率で|低確率で|確率で|確率\{\d+\}％で|\{\d+\}％の確率で)防[ぐぎ]/g,(_,n,p)=>protect((p==='確実に'?'必定':p==='高確率で'?'以高機率':p==='低確率で'?'以低機率':p==='確率で'?'有機率':'以'+p.match(/\{\d+\}/)[0]+'％機率')+'防止'+tw(n.replace(pattern,x=>lex.get(x)).replace(/と/g,'與').replace(/それぞれの/g,'各自的'))));
 s=s.replace(/(?:装備すると)?(?:獲得できる)?ユニゾンP\(([^)]+)\)が(\{\d+\})%アップする/g,(_,n,v)=>protect('裝備後獲得的聯合戰P（'+tw(n.replace(pattern,x=>lex.get(x)))+'）提升'+v+'%'));
 s=s.replace(/。([^。:："”「」\uE100-\uF8FF]+?)専用アクセ(?:サリー)?$/g,(_,n)=>protect('。'+literalName(n)+'專用飾品'));
 s=s.replace(/所持している(《[^》]+》)バフ(\{\d+\})(?:つ|個)につき/g,'每持有$2個$1增益');
 s=s.replace(/気絶するほどのダメージを受けても/g,'即使受到足以致命的傷害');
 s=s.replace(/(\{\d+\})度まで/g,'最多$1次').replace(/HP(\{\d+\})[%％]で復活する/g,'以HP$1％復活');
 s=s.replace(/バトル中/g,'戰鬥中').replace(/毎ターン開始時に/g,'每回合開始時').replace(/毎ターン/g,'每回合');
 s=s.replace(/(\{\d+\})ターンの間/g,'$1回合內').replace(/(\{\d+\})ターン/g,'$1回合');
 s=s.replace(/確率(\{\d+\})[%％]で/g,'以$1％機率').replace(/(\{\d+\})[%％]の確率で/g,'以$1％機率');
 s=s.replace(/を(\{\d+\})枚張る/g,'展開$1層').replace(/(\{\d+\})枚張る/g,'展開$1層');
 s=s.replace(/に装備時/g,'裝備時').replace(/を確実に防ぐ/g,'必定防止').replace(/を高確率で防ぐ/g,'以高機率防止').replace(/を低確率で防ぐ/g,'以低機率防止').replace(/を確率で防ぐ/g,'有機率防止');
 s=s.replace(/確実にぬすんだアイテムを/g,'必定將竊取的道具').replace(/をぬすむ/g,'竊取');
 s=s.replace(/獲得できる/g,'可獲得的').replace(/手に入る/g,'可獲得');
 s=s.replace(/(\{\d+\})倍になる/g,'$1倍').replace(/(\{\d+\})%アップする/g,'提升$1%');
 s=s.replace(/(\{\d+\})～(\{\d+\})つ複製/g,'複製$1～$2個').replace(/(\{\d+\})つ複製/g,'複製$1個');
 s=s.replace(/攻撃を受ける度に/g,'每次受到攻擊時').replace(/味方が気絶するたびに/g,'每次我方角色昏厥時');
 s=s.replace(/全パラメータ/g,'全能力值').replace(/全状態異常/g,'所有狀態異常').replace(/CT増加速度/g,'CT增加速度');
 s=s.replace(/使用したスキルCT再チャージ/g,'將使用技能的CT重新充填').replace(/スキルCT再チャージ/g,'技能CT重新充填');
 s=s.replace(/攻撃対象の状態異常耐性を/g,'將攻擊目標的狀態異常抗性').replace(/減少させて攻撃/g,'降低後攻擊');
 s=s.replace(/通常攻撃＆スキル攻撃時に/g,'普通攻擊＆技能攻擊時').replace(/通常攻撃&スキル攻撃時に/g,'普通攻擊&技能攻擊時');
 s=s.replace(/に身に着けている/g,'佩戴在').replace(/身に着けている/g,'所穿戴的').replace(/がついている/g,'附有').replace(/が付いている/g,'附有');
 s=s.replace(/次のターン終了まで/g,'直到下回合結束').replace(/所持している/g,'持有的');
 s=s.replace(pattern,x=>lex.get(x));
 s=tw(s);
 return s.replace(/\uE100([\s\S])\uE101/g,(_,c)=>protectedParts[c.charCodeAt(0)-0xE200]);
}
const out={};for(const task of tasks)out[task.key]=translate(task.key);
const splitParts=source=>{
 const ex=source.match(/^(.*?)(EXスキル[\s\S]*?[：:])([\s\S]*)$/);
 if(ex){const effect=approvedEffect(ex[3]);if(effect)return {flavor:ex[1],tail:translate(ex[2])+effect};}
 for(const m of source.matchAll(/。/g)){const suffix=source.slice(m.index+1);const effect=approvedEffect(suffix);if(effect)return {flavor:source.slice(0,m.index+1),tail:effect};}
 return {flavor:source,tail:''};
};
const parentSet=new Set(fs.readFileSync(new URL('accessory_foods.parent.pending.jsonl',base),'utf8').trim().split('\n').map(x=>JSON.parse(x).key));
const work=tasks.filter(x=>!parentSet.has(x.key)&&!x.references.some(r=>r.table==='MFoods')&&!x.key.includes('との絆を示すペアネックレス。')).map((x,i)=>({i,key:x.key,...splitParts(x.key)}));
fs.writeFileSync(new URL('accessory_foods.work.parts.json',base),JSON.stringify(work,null,2)+'\n');
const pairNames=new Set();
for(const task of tasks){
 const pair=task.key.match(/^(.*?)との絆を示すペアネックレス。絆の力で被ダメージ(\{\d+\})％軽減。(.*?)専用アクセサリー$/s);
 if(pair){const label=n=>{if(lex.has(n)&&!/[ぁ-ゖァ-ヺ]/.test(lex.get(n)))return lex.get(n);pairNames.add(n);return '「'+n+'」';};out[task.key]='象徵與'+label(pair[1])+'羈絆的成對項鍊。藉由羈絆之力，所受傷害減輕'+pair[2]+'％。'+label(pair[3])+'專用飾品';continue;}
 const ex=task.key.match(/^(.*?)(EXスキル[\s\S]*?[：:])([\s\S]*)$/);
 if(ex){const effect=approvedEffect(ex[3]);if(effect)out[task.key]=translate(ex[1]+ex[2])+effect;}
 else{for(const m of task.key.matchAll(/。/g)){const suffix=task.key.slice(m.index+1);const effect=approvedEffect(suffix);if(effect){out[task.key]=translate(task.key.slice(0,m.index+1))+effect;break;}}}
}
for(const ja of pairNames)glossary.push({ja,zhTW:ja,preserve:true,reason:'新增飾品描述明確標示的專用角色名稱；譯文以引號標示原名，避免混淆裝備限制。'});
for(const ja of inferredNames)glossary.push({ja,zhTW:ja,preserve:true,reason:'新增飾品描述明確指定的變身角色或力量來源角色名稱；譯文以引號標示原名。'});
const foods=tasks.filter(x=>x.references.some(r=>r.table==='MFoods'));
const foodTranslations=read('accessory_foods.foods.json');
if(foods.length!==foodTranslations.length)throw new Error('Foods count mismatch');
foods.forEach((x,i)=>out[x.key]=foodTranslations[i]);
if(fs.existsSync(new URL('accessory_foods.manual.json',base)))Object.assign(out,read('accessory_foods.manual.json'));
if(fs.existsSync(new URL('accessory_foods.parent.translations.json',base)))Object.assign(out,read('accessory_foods.parent.translations.json'));
if(fs.existsSync(new URL('accessory_foods.parent2.translations.json',base)))Object.assign(out,read('accessory_foods.parent2.translations.json'));
if(fs.existsSync(new URL('accessory_foods.parent3.translations.json',base)))Object.assign(out,read('accessory_foods.parent3.translations.json'));
for(const name of ['accessory_foods.parent.glossary.json','accessory_foods.parent2.glossary.json','accessory_foods.parent3.glossary.json'])if(fs.existsSync(new URL(name,base)))glossary.push(...read(name));
for(const [ja,zhTW]of Object.entries(canonicalNames))if(!approvedMap.has(ja))glossary.push({ja,zhTW,note:'沿用本機劇情核准人名與術語對照。'});
for(const ja of ['【カ】','【キ】','【ク】','【ケ】'])glossary.push({ja,zhTW:ja,preserve:true,reason:'飾品內謎題的選項識別標籤；選項敘述已完整翻譯，標籤須保留以便對照答案。'});
for(const ja of ['「オ」','グリーンフラッシュ','才色兼備なお嬢様','ヤリマ記念','ガトー・アマトリート','BARハーフカマ―','ソザハーフ姉さん'])glossary.push({ja,zhTW:ja,preserve:true,reason:'來源描述明確指定的刻字、道具名稱、EX技能名稱、賽事、店名或變身角色名；譯文以引號保留完整引用名稱。'});
const quoteCanonicalMap=new Map([...Object.entries(canonicalNames),...Object.entries(baseNames),...approved.filter(x=>!x.preserve).map(x=>[x.ja,x.zhTW])]);
const quotedApproved = new RegExp('(["”「『])('+[...quoteCanonicalMap.keys()].filter(x=>/[ぁ-ゖァ-ヺ]/.test(x)).sort((a,b)=>b.length-a.length).map(escape).join('|')+')(["”」』])','g');
const aliases = new Map([
 ['畢宿五','阿爾迪巴蘭'],['心宿二','安塔蕾絲'],['虛宿一','莎達爾蘇德'],['薩瑪卡','莎瑪卡'],['恰伊姆','鐘聲'],['波魯克斯','波路克斯'],['維茱','毗濕奴'],['奧爾帕瓦','全能力強化'],['奧爾大量採購','歐爾大量採購'],['普莉奧爾','普利歐爾'],
 ['咖啡賈','カフェジャ'],['謎兔','ミスラビ'],['戀確','コイカク'],['療癒兔','レリバニ'],['娑羅室伐底','辯才天女'],['「スラワーティー」','辯才天女'],['奧爾丁','歐魯丁'],['薇爾赫米娜','威爾赫米娜'],['天宮製作','天霧製作'],['梅娜裘','梅納裘'],['薩甘','撒共'],['愛意蛋糕坊','ガトー・アマトリート'],['仮裝にとける愛嬌羊','仮装にとける愛嬌羊']
]);
for(const key of Object.keys(out)){
 out[key]=out[key].replace(/(\{\d+\}倍)變為/g,'$1').replace(/恢復魔力/g,'回復魔力').replace(quotedApproved,(_,a,n,b)=>a+quoteCanonicalMap.get(n)+b);
 for(const [before,after]of aliases)out[key]=out[key].replaceAll(before,after);
 for(const [before,after]of canonicalAliases)out[key]=out[key].replaceAll(before,after);
 out[key]=out[key].replace(/HP低於(\{\d+\})%時防禦力提升/g,'HP為$1%以下時防禦力提升').replace(/専用飾品/g,'專用飾品');
 out[key]=out[key].replace(/採用可穿戴的構造，([^。]+?)騎士團團長也能完全扮成該角色/g,'採用可穿戴的構造，也能完全扮成$1騎士團團長');
}
const grammarTerms=new Set(['を防ぐ','防ぐ','し、','する','になる','によって','による','の効果','の間','を付与','時に','確率で','高確率で','低確率で','つにつき','めちゃくちゃ','なくてはならない']);
const sourceCorpus=tasks.map(x=>[x.key,...x.examples].join('\n')).join('\n');
const targetCorpus=Object.values(out).join('\n');
const finalGlossaryMap=new Map();
for(const entry of glossary){
 if(approvedMap.has(entry.ja)||!entry.zhTW||grammarTerms.has(entry.ja)||/[\uE000-\uF8FF]/.test(entry.ja))continue;
 if(!sourceCorpus.includes(entry.ja))continue;
 if(entry.preserve&&!targetCorpus.includes(entry.ja))continue;
 if(!entry.preserve&&!targetCorpus.includes(entry.zhTW))continue;
 finalGlossaryMap.set(entry.ja,entry);
}
const finalGlossary=[...finalGlossaryMap.values()];
fs.writeFileSync(new URL('accessory_foods.translations.json',base),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(new URL('accessory_foods.glossary.json',base),JSON.stringify(finalGlossary,null,2)+'\n');
let residual=[];
const allowedPattern=new RegExp([...approved,...finalGlossary].filter(x=>x.preserve).map(x=>x.ja).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
for(const [key,value] of Object.entries(out)) {const cleaned=value.replace(allowedPattern,'');if(/[ぁ-ゖァ-ヺ]/.test(cleaned))residual.push({key,value});}
fs.writeFileSync(new URL('accessory_foods.residual.jsonl',base),residual.map(JSON.stringify).join('\n')+'\n');
console.log(JSON.stringify({tasks:tasks.length,residual:residual.length,protectedNames:protectedNames.size}));
