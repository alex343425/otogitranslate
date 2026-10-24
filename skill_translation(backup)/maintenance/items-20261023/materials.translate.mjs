import fs from 'node:fs';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const tasks = fs.readFileSync(path.join(dir, 'materials.pending.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const root = path.resolve(dir, '../..');
// Snapshot of the existing approved story dictionary, overridden by the skill
// names dictionary. Kept locally so compilation never requires another checkout.
const names = JSON.parse(fs.readFileSync(path.join(dir, 'materials.names.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(root, 'translations/glossary.json'), 'utf8'));
const added = new Map();
const extras = {
  'アビリティ':'能力','ピース':'碎片','メダル':'勳章','アイテム':'道具','カチューシャ':'髮箍','ターバン':'頭巾','ショルダーアーマー':'肩甲','護装':'護裝','リボン':'緞帶','髪飾り':'髮飾','ペンダント':'墜飾','バレッタ':'髮夾','ベルト':'腰帶','ネックレス':'項鍊','お面':'面具','カップ':'杯子','チョーカー':'頸圈','ベレー帽':'貝雷帽','コイン':'硬幣','パンダ':'熊貓','ハット':'帽子','双眼鏡':'望遠鏡','ガラスの靴':'玻璃鞋','コンパクト':'粉餅盒','魔女帽子':'魔女帽','ジャケット':'外套','マント':'披風','ヘルメット':'頭盔','魔術道具':'魔術道具','バラ':'玫瑰','キャンディ':'糖果','マスク':'面罩','ティアラ':'后冠','クラウン':'王冠','コサージュ':'胸花','バッグ':'手提包','花びら':'花瓣','とても希少な遺物':'極稀有的遺物','小さな遺物':'小型遺物','大きな遺物':'大型遺物','平額':'額飾','数珠':'念珠','サンバイザー':'遮陽帽','オーブ':'寶珠','帽子':'帽子','角':'角','素材':'素材','王冠':'王冠','冠':'冠','花冠':'花冠','爆弾':'炸彈','扇':'扇子','秘薬':'秘藥','夢魔':'夢魔','制帽':'制服帽','人形':'人偶','羽':'羽毛','鍵':'鑰匙','腕輪':'手環','飾り':'飾物','豪華な花':'華麗的花','宝珠':'寶珠','遺物':'遺物','強力な':'強力的',
  'パーカー':'連帽衫','Tシャツ':'T恤','ウサギ':'兔子','エリート':'菁英','かき氷':'刨冰','バースデー':'生日','ジャージ':'運動服','マッスル':'肌肉','サクラ':'櫻花','ジャズ':'爵士樂','ショーワ':'昭和','ハーフ':'半周年','チャラ男':'輕浮男','ニャー':'喵','走り屋':'飆車族','ペイン':'苦痛','パレード':'遊行','ホラーメイク':'恐怖妝容','ルーキー監督':'新人導演','ルーキー':'新人','夏休み':'暑假','パパ':'爸爸','どうしよう':'怎麼辦','ダメ友':'廢友','あんどろいど':'機器人','うみんちゅ':'海人','レジェンド':'傳說','ちょい悪':'小壞蛋','ハンター':'獵人','意識高い系':'高意識派','水着':'泳裝','ハロウィン':'萬聖節','正月':'新年','花嫁':'新娘','ウィッチ':'魔女','バレンタイン':'情人節','バニー':'兔女郎','猫カフェ':'貓咪咖啡廳','サマー☆バカンス':'夏日☆假期','パジャマ':'睡衣','踊り子':'舞孃','ぐったり':'虛脫','テニス':'網球','ひな祭り':'女兒節','学生服':'學生服','リメイク':'重製','マジシャン':'魔術師','ハイプリーステス':'女祭司','ヒエロファント':'教皇','ストレングス':'力量','エンプレス':'女皇','エンペラー':'皇帝','ハーミット':'隱者','フール':'愚者','ハングドマン':'吊人','ジャスティス':'正義','チャリオット':'戰車','デビル':'惡魔','タワー':'高塔','デス':'死神','スター':'星星','ムーン':'月亮','サン':'太陽','ジャッジメント':'審判','ワールド':'世界','ラバーズ':'戀人','テンパランス':'節制','ホイールオブフォーチュン':'命運之輪',
};
Object.assign(extras, {
  '関羽':'關羽','映画祭':'影展','歌合戦':'歌唱大賽','温泉':'溫泉',
  '吊男':'倒吊人','法皇':'教皇','女教皇':'女祭司','実行委員':'執行委員','錬金術':'鍊金術',
  'Androidかかし':'Android稻草人','かき氷屋の':'刨冰店的','代目':'代店主',
  '意識高い系の部族':'高意識派部族','ホラーメイクをした':'化著恐怖妝容的','水着ギャル':'泳裝辣妹','黒タイツ':'黑色褲襪',
  'ウェディング':'婚禮','シーフ':'盜賊','フラワーフェス':'花卉祭','モンク':'武鬥家','りんご姫':'蘋果公主','かぼガール':'南瓜女孩','アンチェインド':'解放',
  'オタク':'宅迷','アイドル':'偶像','ポリス':'警察','ソーサラー':'魔法師','パティシエ':'糕點師','いつもの衣装':'平常服裝','マーメイド':'美人魚',
  'チアリーダー':'啦啦隊','チア部':'啦啦隊社','サバイバル':'求生','イースター':'復活節','カバディ':'卡巴迪','マネージャー':'經理',
  '闇纏し死神':'纏闇死神','お雛様':'女雛','ドルオタ':'偶像迷','ガンナー':'槍手','ワンダーナイト':'奇幻之夜','パーティードレス':'宴會禮服',
  'スパイ学園':'間諜學園','テイマー':'馴獸師','ソフトボール':'壘球','ヴァンパイア':'吸血鬼','お内裏様':'男雛','バスケ':'籃球',
});
const lexical = new Map([...Object.entries(names), ...glossary.filter(x=>!x.preserve).map(x=>[x.ja,x.zhTW]), ...Object.entries(extras)]);
const lexKeys=[...lexical.keys()].sort((a,b)=>b.length-a.length);
// A generic material such as 羽 becomes 羽毛, but must never expand a character
// name such as 関羽. Bare single-character material nouns are object-only terms.
const properLexKeys=lexKeys.filter(key=>!['羽','鍵','扇'].includes(key));
const kanji={'黒':'黑','盗':'盜','桜':'櫻','姫':'姬','亀':'龜','学':'學','静':'靜','気':'氣','凛':'凜','沢':'澤','浜':'濱','斎':'齋','隠':'隱','戦':'戰','剣':'劍','覚':'覺','専':'專','竜':'龍','体':'體','当':'當','会':'會','図':'圖','増':'增','変':'變','与':'與','収':'收','実':'實','処':'處','団':'團','辺':'邊','済':'濟','広':'廣','対':'對','楽':'樂','歓':'歡','伝':'傳','鉄':'鐵','徳':'德','発':'發','闘':'鬥','効':'效','栄':'榮','緑':'綠','万':'萬','亜':'亞','仏':'佛','児':'兒','仮':'假','倶':'俱','両':'兩','円':'圓','壱':'壹','参':'參','圧':'壓','塩':'鹽','声':'聲','売':'賣','帰':'歸','徴':'徵','悪':'惡','恋':'戀','恵':'惠','抜':'拔','挙':'舉','揺':'搖','斉':'齊','昼':'晝','晩':'晚','暁':'曉','条':'條','査':'查','様':'樣','残':'殘','浅':'淺','温':'溫','満':'滿','灯':'燈','点':'點','獣':'獸','画':'畫','礼':'禮','称':'稱','税':'稅','穏':'穩','絵':'繪','繋':'繫','続':'續','総':'總','練':'練','縁':'緣','脳':'腦','臓':'臟','薬':'藥','衆':'眾','装':'裝','観':'觀','説':'說','読':'讀','豊':'豐','賛':'贊','転':'轉','軽':'輕','録':'錄','銭':'錢','鎮':'鎮','関':'關','陣':'陣','険':'險','隣':'鄰','霊':'靈','髪':'髮','内':'內','戸':'戶'};
function subst(text,isProper=false){let out='';const keys=isProper?properLexKeys:lexKeys;for(let i=0;i<text.length;){const k=keys.find(k=>text.startsWith(k,i));if(k){out+=lexical.get(k);i+=k.length;}else out+=text[i++];}return [...out].map(c=>c==='乱'?'亂':kanji[c]??c).join('');}
const kana=/[ぁ-ゖァ-ヺ]/u;
function proper(source, reason='MMaterials 描述明確引用的角色或敵人名稱；尚無核准譯名，保留來源完整名稱。'){
  let zh=subst(source,true);
  if(kana.test(zh)){
    added.set(source,{ja:source,zhTW:source,preserve:true,reason});
    return `「${source}」`;
  }
  return zh;
}
function object(source){
  const zh=subst(source);
  if(kana.test(zh)) throw new Error('Untranslated object: '+source+' => '+zh);
  return zh;
}
const manualFile=path.join(dir,'materials.manual.json');
const manual=fs.existsSync(manualFile)?JSON.parse(fs.readFileSync(manualFile,'utf8')):{};
const result={};const todo=[];
for(const task of tasks){
 const s=task.key;let m,v=manual[s];
 if(v===undefined){
 if(m=s.match(/^(\{0\})枚で(.+)のアビリティを創造することができるメダル$/)) v=`可用${m[1]}枚創造${proper(m[2])}的能力的勳章`;
 else if(m=s.match(/^(.+?)の(心(?:の心)?|魂)(\([光闇樹水攻魔]\))?が封じられた魔石$/))v=`封印了${proper(m[1])}的${m[2]==='魂'?'靈魂':m[2]==='心の心'?'心之心':'心'}${m[3]||''}的魔石`;
 else if(m=s.match(/^(.+)の真の力を解放するためのピース$/))v=`用於解放${proper(m[1])}的真正力量的碎片`;
 else if(m=s.match(/^(.+)の進化に必要な(.+)$/)) { try {v=`${proper(m[1])}進化所需的${object(m[2])}`;} catch {} }
 else if(m=s.match(/^(.+)の限界突破に必要な(.+)$/))v=`${proper(m[1])}突破極限所需的${object(m[2])}`;
 else if(m=s.match(/^(.+)の専用武器覚醒に必要な(.+)$/))v=`${proper(m[1])}專用武器覺醒所需的${object(m[2])}`;
 else if(m=s.match(/^(.+)が落とした「(.+)の証」$/))v=`${proper(m[1])}掉落的「${proper(m[2], 'MMaterials 描述明確引用的證物名稱；原詞為角色或敵人專名，保留來源完整名稱。')}之證」`.replaceAll('「「','「').replaceAll('」之證」','之證」');
 else if(m=s.match(/^(.+)の頭から落ちた「(.+)」$/))v=`從${proper(m[1])}頭上掉落的「${proper(m[2], 'MMaterials 描述明確引用的證物專名，保留來源完整名稱。')}」`.replaceAll('「「','「').replaceAll('」」','」');
 else if(m=s.match(/^(.+)の心核の欠片$/))v=`${proper(m[1])}的心核碎片`;
 }
 if(v===undefined)todo.push(s); else {
   // Existing approved complete names take precedence over a new keep-original note.
   for(const term of glossary.filter(item=>!item.preserve && ['アルター・ヴェルメリオ','アルター・シンデレラ','アルター・ティンカ','アルター・ドロシー','アルター・アドルファ','アルター・ウェンディ','アルター・プリシラ','アルター・レーウ','オルパワー'].includes(item.ja)))v=v.split(term.ja).join(term.zhTW);
   v=v.replaceAll('亞特・維爾梅里奧バレンタイン','亞特・維爾梅里奧情人節').replaceAll('阿爾塔・桃樂絲バニー','阿爾塔・桃樂絲兔女郎');
   result[s]=v;
 }
}
for(const ja of ['オルスロー','オルパワー','オルプロト','オルマジック','オルリカバマジク','ソザイン幸代','ソザイン','ソザイン工石','ジメリ','レガメ','デンデン','メタルデンデン','ラブキュピ','ディマイトスティロ','トラジティアックス','ペインドールアックス','賽子π・スラッシュ','双剣マナ・イタ','心槍ケル・ナグル','聖水カン・パーイ','必殺料理デカ・パイ','溶刀イラクサ']) {
  added.set(ja,{ja,zhTW:ja,preserve:true,reason:'MMaterials 背景敘述中明確引用的組織、人物或裝備專名；以引號標示來源名稱。'});
}
added.set('くらりもいと',{ja:'くらりもいと',zhTW:'くらりもいと',preserve:true,reason:'證物筆記中的假名解謎結果字串；翻譯會破壞題目的字母對應。'});
added.set('マ{0}　ラ{1}　ア{2}　ー　タ{3}　ァ{4}',{ja:'マ{0}　ラ{1}　ア{2}　ー　タ{3}　ァ{4}',zhTW:'マ{0}　ラ{1}　ア{2}　ー　タ{3}　ァ{4}',preserve:true,reason:'證物筆記中的片假名與數字解謎字串；保留各字元及參數位置才能維持題目。'});
// List concrete source instances as well as maintained templates. Runtime validation
// operates on real row.d strings, so a version such as 2026 must match exactly.
const state=JSON.parse(fs.readFileSync(path.join(root,'source/current.json'),'utf8'));
const byTable=new Map(Object.entries(state.tables).filter(([table])=>table!=='MSkillMutationData').map(([table,meta])=>[table,new Map(JSON.parse(fs.readFileSync(path.join(root,meta.file),'utf8')).map(r=>[r.id,r]))]));
for(const entry of [...added.values()].filter(e=>/\{\d+\}/.test(e.ja))){
 for(const task of tasks.filter(t=>result[t.key]?.includes(entry.ja))){
  for(const ref of task.references){
   const values=(byTable.get(ref.table).get(ref.id)?.d.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g)||[]);
   const ja=entry.ja.replace(/\{(\d+)\}/g,(_,i)=>values[Number(i)]??`{${i}}`);
   if(!/\{\d+\}/.test(ja))added.set(ja,{...entry,ja,zhTW:ja,reason:entry.reason+' 對應目前來源快照的完整數值實例。'});
  }
 }
}
for(const [ja,zhTW] of [['アビリティ','能力'],['ピース','碎片'],['メダル','勳章'],['心核','心核'],['カチューシャ','髮箍'],['バレッタ','髮夾'],['コサージュ','胸花'],['サンバイザー','遮陽帽'],['映画祭','影展'],['歌合戦','歌唱大賽']]) {
  if(!glossary.some(entry=>entry.ja===ja))added.set(ja,{ja,zhTW});
}
for(const entry of glossary)if(!entry.preserve && added.has(entry.ja))added.delete(entry.ja);
// New shared lore terms agreed across the material and accessory batches.
for(const [ja,zhTW] of Object.entries({'デンデン':'蝸蝸','メタルデンデン':'金屬蝸蝸','ソザイン':'素材因','ソザイン幸代':'素材因幸代','ソザイン工石':'素材因工石','オルスロー':'奧爾斯洛','オルプロト':'奧爾普洛托','オルマジック':'奧爾瑪吉克','オルリカバマジク':'奧爾莉卡巴瑪吉克'})){
 const canonical=ja.startsWith('オル')&&names[ja]?names[ja]:zhTW;
 for(const key of Object.keys(result))result[key]=result[key].split('「'+ja+'」').join(canonical);
 added.set(ja,{ja,zhTW:canonical,note:'2026-10-24 物品描述批次統一的新用語；既有完整字典對照優先。'});
}
fs.writeFileSync(path.join(dir,'materials.translations.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(dir,'materials.glossary.json'),JSON.stringify([...added.values()],null,2)+'\n');
fs.writeFileSync(path.join(dir,'materials.todo.json'),JSON.stringify(todo,null,2)+'\n');
console.log(JSON.stringify({total:tasks.length,done:Object.keys(result).length,todo:todo.length,preserved:[...added.values()].filter(e=>e.preserve).length,terms:[...added.values()].filter(e=>!e.preserve).length}));
