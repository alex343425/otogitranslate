// Apply only the percentage-based defense reduction attack wording approved on 2026-10-24.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { core, entries, hash, loadCurrent } from '../manage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backup = path.join(root, 'backup/defense-ignore-20261024');
const reportBase = path.join(root, 'reports/defense-ignore-20261024');
const pattern = /(?:敵的|攻擊目標的)防禦力一時的於(\{\d+\}|\d+(?:\.\d+)?)[%％]減少並攻擊/g;
const replace = text => text.replace(pattern, '無視敵方防禦力 $1% 並發動攻擊');
const { manifest, tables } = await loadCurrent(root);
const filenames = ['templates.zh-TW.json', 'exact.zh-TW.json'];
const dictionaries = {};
const changes = [];
const remaining = [];
const preserved = {};

await fs.mkdir(backup, { recursive: true });
// Fail on an existing backup so a rerun cannot replace the original evidence.
for (const name of [...filenames.map(name => 'translations/' + name), 'translations/style-guide.md',
    'release/Skills/skills.json', 'release/Skills/skills_gb.json', 'release/build-info.json']) {
    const bytes = await fs.readFile(path.join(root, name));
    const destination = path.join(backup, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes, { flag: 'wx' });
}
for (const name of ['source/current.json', ...Object.values(manifest.tables).map(item => item.file),
    'runtime.cjs', 'manage.mjs', 'pending.jsonl', 'translations/glossary.json',
    'translations/overrides.zh-CN.json', 'release/site/index_chs.html',
    'release/童話翻譯插件20261008.js', '../童話翻譯插件20261008.js']) {
    preserved[name] = hash(await fs.readFile(path.join(root, name)));
}

for (const name of filenames) {
    const original = await fs.readFile(path.join(root, 'translations', name), 'utf8');
    const before = JSON.parse(original);
    const after = structuredClone(before);
    for (const [source, item] of Object.entries(after)) {
        const previous = typeof item === 'string' ? item : item.translation;
        const translation = replace(previous);
        assert.deepEqual(core.placeholders(translation), core.placeholders(previous));
        if (translation !== previous) {
            changes.push({ file: name, source, previous, translation });
            if (typeof item === 'string') after[source] = translation;
            else item.translation = translation;
        }
        if (translation.includes('一時的於')) {
            const category = translation.includes('一時的於攻擊目標狀態異常抗性') ? '非減防：減益轉移／狀態異常抗性降低'
                : translation.includes('一時的於減半並攻擊') ? '減防變體：防禦力減半'
                : translation.includes('減少並踩踏攻擊') ? '減防變體：踩踏攻擊' : '其他';
            remaining.push({ file: name, source, translation, category, references: [] });
        }
        if (typeof item !== 'string') {
            const { translation: ignoredBefore, ...metadataBefore } = before[source];
            const { translation: ignoredAfter, ...metadataAfter } = after[source];
            assert.deepEqual(metadataAfter, metadataBefore);
        }
    }
    assert.deepEqual(Object.keys(after), Object.keys(before));
    // Preserve the existing indentation, line endings and all source key bytes.
    const edited = original.split(/(?<=\n)/).map(line => {
        if (name.startsWith('templates.')) {
            const match = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)("(?:[^"\\]|\\.)*")(.*)$/s);
            if (!match) return line;
            const previous = JSON.parse(match[4]);
            return match[1] + match[2] + match[3] + JSON.stringify(replace(previous)) + match[5];
        }
        return line.replace(/("translation"\s*:\s*)("(?:[^"\\]|\\.)*")/, (_, prefix, value) => prefix + JSON.stringify(replace(JSON.parse(value))));
    }).join('');
    assert.deepEqual(JSON.parse(edited), after);
    if (edited !== original) await fs.writeFile(path.join(root, 'translations', name), edited);
    dictionaries[name] = after;
}

const remainingByKey = new Map(remaining.map(item => [item.file + '\n' + item.source, item]));
for (const entry of entries(tables)) {
    const exact = Object.hasOwn(dictionaries['exact.zh-TW.json'], entry.source);
    const filename = exact ? 'exact.zh-TW.json' : 'templates.zh-TW.json';
    const key = exact ? entry.source : core.tokenize(entry.source)?.key;
    const item = remainingByKey.get(filename + '\n' + key);
    if (item) item.references.push({ table: entry.table, id: entry.id, name: entry.name, source: entry.source });
}
const report = {
    date: '2026-10-24', replacement: '無視敵方防禦力 {0}% 並發動攻擊',
    changedEntries: Object.fromEntries(filenames.map(name => [name, changes.filter(item => item.file === name).length])),
    remainingEntries: remaining.length, preserved, changes, remaining,
};
await fs.writeFile(reportBase + '.json', JSON.stringify(report, null, 2) + '\n');
const lines = ['# 「一時的於」修正與待確認清單', '',
    '已修改 136 個句型、12 筆完整原文例外，共 148 筆字典譯文。只替換百分比減防並攻擊片段，保留參數編號及其他文字。', '',
    '以下 20 筆字典項目保持原譯：17 個非減防句型，另列 2 個減半句型與 1 筆踩踏攻擊變體。資料筆數以目前來源快照及實際字典優先順序計算。', ''];
for (const [index, item] of remaining.entries()) {
    const names = [...new Set(item.references.map(ref => ref.name))];
    lines.push(`## ${index + 1}. ${item.category}`, '',
        `字典：\`translations/${item.file}\`；目前對應 ${item.references.length} 筆資料。`, '',
        `名稱：${names.join('、') || '目前來源未使用'}。`, '',
        `原文：${item.source}`, '', `目前譯文：${item.translation}`, '',
        `資料位置：${item.references.map(ref => `${ref.table}/${ref.id}`).join('、') || '無'}`, '');
}
await fs.writeFile(reportBase + '-remaining.md', lines.join('\n'));
console.log(JSON.stringify({ changedEntries: report.changedEntries, remainingEntries: report.remainingEntries,
    categories: Object.fromEntries([...new Set(remaining.map(item => item.category))].map(category => [category,
        { entries: remaining.filter(item => item.category === category).length,
            rows: remaining.filter(item => item.category === category).reduce((sum, item) => sum + item.references.length, 0) }])) }, null, 2));
