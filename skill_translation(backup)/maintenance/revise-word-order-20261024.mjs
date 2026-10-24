// Reviewed recurring Chinese word-order repairs; never rebuild the first-release translator.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { core, entries, hash, loadCurrent } from '../manage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const backup = path.join(root, 'backup/word-order-20261024');
const reportFile = path.join(root, 'reports/word-order-20261024' + (apply ? '' : '-preview') + '.json');
const number = String.raw`(?:\{\d+\}|\d+(?:\.\d+)?|[一二三四五六七八九十百兩]+)`;
const rules = [
    { id: 'enumeration', note: '刪去列舉分隔符前多餘的「並」，保留句中連接兩個動作的「並」。',
        pattern: /並(?=[、・。]|$)/g, replace: '' },
    { id: 'battle-start', note: '依指定例句刪去「戰鬥開始可以」句尾的「可以」。',
        pattern: /戰鬥開始可以/g, replace: '戰鬥開始' },
    { id: 'team-damage', note: '將「與隊伍全體成員合力…傷害造成」改為「造成隊伍全體成員合力的…傷害」。',
        pattern: /對敵方全體(?:與隊伍全體成員合力|隊伍全體成員的合力)([^、・。\\\r\n]*?傷害(?:\([^)]*\)|（[^）]*）)?)造成/g,
        replace: (_, damage) => '對敵方全體造成隊伍全體成員合力的' + damage.replace('極大幅傷害', '極大傷害') },
    { id: 'part-break', note: '動作使用「發生部位破壞」；名詞「部位破壞發生機率」保持原樣。',
        pattern: /部位破壞發生(?!機率)/g, replace: '發生部位破壞' },
    { id: 'battle-mode-only', note: '將戰鬥模式限定詞「僅」放在限定內容之前。',
        pattern: new RegExp(`([（(])(${number}角色戰鬥)僅(?=[)）])`, 'g'), replace: '$1僅$2' },
    { id: 'battle-trigger-limit', note: '「戰鬥中N次僅發動」改為「戰鬥中僅發動N次」。',
        pattern: new RegExp(`戰鬥中(${number}次)僅發動`, 'g'), replace: '戰鬥中僅發動$1' },
    { id: 'count-only', note: '括號內「N次僅」改為「僅N次」。',
        pattern: new RegExp(`([（(])(${number}次)僅(?=[)）])`, 'g'), replace: '$1僅$2' },
    { id: 'receive-attack', note: '「攻擊受到時」改為「受到攻擊時」。',
        pattern: /攻擊受到時/g, replace: '受到攻擊時' },
    { id: 'counter', note: '把反擊的動詞移到威力與技能名之前。',
        pattern: new RegExp(`威力(${number}[%％])固有技能的?反擊發生`, 'g'), replace: '發動威力$1的固有技能反擊' },
    { id: 'accumulation-condition', note: '「N個累積以效果發動」改為「累積N個時發動效果」。',
        pattern: new RegExp(`(${number}個)累積以效果發動`, 'g'), replace: '累積$1時發動效果' },
    { id: 'each-activation', note: '「發動度於」改為「每次發動…時」。',
        pattern: /固有\/副技能發動度於ULT量表提升/g, replace: '每次發動固有/副技能時，ULT量表提升' },
    { id: 'party-condition', note: '「隊伍／成員於…N人以上以／時」改為「隊伍／成員中有N人以上的…時」。',
        pattern: new RegExp(`(隊伍|成員)於([^、・。()（）\\\\\r\n]{1,45}?)(${number})人以上(?:以|時)`, 'g'),
        replace: '$1中有$3人以上的$2時' },
    { id: 'further-party-threshold', note: '同一條件內後續人數門檻的「N人以上以」改為「N人以上時」。',
        pattern: new RegExp(`(${number}人以上)以(?=(?:極大幅|超大幅|特大幅|大幅|小幅|極大|超大|特大|大|中|小)提升)`, 'g'),
        replace: '$1時' },
    { id: 'conditional-intensity', note: '將條件成立後的「…提升變化為」改為「改為…提升」。',
        pattern: /((?:極大幅|超大幅|特大幅|大幅|小幅|極大|超大|特大|微量|僅少|大|中|小)提升)變化為/g,
        replace: '改為$1' },
    { id: 'weapon-source', note: '將表示傷害來源的「來自」放到武器種類之前。',
        pattern: /武器種類(「[^」]+」|『[^』]+』)來自所受傷害/g, replace: '來自武器種類$1的傷害' },
    { id: 'critical-duration', note: '將「直到下回合結束…發動」改為「發動…，持續至下回合結束」，保留前置機率。',
        pattern: /直到下回合結束(超暴擊[ⅡⅢ]?)(?:發動|發生)(?!狀態)/g,
        replace: '發動$1，持續至下回合結束' },
    { id: 'attack-with-resistance-reduction', note: '減少抗性後攻擊的能力敘述，將動詞前移並刪去句尾的「可以」。',
        pattern: /攻擊目標狀態異常抗性減少並攻擊可以/g, replace: '降低攻擊目標的狀態異常抗性並發動攻擊' },
    { id: 'attack-with-small-resistance-reduction', note: '保留小幅／微量差異，調整降低敵方抗性後攻擊的語序。',
        pattern: /敵狀態異常抗性(小幅|微量)降低並攻擊可以/g, replace: '$1降低敵方的狀態異常抗性並發動攻擊' },
    { id: 'self-damage', note: '「對自身…傷害造成」改為「對自身造成…傷害」。',
        pattern: new RegExp(`對自身((?:目前HP${number}[%％])?)傷害造成`, 'g'), replace: '對自身造成$1傷害' },
    { id: 'lethal-damage', note: '「即死級傷害造成」改為「造成即死級傷害」。',
        pattern: /即死級傷害造成/g, replace: '造成即死級傷害' },
    { id: 'single-enemy-target', note: '「敵方單體於低機率」改為「以低機率對敵方單體」。',
        pattern: /敵方單體於低機率(?=造成即死級傷害)/g, replace: '以低機率對敵方單體' },
    { id: 'element-damage', note: '將「對敵方全體…屬性傷害造成」的動詞前移。',
        pattern: /對敵方全體([火水樹光闇無]屬性(?:中|大)?傷害)造成/g, replace: '對敵方全體造成$1' },
];

