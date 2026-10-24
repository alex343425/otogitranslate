import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, hash, inspectTranslations, loadCurrent, loadTranslations, writeJson } from '../manage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { manifest, tables } = await loadCurrent(root);
const translations = await loadTranslations(root);
const before = structuredClone(translations);

// Each representative ID identifies a complete, manually translated numeric template.
// Existing templates and exact exceptions must remain unchanged.
const additions = [
    ['MSkills', 266202, '「女祭司怪盜{0}ver.」裝備時：造成傷害提升{1}％'],
    ['MSkills', 266192, '「魔術師偵探{0}ver.」裝備時：每回合開始時恢復HP{1}％'],
    ['MSkills', 365351, '「弓」角色：進擊{0}％增益・攻擊力＆攻擊魔力提升{1}%'],
    ['MSkills', 274331, '以CT增加{0}％的狀態開始戰鬥・CT增加速度{1}倍・必定暴擊＆超暴擊Ⅱ・高機率將已使用技能的CT重新充填・攻擊魔力提升{2}％・水屬性傷害減輕{3}％・普通攻擊＆技能攻擊時以{4}％機率附加混亂效果、特殊效果：每賦予「所受傷害提升/減輕系」「屬性傷害減輕/屬性抗性減少系」效果{5}次，或每被賦予造成傷害提升/減少效果{6}次，即獲得{7}個《Ⅱ・其意為寂靜》增益(上限{8}個)・每次受到傷害時減少{9}個《Ⅱ・其意為寂靜》增益・每持有{10}個《Ⅱ・其意為寂靜》增益，所受傷害減輕{11}％＆敵方全體防禦力減少{12}％'],
    ['MSkills', 274341, '以CT增加{0}％的狀態開始戰鬥・CT增加速度{1}倍・必定暴擊＆超暴擊Ⅱ・高機率將已使用技能的CT重新充填・攻擊魔力提升{2}％・每回合開始時賦予增益消除屏障({3}次)・受到攻擊時有機率發動威力{4}％的固有技能反擊、特殊效果：每賦予造成傷害提升/減少效果{5}次，或每賦予「所受傷害提升/減輕系」「屬性傷害減輕/屬性抗性減少系」效果{6}次，即獲得{7}個《Ⅰ・其意為解明》增益(上限{8}個)・每次受到傷害時減少{9}個《Ⅰ・其意為解明》增益・每持有{10}個《Ⅰ・其意為解明》增益，攻擊魔力提升{11}％＆以{12}％機率將已使用技能的CT重新充填'],
    ['MSkills', 366213, 'HP{0}％以下時CT增加速度{1}倍'],
    ['MSkills', 366212, 'HP{0}％以上時所受傷害減輕{1}％'],
    ['MSkills', 310641, '威力{0}％的闇屬性{1}次魔法攻擊。自身：發動奇理(四連續攻擊・暴走魔法陣{2}th・造成傷害{3}倍)・以{4}％機率發動超暴擊Ⅲ，持續至下回合結束・以{5}％機率使下次特殊技能威力{6}倍・造成傷害提升{7}次・CT量表增加{8}％、攻擊目標：以{9}％機率賦予短劍的刻印({10}倍/{11}次)・以{12}％機率進行{13}次減益轉移、特殊效果：貫穿攻擊魔法技能反射＆攻擊魔法技能傷害吸收(技能使用後必定變化為逆位置技能)'],
    ['MSkills', 310631, '威力{0}％的闇屬性{1}次魔法攻擊。自身：高機率發動超暴擊Ⅲ，持續至下回合結束・高機率使下次攻擊魔法技能威力{2}倍・造成傷害提升{3}次、攻擊目標：來自攻擊魔法技能的所受傷害提升{4}次、特殊效果：貫穿攻擊魔法技能反射＆攻擊魔法技能傷害吸收'],
    ['MSkills', 310601, '威力{0}％的樹屬性{1}次魔法攻擊。自身：高機率發動超暴擊Ⅲ，持續至下回合結束・高機率使下次攻擊魔法技能威力{2}倍・造成傷害小幅提升{3}次、攻擊目標：樹屬性抗性減少{4}次、特殊效果：貫穿攻擊魔法技能反射＆攻擊魔法技能傷害吸收'],
    ['MSkills', 310611, '威力{0}％的樹屬性{1}次魔法攻擊。自身：發動奪聖(四連續攻擊・暴走魔法陣{2}th・CT增加速度{3}倍)・以{4}％機率發動超暴擊Ⅲ，持續至下回合結束・以{5}％機率使下次輔助技能威力{6}倍、攻擊目標：以{7}％機率賦予杖的刻印({8}倍/{9}次)・增益吸取{10}次・樹屬性抗性減少{11}次・賦予{12}～{13}個戀慕減益(累積三個時發動效果)、特殊效果：貫穿攻擊魔法技能反射＆攻擊魔法技能傷害吸收(技能使用後必定變化為逆位置技能)'],
    ['MMutationSkills', 310651, '依攻擊魔力計算的威力{0}％的闇屬性{1}次攻擊。自身：發動奇理(四連續攻擊・暴走魔法陣{2}th・造成傷害{3}倍)・以{4}％機率發動超暴擊Ⅲ，持續至下回合結束・以{5}％機率使下次攻擊魔法技能威力{6}倍、攻擊目標：造成傷害減少{7}次・消除{8}個有利效果・來自攻擊魔法技能的所受傷害提升{9}次・以{10}％機率賦予短劍的刻印({11}倍/{12}次)、特殊效果：貫穿特殊技能反射＆特殊技能傷害吸收(技能使用後必定變化為正位置技能)'],
    ['MMutationSkills', 310621, '依攻擊魔力計算的威力{0}％的樹屬性{1}次魔法攻擊。自身：發動奪聖(四連續攻擊・暴走魔法陣{2}th・CT增加速度{3}倍)・以{4}％機率發動超暴擊Ⅲ，持續至下回合結束・以{5}％機率使下次攻擊魔法技能威力{6}倍・以{7}％機率淨化全部狀態異常・全能力值小幅提升{8}次・造成傷害小幅提升{9}次、攻擊目標：以{10}％機率賦予杖的刻印({11}倍/{12}次)(技能使用後必定變化為正位置技能)'],
    ['MSkills', 435731, '自身：攻擊力&防禦力小幅提升{0}次({1}秒)、敵方全體：狀態異常抗性小幅降低{2}次({3}秒)・附加混亂效果({4}秒)'],
    ['MSkills', 435732, '自身：淨化全部狀態異常效果・HP以外的全能力值小幅提升{0}次({1}秒)、敵方全體：攻擊力＆攻擊魔力小幅降低{2}次({3}秒)・CT增加速度降低{4}％({5}秒)'],
    ['MSkills', 266193, '每持有{0}個《Ⅰ・其意為解明》增益，CT增加速度{1}倍'],
    ['MSkills', 274345, '每持有{0}個《Ⅰ・其意為解明》增益，攻擊魔力提升{1}％＆以{2}％機率將已使用技能的CT重新充填'],
    ['MSkills', 266203, '每持有{0}個《Ⅱ・其意為寂靜》增益，以{1}％機率將已使用技能的CT重新充填'],
    ['MSkills', 274334, '每持有{0}個《Ⅱ・其意為寂靜》增益，所受傷害減輕{1}％＆敵方全體防禦力減少{2}％'],
    ['MSkills', 266201, '全能力值提升{0}％・戰鬥中即使受到足以致命的傷害，仍以HP{2}％復活，最多{1}次、「女祭司怪盜{3}ver.」裝備時：造成傷害提升{4}％・每持有{5}個《Ⅱ・其意為寂靜》增益，以{6}％機率將已使用技能的CT重新充填'],
    ['MSkills', 266191, '全能力值提升{0}％・戰鬥中即使受到足以致命的傷害，仍以HP{2}％復活，最多{1}次、「魔術師偵探{3}ver.」裝備時：每回合開始時恢復HP{4}％・每持有{5}個《Ⅰ・其意為解明》增益，CT增加速度{6}倍'],
    ['MSkills', 68101, '全體：以CT{0}％開始戰鬥・連鎖傷害倍率超大幅提升・精靈量表取得量大幅增加、闇屬性角色：全能力值提升{1}％、「短劍」角色：CT增加速度{2}倍(其他武器種類角色{3}倍)・攻擊力＆攻擊魔力提升{4}％・技能變化率提升{5}％・光屬性傷害減輕{6}％・每回合開始時攻擊魔力提升{7}％(最大{8}％)、敵方全體：闇屬性抗性減少{9}％、戰鬥中的我方增益效果「超突破上限拾」(上限{10}％→{11}％)'],
    ['MSkills', 68091, '全體：以CT{0}％開始戰鬥・連鎖傷害倍率超大幅提升・精靈量表取得量大幅增加、樹屬性角色：全能力值提升{1}％、「杖」角色：CT增加速度{2}倍(其他武器種類角色{3}倍)・攻擊力＆攻擊魔力提升{4}％・技能變化率提升{5}％・以{6}％機率使暴擊時的傷害變為{7}倍・戰鬥開始時發動「魔神化」效果(全部攻擊魔法技能的基礎威力+{8}％/自身+{9}％)、敵方全體：所受傷害提升{10}％、戰鬥中的我方增益效果「超突破上限拾」(上限{11}％→{12}％)'],
    ['MSkills', 435742, '敵方全體：威力{0}％的水屬性{1}次魔法攻擊・HP以外的全能力值小幅降低{2}次({3}秒)・狀態異常抗性降低{4}次({5}秒)・附加幻惑效果({6}秒)、特殊效果：貫穿全部技能反射'],
    ['MSkills', 435744, '敵方全體：威力{0}％的水屬性{1}次魔法攻擊・HP以外的全能力值小幅降低{2}次({3}秒)・消除全部有利效果、敵方全體：狀態異常抗性降低{4}次({5}秒)・附加睡眠效果、特殊效果：貫穿全部技能反射'],
    ['MSkills', 435743, '敵方全體：威力{0}％的水屬性{1}次魔法攻擊・狀態異常抗性降低{2}次({3}秒)・附加麻痺效果({4}秒)、自身：賦予增益消除屏障＆增益吸取屏障({5}次)・HP以外的全能力值小幅提升{6}次({7}秒)'],
    ['MSkills', 435741, '敵方全體：威力{0}％的水屬性{1}次魔法攻擊・無視抗性使攻擊力＆攻擊魔力小幅降低{2}次({3}秒)・狀態異常抗性降低{4}次({5}秒)・附加詛咒效果({6}秒)、特殊效果：貫穿全部技能反射'],
    ['MSkills', 274333, '特殊效果：每賦予「所受傷害提升/減輕系」「屬性傷害減輕/屬性抗性減少系」效果{0}次，或每被賦予造成傷害提升/減少效果{1}次，即獲得{2}個《Ⅱ・其意為寂靜》增益(上限{3}個)'],
    ['MSkills', 274344, '特殊效果：每賦予造成傷害提升/減少效果{0}次，或每賦予「所受傷害提升/減輕系」「屬性傷害減輕/屬性抗性減少系」效果{1}次，即獲得{2}個《Ⅰ・其意為解明》增益(上限{3}個)'],
    ['MSkills', 366211, '每回合開始時防禦力持續提升{0}％（最大{1}％）・HP{2}％以上時所受傷害減輕{3}％・HP{4}％以下時CT增加速度{5}倍'],
];

