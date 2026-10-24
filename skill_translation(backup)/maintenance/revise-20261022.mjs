// Apply the user's 2026-10-22 terminology corrections to translation values only.
// Does not build or update the separate index_chs.html preview page.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const core = require('../runtime.cjs')();
const value = '(?:\\{\\d+\\}|[0-9０-９]+(?:[.．][0-9０-９]+)?)';
const rules = [
    ['回復魔力', /恢復魔力/g, '回復魔力'],
    ['屬性敵人', /([火水樹光闇無])屬性的敵：/g, '$1屬性敵人：'],
    ['八卦之陣', /八卦的陣/g, '八卦之陣'],
    ['萬能之印', /萬能的印/g, '萬能之印'],
    ['本（武器種類）', /武器種類「書」|書之刻印|書角色|(?<=・)書(?=・)/g, text => text.replace('書', '本')],
    ['金縛', /定身/g, '金縛'],
    ['玩家經驗倍率', new RegExp('(獲得玩家經驗值' + value + '倍)變為', 'g'), '$1'],
    ['CT增加速度倍率', new RegExp('(CT增加速度(?:[火水樹光闇無]屬性角色)?' + value + '倍(?:[（(]自身(?:則)?' + value + '倍[）)])?)變為', 'g'), '$1'],
];
const ruleCounts = Object.fromEntries(rules.map(([label]) => [label, 0]));
function revise(text) {
    for (const [label, pattern, replacement] of rules) {
        ruleCounts[label] += [...text.matchAll(pattern)].length;
        text = text.replace(pattern, replacement);
    }
    return text;
}

const backups = path.join(root, 'backup/terminology-20261022');
await fs.mkdir(backups, { recursive: true });
const stats = {};
for (const filename of ['templates.zh-TW.json', 'exact.zh-TW.json', 'glossary.json']) {
    const file = path.join(root, 'translations', filename);
    const original = await fs.readFile(file, 'utf8');
    // Preserve the first pre-edit copy when rerunning this idempotent revision.
    await fs.writeFile(path.join(backups, filename), original, { flag: 'wx' }).catch(error => {
        if (error.code !== 'EEXIST') throw error;
    });
    const before = JSON.parse(original);
    const after = structuredClone(before);
    let changed = 0;
    if (filename === 'glossary.json') {
        for (const item of after) {
            if (item.preserve) continue;
            const target = revise(item.zhTW);
            changed += Number(target !== item.zhTW);
            item.zhTW = target;
        }
        for (const [ja, zhTW, note] of [
            ['回復魔力', '回復魔力'], ['金縛り', '金縛'],
            ['八卦の陣', '八卦之陣'], ['万能の印', '萬能之印'],
            ['本', '本', '僅指武器種類；秘書、書聖、書神、書記天使等非武器用語不替換。'],
        ]) {
            const existing = after.find(item => item.ja === ja);
            if (existing) {
                assert(!existing.preserve);
                changed += Number(existing.zhTW !== zhTW);
                existing.zhTW = zhTW;
                if (note) existing.note = note;
            } else {
                after.push({ ja, zhTW, ...(note ? { note } : {}) });
                changed++;
            }
        }
    } else {
        for (const [source, item] of Object.entries(after)) {
            const prior = typeof item === 'string' ? item : item.translation;
            const target = revise(prior);
            assert.deepEqual(core.placeholders(target), core.placeholders(prior));
            if (target === prior) continue;
            changed++;
            if (typeof item === 'string') after[source] = target;
            else item.translation = target;
        }
        assert.deepEqual(Object.keys(before), Object.keys(after));
        if (filename === 'exact.zh-TW.json') {
            for (const source of Object.keys(before)) {
                const { translation: ignoredBefore, ...metadataBefore } = before[source];
                const { translation: ignoredAfter, ...metadataAfter } = after[source];
                assert.deepEqual(metadataAfter, metadataBefore);
            }
        }
    }
    if (changed) await fs.writeFile(file, JSON.stringify(after, null, 2) + '\n', 'utf8');
    stats[filename] = changed;
}
const report = { date: '2026-10-22', changedEntries: stats, matchedOccurrences: ruleCounts,
    scope: 'Translation values and glossary only; original source keys, exception metadata and index_chs.html are untouched.' };
await fs.writeFile(path.join(root, 'reports/terminology-revision-20261022.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