export function revise(text, counts = {}) {
    for (const rule of rules) {
        text = text.replace(rule.pattern, (...args) => {
            counts[rule.id] = (counts[rule.id] ?? 0) + 1;
            if (typeof rule.replace === 'function') return rule.replace(...args);
            return rule.replace.replace(/\$(\d+)/g, (_, index) => args[Number(index)] ?? '');
        });
    }
    return text;
}

// Keep the user's examples exact, including parameters, punctuation and retained wording.
assert.equal(revise('CT{0}％已增加的狀態以戰鬥開始可以、攻擊魔力提升{1}％並、道具掉落率中提升、由於魔導的深淵將至，無視敵方防禦力50%並發動攻擊'),
    'CT{0}％已增加的狀態以戰鬥開始、攻擊魔力提升{1}％、道具掉落率中提升、由於魔導的深淵將至，無視敵方防禦力50%並發動攻擊');
assert.equal(revise('對敵方全體與隊伍全體成員合力樹屬性極大傷害造成'), '對敵方全體造成隊伍全體成員合力的樹屬性極大傷害');
assert.equal(revise('有機率部位破壞發生(10角色戰鬥僅)'), '有機率發生部位破壞(僅10角色戰鬥)');
assert.equal(revise('部位破壞發生機率提升・無視敵方防禦力 30% 並發動攻擊・減益被賦予時・可以自行改造'),
    '部位破壞發生機率提升・無視敵方防禦力 30% 並發動攻擊・減益被賦予時・可以自行改造');