const glossaryAdditions = [
    { ja: 'ハイプリーステス怪盗', zhTW: '女祭司怪盜' },
    { ja: 'マジシャン探偵', zhTW: '魔術師偵探' },
    { ja: 'Ⅰ・其は解明の意', zhTW: 'Ⅰ・其意為解明' },
    { ja: 'Ⅱ・其は静寂の意', zhTW: 'Ⅱ・其意為寂靜' },
    { ja: '奇理', zhTW: '奇理', note: '技能描述內的複合狀態名稱，保留名稱並翻譯括號中的效果。' },
    { ja: '奪聖', zhTW: '奪聖', note: '技能描述內的複合狀態名稱，保留名稱並翻譯括號中的效果。' },
];

const reviewed = [];
let addedTemplates = 0;
for (const [table, id, translation] of additions) {
    const row = tables[table].find(item => item.id === id);
    if (!row) throw new Error('Representative skill missing: ' + table + '/' + id);
    const { key } = core.tokenize(row.d);
    if (Object.hasOwn(translations.templates, key)) {
        if (translations.templates[key] !== translation) throw new Error('Existing template differs: ' + id);
    } else {
        translations.templates[key] = translation;
        addedTemplates++;
    }
    reviewed.push({ table, id, name: row.n, source: row.d, key, translation });
}
let addedGlossary = 0;
for (const item of glossaryAdditions) {
    const existing = translations.glossary.find(entry => entry.ja === item.ja);
    if (existing) {
        if (existing.zhTW !== item.zhTW) throw new Error('Existing glossary entry differs: ' + item.ja);
    } else {
        translations.glossary.push(item);
        addedGlossary++;
    }
}

