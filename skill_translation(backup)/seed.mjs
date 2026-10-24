/** First-release corpus compiler. Never called by sync/build: new wording stays pending. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenCC from 'opencc-js';
import { DEFAULT_ROOT as root, loadCurrent, core, writeJson, atomicWrite, hash } from './manage.mjs';
if (!process.argv.includes('--rebuild-first-release')) throw new Error('First-release compiler is locked. For normal updates use manage.mjs sync, edit translations, then build/check.');

const traditional = OpenCC.Converter({ from: 'cn', to: 'tw' });
const pairs = `
スキルコンティニュー	技能延續
エンチャントデバフムーブ	附魔減益轉移
エンチャントドレイン	附魔吸取
エンチャントスタン	附魔暈眩
チェインスキルゲージ	連鎖技能量表
攻撃魔法スキル	攻擊魔法技能
攻撃スキル	攻擊技能
特殊スキル	特殊技能
補助スキル	輔助技能
パラメーターダウン	能力值降低
パラメータダウン	能力值降低
パラメータアップ	能力值提升
クリティカルダメージ	暴擊傷害
スキルリフレクト	技能反射
スキルダメージ	技能傷害
スキルカウンター	技能反擊
アイテムドロップ率	道具掉落率
アイテムドロップ	道具掉落
アイテムスティール	道具竊取
ディスペルバリア	增益消除屏障
ドレインバリア	增益吸取屏障
カットシールド	減傷護盾
チェインダメージ	連鎖傷害
バフドレイン	增益吸取
デバフムーブ	減益轉移
トリプルアタック	三連擊
ドロップブースト	掉落強化
パーツブレイク	部位破壞
パーティメンバー	隊伍成員
キャラバトル	角色戰鬥
フェルディナバースト	費爾蒂娜爆發
ラディカルマジック	魔法激化
ラディカルパワー	力量激化
ラディカルテクニク	技巧激化
リベレイトマジック	魔法解放
リベレイトパワー	力量解放
リベレイトテクニク	技巧解放
ディマイトデバフ	迪瑪イト減益
コラボパワー	合作力量
チェインスキル	連鎖技能
ゲージアップ	量表增加
ゲージダウン	量表減少
クリティカル	暴擊
リフレッシュ	淨化
パラメーター	能力值
パラメータ	能力值
ステータス	能力值
リフレクト	反射
リベンジ	復仇
リヒール	持續恢復
ワンフォーオール	全員為一
エンチャント	附魔
ユニゾン	聯合戰
ユニークスキル	專屬技能
サブスキル	副技能
スキルレベル	技能等級
クールタイム	冷卻時間
スキルダメ	技能傷害
ダメージカット	傷害減免
ダメージアップ	傷害提升
ダメージダウン	傷害降低
ダメージ	傷害
リーダー	隊長
フォロワー	追蹤者
プレイヤー	玩家
パッシブ	被動
パーティ	隊伍
メンバー	成員
スタン	暈眩
シールド	護盾
バリア	屏障
カウンター	反擊
チャージ	充填
クエスト	關卡
ゲージ	量表
アイテム	道具
ゴールド	金幣
ランダム	隨機
コピー	複製
リセット	重置
バトル	戰鬥
キャラ	角色
スキル	技能
ベース	基礎
ターン	回合
デバフ	減益
バフ	增益
アップ	提升
ダウン	降低
アディション	追加
ドレイン	吸取
ドーピング	強化
レジスト	抵抗
レイド	團隊戰
パワー	力量
テクニック	技巧
テンション	情緒
コンボ	連擊
スピード	速度
オーラ	光環
リリース	釋放
サポート	支援
ソウルサウンド	靈魂之音
イマジナリー	想像
イリュージョン	幻象
フィールド	領域
コンフューズ	混亂
カース	詛咒
ペイン	痛苦
ビジョン	幻象
ヴェノム	劇毒
メディカルチェック	健康檢查
タレントサポート	才能支援
ビルドアップ	體能強化
オルパワー	全能力強化
状態異常耐性	狀態異常抗性
状態異常	狀態異常
全属性耐性	全屬性抗性
属性耐性	屬性抗性
全パラメータ	全能力值
全能力	全能力
攻撃魔力	攻擊魔力
回復魔力	恢復魔力
攻撃力	攻擊力
防御力	防禦力
すばやさ	速度
最大HP	最大HP
確定	必定
確実	必定
必ず	必定
超低確率	極低機率
ごく稀	極低機率
極稀	極低機率
極低確率	極低機率
低確率	低機率
超高確率	極高機率
高確率	高機率
中確率	中等機率
確率	機率
僅少UP	微量提升
僅少	微量
ほんの少し	微量
ごくわずか	微量
わずか	微量
極大幅	極大幅
大幅	大幅
少し	小幅
大きく	大幅
大回復	大幅恢復
小回復	小幅恢復
全回復	完全恢復
回復	恢復
超変化	超變化
変化	變化
限界突破	突破上限
限突	突破上限
無属性	無屬性
火属性	火屬性
水属性	水屬性
樹属性	樹屬性
光属性	光屬性
闇属性	闇屬性
全属性	全屬性
攻撃対象	攻擊目標
味方自分以外	除自身外的我方
味方全員	我方全體
味方全体	我方全體
味方単体	我方單體
敵単体	敵方單體
敵全体	敵方全體
敵全員	敵方全體
味方	我方
敵陣	敵方
仲間	同伴
自身	自身
自分	自身
全員	全體
全体	全體
全て	全部
すべて	全部
特殊効果	特殊效果
有利効果	有利效果
不利効果	不利效果
追加効果	附加效果
効果	效果
被ダメージ	所受傷害
与ダメージ	造成傷害
通常攻撃	普通攻擊
魔法攻撃	魔法攻擊
魔法追撃	魔法追擊
攻撃	攻擊
追撃	追擊
耐性	抗性
付与	賦予
無効	無效
吸収	吸收
貫通	貫穿
減少	減少
増加	增加
軽減	減輕
上昇	提升
低下	降低
消去	消除
発動	發動
使用	使用
開始	開始
終了	結束
対象	目標
単体	單體
経験値	經驗值
獲得	獲得
複製	複製
追加	追加
変身	變身
変換	轉換
解除	解除
持続	持續
復活	復活
気絶	昏厥
猛毒	猛毒
毒	毒
麻痺	麻痺
金縛り	定身
封印	封印
睡眠	睡眠
眠り	睡眠
呪い	詛咒
幻惑	幻惑
混乱	混亂
凍結	凍結
石化	石化
魅了	魅惑
恐怖	恐懼
進撃	進擊
精霊	精靈
剣	劍
斧	斧
槍	槍
短剣	短劍
本	書
杖	杖
弓	弓
武器	武器
装備	裝備
覚醒	覺醒
覚悟	覺悟
必殺	必殺
連続	連續
連携	連攜
刻印	刻印
極印	極印
上限	上限
下限	下限
最大	最大
最低	最低
最小	最小
永続	永久
永続的	永久
無限	無限
一度	一次
一回	一次
一部	部分
一定	一定
確保	確保
残り	剩餘
復帰	回歸
部位	部位
破壊	破壞
盾	盾
再生	再生
吸引	吸引
蘇生	復活
回避	迴避
命中	命中
致死	致死
死亡	死亡
戦闘不能	無法戰鬥
戦闘	戰鬥
行動不能	無法行動
行動	行動
阻害	阻礙
妨害	妨礙
失敗	失敗
成功	成功
現在	目前
割合	比例
継続	持續
反射	反射
攻魔	攻擊魔力
防御	防禦
無条件	無條件
条件	條件
威力	威力
経過	經過
経過時	經過時
蓄積	累積
超過	超過
変動	變動
半分	一半
半減	減半
倍増	加倍
倍化	變為兩倍
絶大	極大
絶対	絕對
支援	支援
補助	輔助
所有	持有
所持	持有
装備者	裝備者
装備中	裝備中
種類	種類
属性	屬性
属性相性	屬性相剋
相性	相剋
得意武器	擅長武器
得意	擅長
全快	完全恢復
回数	次數
発生	發生
獲れる	可獲得
条件下	條件下
人数	人數
対象者	目標
全滅	全滅
反撃	反擊
強化	強化
耐える	承受
HPが満タン	HP全滿
満タン	全滿
CT満タン	CT全滿
ダブル	雙重
UP	提升
DOWN	降低
`;
const lexicon = new Map(pairs.trim().split('\n').filter(Boolean).map(line => line.split('\t')));
lexicon.delete('本'); // Weapon-book terminology is contextual; 本回合 must stay 本回合.
lexicon.delete('全ステ'); // Do not consume the prefix of 全ステータス.
const characterNames = await fs.readFile(path.join(root, 'translations/names.json'), 'utf8').then(JSON.parse).catch(() => ({}));
for (const [ja, zh] of Object.entries(characterNames)) if (!lexicon.has(ja)) lexicon.set(ja, zh);
const extension = await fs.readFile(path.join(root, 'translations/lexicon.extra.tsv'), 'utf8').catch(() => '');
for (const line of extension.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'))) {
    const [source, target] = line.split('\t'); if (target === undefined) throw new Error('Invalid lexicon line: ' + line);
    lexicon.set(source, target);
}
lexicon.delete('全ステ');
const words = [...lexicon.keys()].sort((a, b) => b.length - a.length);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = new RegExp(words.map(escape).join('|'), 'g');
const earlyWords = words.filter(word => /[ぁ-ゖ]/.test(word) && word.length >= 5);
const earlyPattern = new RegExp(earlyWords.map(escape).join('|'), 'g');
const { tables, manifest } = await loadCurrent(root);
const sourceLock = JSON.parse(await fs.readFile(path.join(root, 'translations/first-release-sources.json'), 'utf8'));
if (Object.entries(sourceLock).some(([table, digest]) => manifest.tables[table].sha256 !== digest)) throw new Error('First-release compiler refuses a different source snapshot. Translate new wording through pending.jsonl.');
const rows = ['MSkills', 'MMutationSkills'].flatMap(table => tables[table].map(row => ({ table, ...row })));
const names = new Set(rows.map(row => row.n));
const manual = await fs.readFile(path.join(root, 'translations/manual.zh-TW.json'), 'utf8').then(JSON.parse).catch(() => ({}));
const cleanup = await fs.readFile(path.join(root, 'translations/flavor-cleanup.json'), 'utf8').then(JSON.parse).catch(() => ({}));
const pos = '\\{\\d+\\}';
const numeral = new RegExp('(' + pos + ')(回(?!合)|個|体|人|つ)', 'g');
const adjective = '(?:ほんの少し|少し|大きく|大幅に|ごく僅かに|僅かに|微量|大幅|極大幅)?';
function render(source) {
    if (Object.hasOwn(manual, source)) return manual[source];
    const protectedParts = [];
    const protect = text => '\uE100' + String.fromCharCode(0xE200 + protectedParts.push(text) - 1) + '\uE101';
    let s = source.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => names.has(a ?? b ?? c) ? protect(all) : all);
    s = s.replace(/EXスキル("[^"]+")/g, (_, name) => 'EXスキル' + protect(name));
    s = s.replace(/ダメ\\nージ/g, 'ダメージ').replace(/\\n/g, '\uE110');
    s = s.replace(/もしくは|または/g, '或');
    s = s.replace(new RegExp('威力(' + pos + ')[%％]で', 'g'), '威力$1％的');
    s = s.replace(/(自身|対象|敵|味方)が(封印|猛毒|毒|麻痺|混乱|幻惑|眠り)の状態異常になる/g, '使$1陷入$2狀態');
    s = s.replace(/(自身|対象|敵|味方)が(封印|猛毒|毒|麻痺|混乱|幻惑|眠り)の状態異常になり/g, '使$1陷入$2狀態並');
    s = s.replace(new RegExp('所持している(《[^》]+》)バフ(' + pos + ')(?:つ|個)につき', 'g'), '每持有$2個$1增益');
    s = s.replace(new RegExp('([^。・、：:(（或\\r\\n\uE110]+?)を(' + pos + ')回付与する度(?:に)?', 'g'), '每賦予$1$2次時');
    s = s.replace(/付与する度(?:に)?/g, '每次賦予時');
    s = s.replace(/付与されたとき時|付与されたとき/g, '被賦予時').replace(/自分にも/g, '自身也');
    s = s.replace(/そこの?に|そこに/g, '在此基礎上').replace(/複製し(?!た)/g, '複製並').replace(/みかた/g, '我方');
    s = s.replace(/ダメ\s+ージ/g, 'ダメージ').replace(/びび＆ねむりんご/g, '恐懼蘋果＆睡眠蘋果');
    s = s.replace(/防ぐ/g, '防止').replace(/躱すようになる/g, '可以閃避').replace(/それぞれ得る/g, '各自獲得');
    s = s.replace(/どんぐりの変わりに/g, '取代橡實').replace(/も一緒に食べる/g, '也一起吞掉').replace(/全部食べる/g, '全部吞掉');
    s = s.replace(/オタク化/g, '宅化').replace(/超極々稀に/g, '極其罕見地').replace(/本キャラ/g, '書角色').replace(/・本・/g, '・書・');
    s = s.replace(earlyPattern, word => lexicon.get(word));
    s = s.replace(/複製した場合/g, '複製時').replace(/その際に/g, '此時');
    s = s.replace(/なくなるごとに/g, '每次減少時').replace(/少なくなる/g, '減少').replace(/だけ/g, '限定');
    s = s.replace(/気絶するほどのダメージをうけても/g, '即使受到足以致命的傷害').replace(/もう/g, '再');
    s = s.replace(/蓄積した/g, '累積的').replace(/動ができない/g, '動無法進行').replace(/ができない/g, '無法進行');
    s = s.replace(/武神化し/g, '武神化並').replace(/部下/g, '部下').replace(/に守護されている/g, '受到守護');
    s = s.replace(/付与される度(?:に)?/g, '每次被賦予時').replace(/付与され/g, '被賦予');
    s = s.replace(/狙われるようになる/g, '會被鎖定').replace(/ピンチになればなるほど|ピンチになるほど/g, '越陷入危機則越');
    s = s.replace(/気絶するほどのダメージを受けても/g, '即使受到足以致命的傷害').replace(/食べると/g, '食用後');
    s = s.replace(/を得て/g, '獲得並').replace(/掴み取る/g, '取得').replace(/もっと/g, '進一步').replace(/を防ぐ/g, '防止');
    s = s.replace(/限界突破し/g, '突破上限並').replace(/防御力低い/g, '防禦力最低的');
    s = s.replace(/なし/g, '無').replace(/を覚ます/g, '解除').replace(/代わりに/g, '作為代價').replace(/しつづける/g, '持續');
    s = s.replace(/受けた際に/g, '受到時').replace(/現れる/g, '出現').replace(/かわす/g, '閃避').replace(/跳ね返す/g, '反射');
    s = s.replace(/の数が少ないほど/g, '數量越少則').replace(/多い/g, '最多的').replace(/少ない/g, '最少的').replace(/どちらも/g, '兩者皆');
    s = s.replace(/受けるとき/g, '受到時').replace(/可能性がある/g, '有可能').replace(/にわたり/g, '期間').replace(/付与され/g, '被賦予');
    s = s.replace(/特殊が加わることで/g, '加入特殊角色後').replace(/が加わることで/g, '加入後').replace(/狙われる/g, '被鎖定');
    s = s.replace(/減少しつづける/g, '持續減少').replace(/少しだけ/g, '小幅').replace(/毎ウェーブ/g, '每波');
    s = s.replace(/開始し/g, '開始並').replace(/削減され/g, '削減').replace(/魔神化し/g, '魔神化並');
    s = s.replace(/を伴う/g, '伴隨').replace(/とき/g, '時').replace(/そして/g, '並且').replace(/狙われやすくなるが/g, '更容易被鎖定但');
    s = s.replace(/増加した/g, '已增加的').replace(/まで気絶/g, '次上限昏厥').replace(/枚貼る/g, '層展開');
    s = s.replace(/極々稀に/g, '極罕見地').replace(/装備すると/g, '裝備時').replace(/なりきり/g, '完全扮成');
    s = s.replace(/再チャージされる|再チャージされ/g, '重新充填').replace(/増加した状態/g, '已增加的狀態');
    s = s.replace(/上昇して/g, '提升並').replace(/増加して/g, '增加並').replace(/消費して/g, '消耗並');
    s = s.replace(/付与される度に/g, '每次被賦予時').replace(/パーツブレイクされる度に/g, '每次遭受部位破壞時');
    s = s.replace(/倒される度に/g, '每次被擊倒時').replace(/されたとき時|されたとき/g, '受到時');
    s = s.replace(/複製した場合/g, '複製時').replace(/召喚した/g, '召喚的').replace(/使用したとき|使用した時/g, '使用時');
    s = s.replace(/初めて/g, '首次').replace(/毎ターン/g, '每回合').replace(/に付き|につき/g, '每');
    s = s.replace(/打ち消す|打ち消し|消す/g, '消除').replace(/貼る/g, '展開').replace(/怒り/g, '憤怒').replace(/育み/g, '養育');
    s = s.replace(/全ステ(?!ータス)/g, '全能力值').replace(/上昇し続ける|上昇し続け/g, '持續提升');
    s = s.replace(/目覚める/g, '覺醒').replace(/最もHPが高い/g, 'HP最高的').replace(/最も/g, '最').replace(/低い/g, '最低的').replace(/高い/g, '最高的');
    s = s.replace(/を庇ってしまう|を庇う|庇う/g, '代為承受').replace(/移す/g, '轉移').replace(/入れる/g, '賦予');
    s = s.replace(/自身にも/g, '自身也').replace(/自分も/g, '自身也').replace(/含む/g, '包含');
    s = s.replace(/された/g, '受到的');
    s = s.replace(/少なくなる度に/g, '每次減少時').replace(/少ないほど/g, '數量越少則').replace(/高まる/g, '提高');
    s = s.replace(/治す/g, '治癒').replace(/ためる/g, '累積').replace(/溜まった/g, '已累積的').replace(/による/g, '造成的');
    s = s.replace(/度だけ/g, '次限定').replace(/たびに/g, '每次').replace(/かつ/g, '且').replace(/もしくは/g, '或').replace(/もう一つ/g, '再一個');
    s = s.replace(/のような/g, '般的').replace(/自身含む/g, '包含自身');
    s = s.replace(/発動する/g, '發動').replace(/上昇し/g, '提升並').replace(/増加し/g, '增加並').replace(/消費し/g, '消耗並');
    s = s.replace(/踏ん張り|踏ん張る|ふんばり/g, '堅守').replace(/与えて/g, '賦予並').replace(/与える|与え/g, '造成').replace(/できる|でき/g, '可以');
    s = s.replace(/を消す/g, '消除').replace(/を盗む|で盗む/g, '竊取').replace(/撒き散らす/g, '散布').replace(/五つ/g, '五個');
    s = s.replace(/狙いを定める/g, '鎖定').replace(/HPが高い/g, 'HP最高的').replace(/メロメロ/g, '迷戀');
    s = s.replace(/は死ぬ/g, '將死亡').replace(/死ななかった場合は/g, '若未死亡則').replace(/狙われ続ける/g, '持續被鎖定');
    s = s.replace(/気まぐれ/g, '隨興').replace(/森羅万象斬り/g, '森羅萬象斬').replace(/強大な/g, '強大');
    s = s.replace(/倍にして/g, '倍並').replace(/にして/g, '變為').replace(/落ちてた/g, '掉落的');
    s = s.replace(/ごく僅かに/g, '極微量').replace(/ほん少し/g, '微量').replace(/完全無効状態なる/g, '完全無效狀態');
    s = s.replace(/与えて/g, '賦予並').replace(/を貼る/g, '展開').replace(/に対して/g, '對').replace(/を消す/g, '消除');
    s = s.replace(/回復して/g, '恢復並').replace(/復活する度に/g, '每次復活時').replace(/される度に/g, '每次受到時');
    s = s.replace(/を盗む/g, '竊取').replace(/跳ね返し/g, '反射').replace(/の際に/g, '時').replace(/のとき/g, '時');
    s = s.replace(/し続ける|し続け/g, '持續').replace(/状態にし/g, '使其陷入狀態');
    s = s.replace(/急所を突くことに成功した時/g, '成功命中要害時').replace(/運良く/g, '幸運地');
    s = s.replace(/自らが爆破してしまう/g, '自身發生爆炸').replace(/すべての策が失敗し/g, '所有計策失敗而');
    s = s.replace(/増加した状態/g, '增加的狀態').replace(/減少した際に/g, '減少時').replace(/人以上いるとき/g, '人以上時');
    s = s.replace(/上昇し続ける|上昇し続け/g, '持續提升').replace(/中確率で/g, '中等機率');
    s = s.replace(/最も([^。・、：]+)の高い/g, '$1最高的').replace(/最も少ない/g, '最少的');
    s = s.replace(/耐性に関わらず/g, '無視抗性').replace(/特殊な幻惑/g, '特殊幻惑').replace(/命中しない/g, '無法命中');
    s = s.replace(/に陥る/g, '陷入').replace(/しない/g, '不會').replace(/倒れた際に/g, '倒下時');
    s = s.replace(/僅かに/g, '微量').replace(/僅か/g, '微量').replace(/極僅か/g, '極微量');
    s = s.replace(/魔法使い/g, '魔法使').replace(/使用者/g, '使用者').replace(/張り/g, '展開並').replace(/を得る/g, '獲得');
    s = s.replace(/全て奪う/g, '全部奪取').replace(/を奪う/g, '奪取').replace(/与え/g, '造成');
    s = s.replace(/狙われやすくなる/g, '更容易被鎖定').replace(/狙われるようになる/g, '會被鎖定').replace(/敵味方問わず/g, '不分敵我').replace(/に陥れる/g, '使其陷入');
    s = s.replace(/本の刻印/g, '書之刻印').replace(/武器種「本」/g, '武器種類「書」');
    s = s.replace(/獲得した/g, '獲得的').replace(/気絶した/g, '陷入昏厥的').replace(/パーツブレイクした/g, '透過部位破壞獲得的');
    s = s.replace(/戻る/g, '返回').replace(/戻す/g, '恢復原狀').replace(/最も高い/g, '最高的').replace(/最も低い/g, '最低的');
    s = s.replace(/肩代わりする|肩代わりし|肩代わり/g, '代為承受').replace(/受けた時に|受けたとき|受けた時/g, '受到時');
    s = s.replace(/の間/g, '期間').replace(/人以上いる時/g, '人以上時').replace(/人以上いる/g, '人以上').replace(/がいるとき/g, '存在時');
    s = s.replace(/発動し/g, '發動並').replace(/返し/g, '反射').replace(/残る/g, '剩餘').replace(/恋焦がれ/g, '戀慕').replace(/ランダムな/g, '隨機');
    s = s.replace(/確実に/g, '必定').replace(/確実/g, '必定').replace(/超低確率で/g, '極低機率').replace(/を使用した/g, '已使用的');
    s = s.replace(/上げて/g, '提升並').replace(/下げて/g, '降低並').replace(/全員と力を合わせて/g, '全員合力');
    s = s.replace(/スキルの力を限界突破させることのできる宝珠/g, '可使技能力量突破上限的寶珠');
    s = s.replace(/気絶するほどのダメージを受けても/g, '即使受到足以致命的傷害');
    s = s.replace(/攻撃を躱す/g, '閃避攻擊').replace(/敵に/g, '對敵人').replace(/敵複数に/g, '對多個敵人');
    s = s.replace(/状態異常になる/g, '陷入狀態異常').replace(/状態異常になり/g, '陷入狀態異常並');
    s = s.replace(/回復し/g, '恢復並').replace(/の状態/g, '狀態').replace(/で獲得/g, '獲得');
    s = s.replace(/追加で増やす/g, '額外增加').replace(/に変化/g, '變化為').replace(/にし/g, '使其');
    s = s.replace(/一つ/g, '一個').replace(/二つ/g, '兩個').replace(/三つ/g, '三個').replace(/四つ/g, '四個');
    s = s.replace(/捨て身/g, '捨身').replace(/超急所狙い/g, '超要害狙擊').replace(/急所狙い/g, '要害狙擊');
    s = s.replace(/次のターンが終わるまで/g, '直到下回合結束').replace(/このターン終了まで/g, '直到本回合結束');
    s = s.replace(/敵の属性に関わらず/g, '無論敵方屬性').replace(/敵の属性関わらず/g, '無論敵方屬性');
    s = s.replace(/隠し持っている/g, '藏有的').replace(/ぬすむ/g, '竊取').replace(/HPを除く/g, '不含HP').replace(/を除く/g, '除外');
    s = s.replace(/重複有り/g, '可疊加').replace(/重複あり/g, '可疊加').replace(/重複無し/g, '不可疊加').replace(/重複なし/g, '不可疊加');
    s = s.replace(/を張る/g, '展開').replace(/張る/g, '展開').replace(/躱す/g, '閃避').replace(/打ち消す|打ち消し/g, '消除');
    s = s.replace(/力を合わせて/g, '合力').replace(/終わる/g, '結束').replace(/ができる/g, '可以').replace(/でき/g, '可以');
    s = s.replace(/与える/g, '造成').replace(/させることで/g, '藉由').replace(/することで/g, '藉由');
    s = s.replace(/使用した/g, '已使用的').replace(/所持した/g, '持有的').replace(/全ての/g, '全部').replace(/全て/g, '全部');
    s = s.replace(/たべもの/g, '食物').replace(/その他/g, '其他').replace(/この/g, '本').replace(/その/g, '該');
    s = s.replace(/に応じて/g, '依據').replace(/に合わせて/g, '配合').replace(/に加えて/g, '額外加上');
    s = s.replace(new RegExp('確率(' + pos + ')[%％]で', 'g'), '以$1％機率');
    s = s.replace(/金縛り/g, '定身').replace(/ダメ\\nージ/g, 'ダメージ');
    s = s.replace(/次のターン終了まで/g, '直到下回合結束').replace(/次のターン開始まで/g, '直到下回合開始');
    s = s.replace(/次回/g, '下次').replace(/次ターン/g, '下回合').replace(/前のターン/g, '上回合');
    s = s.replace(new RegExp('確率(' + pos + ')％で', 'g'), '以$1％機率');
    s = s.replace(/(?:超高|極高)確率で/g, '極高機率').replace(/高確率で/g, '高機率').replace(/低確率で/g, '低機率').replace(/ごく稀に/g, '極低機率').replace(/稀に/g, '低機率').replace(/確率で/g, '有機率');
    s = s.replace(/攻撃を受ける度に/g, '每次受到攻擊時').replace(/ダメージを受ける度に/g, '每次受到傷害時').replace(/ダメージを受けるまで/g, '直到受到傷害為止');
    s = s.replace(/固有\/サブスキルを発動する度に/g, '每次發動固有／副技能時').replace(/スキルを使用する度に/g, '每次使用技能時').replace(/スキルを発動する度に/g, '每次發動技能時');
    s = s.replace(/攻撃力依存の/g, '依攻擊力計算的').replace(/攻撃魔力依存の/g, '依攻擊魔力計算的').replace(/回復魔力依存の/g, '依恢復魔力計算的').replace(/防御力依存の/g, '依防禦力計算的').replace(/すばやさ依存の/g, '依速度計算的');
    s = s.replace(/(攻撃魔法スキル|攻撃スキル|特殊スキル|全スキル)からの被ダメージ/g, '受到$1的傷害');
    s = s.replace(new RegExp('(敵' + pos + '体|敵全体|味方全員|自身)に', 'g'), '對$1');
    s = s.replace(/((?:火|水|樹|光|闇|無)属性の(?:全)?敵)に/g, '對$1');
    s = s.replace(new RegExp('([^。・、：:(（\\r\\n\uE110]+)のHPを(大回復|小回復|全回復|回復)(する)?', 'g'), '$2$1的HP');
    s = s.replace(new RegExp('([^。・、：:(（\\r\\n\uE110\\\\]+)を(' + adjective + ')(上げる|上げ|下げる|下げ)', 'g'), (_, target, amount, verb) => amount + (verb.startsWith('上') ? '提升' : '降低') + target);
    s = s.replace(/上げて/g, '提升並').replace(/下げて/g, '降低並');
    s = s.replace(new RegExp('(攻撃力|攻撃魔力|回復魔力|防御力|すばやさ|全パラメータ|状態異常耐性|被ダメージ|与ダメージ)((?:' + pos + ')(?:[～〜～~](?:' + pos + '))?)回(少し|大幅に|大幅)?(アップ|ダウン|上昇|減少)', 'g'), '$1$3$4$2次');
    s = s.replace(new RegExp('(' + pos + ')(?:つにつき|個につき)', 'g'), '每$1個');
    s = s.replace(/(?:を付与する度に|を付与するたびに)/g, '每次賦予時').replace(/する度に|するたびに|の度に/g, '每次').replace(/を使用したとき/g, '使用時');
    s = s.replace(/所持している/g, '持有的').replace(/使用した/g, '已使用的').replace(/使用している/g, '正在使用的').replace(/装備している/g, '已裝備的');
    s = s.replace(/再チャージ/g, '重新充填').replace(/超クリティカル参/g, '超暴擊Ⅲ').replace(/超クリティカル弐/g, '超暴擊Ⅱ').replace(/超クリティカル/g, '超暴擊');
    s = s.replace(/受けるダメージ/g, '受到的傷害').replace(/与えるダメージ/g, '造成的傷害').replace(/受けたダメージ/g, '受到的傷害').replace(/与えたダメージ/g, '造成的傷害');
    s = s.replace(/受けたときに/g, '受到時').replace(/受けても/g, '即使受到').replace(/受けるとき/g, '受到時').replace(/受けると/g, '受到時').replace(/受ける/g, '受到');
    s = s.replace(/に関わらず/g, '無論').replace(/関わらず/g, '無論').replace(/にかかわらず/g, '無論');
    s = s.replace(/をもう一度/g, '再一次').replace(/をぬすむ/g, '竊取').replace(/ぬすんだ/g, '竊取的');
    s = s.replace(/が発動/g, '發動').replace(/を発動/g, '發動').replace(/が発生/g, '發生').replace(/を発生/g, '產生');
    s = s.replace(/効果を打ち消す/g, '消除效果').replace(/を打ち消す/g, '消除').replace(/を消し去る/g, '消除');
    s = s.replace(/に変化する/g, '變化為').replace(/に変化し/g, '變化為').replace(/となる/g, '變為').replace(/になる/g, '變為').replace(/になり/g, '變為');
    s = s.replace(/がそれぞれ/g, '各自').replace(/をそれぞれ/g, '各自').replace(/それぞれ/g, '各自').replace(/もしくは|または/g, '或').replace(/さらに/g, '此外');
    s = s.replace(/をすべて/g, '全部').replace(/すべての/g, '全部').replace(/全ての/g, '全部');
    s = s.replace(/有り|あり/g, '有').replace(/無し/g, '無').replace(/限り/g, '限定').replace(/更に/g, '此外');
    s = s.replace(/し続ける/g, '持續').replace(/させる/g, '').replace(/させて/g, '並').replace(/させ/g, '').replace(/することで/g, '藉由').replace(/ることで/g, '藉由');
    s = s.replace(/するほどの/g, '程度的').replace(/するが/g, '但').replace(/する/g, '').replace(/している/g, '中').replace(/して/g, '並');
    s = s.replace(/まで/g, '為止').replace(/以上/g, '以上').replace(/以下/g, '以下').replace(/未満/g, '未滿').replace(/以外/g, '以外');
    s = s.replace(/のとき|いるとき|ときに|時に/g, '時').replace(/がいる/g, '存在').replace(/のみ/g, '僅').replace(/だけ/g, '僅').replace(/ずつ/g, '各').replace(/ごとに/g, '每次');
    s = s.replace(/上がる|上がり|上げる|上げ/g, '提升').replace(/下がる|下がり|下げる|下げ/g, '降低');
    s = s.replace(/増やす|増やし/g, '增加').replace(/減らす|減らし/g, '減少').replace(/与え/g, '造成').replace(/回復し/g, '回復並');
    s = s.replace(wordPattern, word => lexicon.get(word));
    s = s.replace(numeral, (_, n, unit) => n + ({ 回: '次', 個: '個', 体: '體', 人: '人', つ: '個' }[unit]));
    s = s.replace(/からの/g, '來自').replace(/への/g, '對').replace(/から/g, '從').replace(/によって|により/g, '藉由');
    s = s.replace(/の/g, '的').replace(/を/g, '').replace(/が/g, '').replace(/で/g, '以').replace(/に/g, '於').replace(/と/g, '與').replace(/は/g, '則');
    s = s.replace(/し(?=[、。・)）＆]|$)/g, '').replace(/する|される/g, '').replace(/できる/g, '可以').replace(/なし/g, '無');
    s = s.replace(/発|撃|属|状|変|増|減|効|絶|与|獣|闘|転|軽|体|気|剣|条|来|数|続|残|単|広|囲|悪|関|実|満|復|応|当|両|乗|値|覚|戦|円|乱|伝|称|装|抜|拡|収|複|訳|聖|砕|氷|応|昇|亜|触|罠|繋|姫|竜|薬|獲|隠|潜|処|圧|勲|専|臓|臨|滅|涼|騒|桜|学|楽|糸|絆|絵|華|涙|弾|霊|齢|断|帰|貫/g, c => ({発:'發',撃:'擊',属:'屬',状:'狀',変:'變',増:'增',減:'減',効:'效',絶:'絕',与:'與',獣:'獸',闘:'鬥',転:'轉',軽:'輕',体:'體',気:'氣',剣:'劍',条:'條',来:'來',数:'數',続:'續',残:'殘',単:'單',広:'廣',囲:'圍',悪:'惡',関:'關',実:'實',満:'滿',復:'復',応:'應',当:'當',両:'兩',乗:'乘',値:'值',覚:'覺',戦:'戰',円:'圓',乱:'亂',伝:'傳',称:'稱',装:'裝',抜:'拔',拡:'擴',収:'收',複:'複',訳:'譯',聖:'聖',砕:'碎',氷:'冰',昇:'升',亜:'亞',触:'觸',罠:'陷阱',繋:'連繫',姫:'公主',竜:'龍',薬:'藥',獲:'獲',隠:'隱',潜:'潛',処:'處',圧:'壓',勲:'勳',専:'專',臓:'臟',臨:'臨',滅:'滅',涼:'涼',騒:'騷',桜:'櫻',学:'學',楽:'樂',糸:'絲',絆:'羈絆',絵:'繪',華:'華',涙:'淚',弾:'彈',霊:'靈',齢:'齡',断:'斷',帰:'歸',貫:'貫'}[c]));
    s = traditional(s).replace(/壊/g, '壞').replace(/艶/g, '艷').replace(/総/g, '總');
    s = s.replace(new RegExp('CT(' + pos + '[%％]?)增加狀態以戰鬥開始(?:可以)?', 'g'), '以CT增加$1的狀態開始戰鬥');
    s = s.replace(new RegExp('CT(' + pos + '[%％]?)從戰鬥開始(?:可以)?', 'g'), '以CT$1開始戰鬥');
    s = s.replace(new RegExp('戰鬥開始從(' + pos + ')回合(?:期間)?', 'g'), '戰鬥開始起$1回合內');
    s = s.replace(/全體的以CT/g, '全體以CT').replace(/武器種類類/g, '武器種類');
    s = s.replace(new RegExp('(攻擊力|防禦力|攻擊魔力|恢復魔力|速度|最大HP|CT量表|CT|造成傷害|所受傷害|抗性|掉落率)(' + pos + '[%％])(提升|降低|增加|減少|減輕)', 'g'), '$1$3$2');
    s = s.replace(new RegExp('(《[^》]+》)增益(' + pos + ')個獲得', 'g'), '獲得$2個$1增益');
    s = s.replace(new RegExp('(《[^》]+》)增益(' + pos + ')個減少', 'g'), '減少$2個$1增益');
    s = s.replace(/的有機率/g, '機率').replace(new RegExp('((?:增益|減益)效果)(' + pos + '[%％])突破上限', 'g'), '$1突破上限$2');
    s = s.replace(/的捨身的/g, '的捨身').replace(/的要害狙擊的/g, '的要害狙擊');
    s = s.replace(/\uE110/g, '\\n');
    return s.replace(/\uE100([\uE200-\uF8FF])\uE101/g, (_, c) => protectedParts[c.charCodeAt(0) - 0xE200]);
}
const templates = {}, exact = {}, unresolved = new Map(), retained = [];
const seen = new Set();
for (const row of rows) {
    if (seen.has(row.d)) continue; seen.add(row.d);
    const effective = Object.hasOwn(cleanup, row.d) ? cleanup[row.d] : row.d;
    const parts = core.tokenize(effective);
    const key = parts?.key ?? effective;
    const target = effective === '' ? '（原文未提供效果說明）' : render(key);
    let residue = target.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => names.has(a ?? b ?? c) || (c && effective.includes('EXスキル"' + c + '"')) ? '' : all);
    const good = !/[ぁ-ゖァ-ヺ]/.test(residue);
    if (good) {
        if (effective !== row.d || !parts) exact[row.d] = { translation: target.replace(/\{(\d+)\}/g, (_, index) => parts.values[index]), effectiveSource: effective, reason: effective !== row.d ? '已檢查的早期純情境敘述省略；保留實際效果。' : '完整描述例外。' };
        else templates[key] = target;
        if (target === key) retained.push({ source: row.d, reason: /^[\s\p{P}\p{S}\d]+$/u.test(row.d) ? '原始佔位符／符號。' : '原文效果用字與中文相同。' });
    } else if (!unresolved.has(key)) unresolved.set(key, { key, target, example: row.d, id: row.id, table: row.table });
}
await writeJson(path.join(root, 'translations/templates.zh-TW.json'), templates);
await writeJson(path.join(root, 'translations/exact.zh-TW.json'), exact);
await writeJson(path.join(root, 'translations/retained.json'), retained);
const exNames = [...new Set(rows.flatMap(row => [...row.d.matchAll(/EXスキル"([^"]+)"/g)].map(match => match[1])))];
await writeJson(path.join(root, 'translations/glossary.json'), [...[...lexicon].map(([ja, zhTW]) => ({ ja, zhTW })), ...exNames.map(ja => ({ ja, zhTW: ja, preserve: true, reason: '描述內明確引用的 EX 技能名。' }))]);
await atomicWrite(path.join(root, 'reports/unresolved.jsonl'), [...unresolved.values()].map(row => JSON.stringify(row)).join('\n') + '\n');
const residueCounts = new Map();
for (const row of unresolved.values()) for (const token of row.target.match(/[ぁ-ゖァ-ヺー]+/g) ?? []) residueCounts.set(token, (residueCounts.get(token) ?? 0) + 1);
await atomicWrite(path.join(root, 'reports/residue.tsv'), [...residueCounts].sort((a, b) => b[1] - a[1]).map(([word, count]) => word + '\t' + count).join('\n'));
await writeJson(path.join(root, 'reports/compiler.json'), { templates: Object.keys(templates).length, exact: Object.keys(exact).length, unresolved: unresolved.size, ruleHash: hash(await fs.readFile(fileURLToPath(import.meta.url))) });
console.log(JSON.stringify({ templates: Object.keys(templates).length, exact: Object.keys(exact).length, unresolved: unresolved.size }));