const { manifest, tables } = await loadCurrent(root);
const names = ['templates.zh-TW.json', 'exact.zh-TW.json'];
const planned = [];
const changes = [];
const counts = {};
const numeric = value => (value.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g) ?? []).sort();
for (const name of names) {
    const original = await fs.readFile(path.join(root, 'translations', name), 'utf8');
    const before = JSON.parse(original);
    const after = structuredClone(before);
    for (const [source, item] of Object.entries(after)) {
        const previous = typeof item === 'string' ? item : item.translation;
        const matched = {};
        const translation = revise(previous, matched);
        assert.deepEqual(core.placeholders(translation), core.placeholders(previous), source);
        assert.deepEqual(numeric(translation), numeric(previous), source);
        assert.equal(revise(translation), translation, 'Revision must be idempotent: ' + source);
        assert.deepEqual(translation.match(/\\n|\r?\n/g), previous.match(/\\n|\r?\n/g), source);
        if (translation === previous) continue;
        if (typeof item === 'string') after[source] = translation;
        else item.translation = translation;
        changes.push({ file: name, source, previous, translation, rules: Object.keys(matched) });
        for (const [id, count] of Object.entries(matched)) counts[id] = (counts[id] ?? 0) + count;
    }
    assert.deepEqual(Object.keys(after), Object.keys(before));
    for (const [key, item] of Object.entries(before)) if (typeof item !== 'string') {
        const { translation: ignoredBefore, ...metadataBefore } = item;
        const { translation: ignoredAfter, ...metadataAfter } = after[key];
        assert.deepEqual(metadataAfter, metadataBefore);
    }
    // Rewrite only translation value tokens; keep source key bytes, metadata, layout and line endings.
    let sourceKey;
    const edited = original.split(/(?<=\n)/).map(line => {
        if (name.startsWith('templates.')) {
            const match = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)("(?:[^"\\]|\\.)*")(.*)$/s);
            if (!match) return line;
            return match[1] + match[2] + match[3] + JSON.stringify(after[JSON.parse(match[2])]) + match[5];
        }
        const keyMatch = line.match(/^  ("(?:[^"\\]|\\.)*"):\s*\{/);
        if (keyMatch) sourceKey = JSON.parse(keyMatch[1]);
        return line.replace(/("translation"\s*:\s*)("(?:[^"\\]|\\.)*")/,
            (_, prefix) => prefix + JSON.stringify(after[sourceKey].translation));
    }).join('');
    assert.deepEqual(JSON.parse(edited), after);
    planned.push({ name, original, edited });
}
const changedKeys = new Set(changes.map(item => item.file + '\n' + item.source));
const changedRows = {};
const currentExact = JSON.parse(planned.find(item => item.name === 'exact.zh-TW.json').original);
for (const entry of entries(tables)) {
    const exact = Object.hasOwn(currentExact, entry.source);
    const name = exact ? 'exact.zh-TW.json' : 'templates.zh-TW.json';
    const key = exact ? entry.source : core.tokenize(entry.source)?.key;
    if (changedKeys.has(name + '\n' + key)) changedRows[entry.table] = (changedRows[entry.table] ?? 0) + 1;
}
const preserved = {};
for (const name of ['source/current.json', ...Object.values(manifest.tables).map(item => item.file),
    'runtime.cjs', 'manage.mjs', 'pending.jsonl', 'translations/glossary.json',
    'translations/overrides.zh-CN.json', 'release/site/index_chs.html',
    'release/童話翻譯插件20261008.js', '../童話翻譯插件20261008.js']) {
    preserved[name] = hash(await fs.readFile(path.join(root, name)));
}
if (apply && changes.length) {
    // Back up the original evidence exactly once; an existing backup stops the write.
    for (const name of [...names.map(name => 'translations/' + name), 'translations/style-guide.md',
        'release/Skills/skills.json', 'release/Skills/skills_gb.json', 'release/build-info.json']) {
        const destination = path.join(backup, name);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(path.join(root, name), destination, 1);
    }
    for (const item of planned) if (item.edited !== item.original) {
        await fs.writeFile(path.join(root, 'translations', item.name), item.edited);
    }
}
const report = { date: '2026-10-24', mode: apply ? 'applied' : 'preview', backup: apply ? backup : null,
    changedEntries: Object.fromEntries(names.map(name => [name, changes.filter(item => item.file === name).length])),
    changedRows, rules: rules.map(({ id, note }) => ({ id, note, occurrences: counts[id] ?? 0 })),
    preserved, changes };
// A completed run with no further edits must not overwrite its earlier report.
if (!apply || changes.length) await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ mode: report.mode, changedEntries: report.changedEntries, changedRows,
    occurrences: counts, reportFile }, null, 2));