for (const [key, value] of Object.entries(before.templates)) {
    if (translations.templates[key] !== value) throw new Error('Existing template changed');
}
const { report } = inspectTranslations(tables, translations);
if (report.pending || report.errors.length) throw new Error(JSON.stringify(report));

let backup = null;
if (addedTemplates || addedGlossary) {
    backup = 'backup/update-' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.mkdir(path.join(root, backup), { recursive: true });
    for (const name of ['templates.zh-TW.json', 'glossary.json']) {
        await fs.copyFile(path.join(root, 'translations', name), path.join(root, backup, name));
    }
    await writeJson(path.join(root, 'translations/templates.zh-TW.json'), translations.templates);
    await writeJson(path.join(root, 'translations/glossary.json'), translations.glossary);
}
await writeJson(path.join(root, 'reports/update-20261022.json'), {
    updatedAt: new Date().toISOString(), source: manifest.tables, addedTemplates, addedGlossary, backup,
    existingTemplatesUnchanged: Object.entries(before.templates).every(([key, value]) => translations.templates[key] === value),
    exactDictionarySha256: hash(await fs.readFile(path.join(root, 'translations/exact.zh-TW.json'))),
    validation: report, reviewed, glossaryAdditions,
});
console.log(JSON.stringify({ addedTemplates, addedGlossary, backup, ...report }, null, 2));
