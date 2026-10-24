import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { core, loadCurrent, loadTranslations } from '../../manage.mjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const read = async name => JSON.parse(await fs.readFile(path.join(directory, 'accessory_foods.parent.' + name + '.json'), 'utf8'));
const tasks = (await fs.readFile(path.join(directory, 'accessory_foods.parent.pending.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const flavor = await read('flavor'), effects = await read('effects'), parts = await read('parts');
const translations = {}, glossary = new Map();
const { tables } = await loadCurrent(root);
const names = new Set(Object.values(tables).flatMap(rows => rows.map(row => row.n).filter(Boolean)));
const known = (await loadTranslations(root)).glossary;
const duplicateEffect = new Set([180, 182, 185, 188]);
for (const [index, task] of tasks.entries()) {
    const part = parts[index];
    const effect = effects[index] ?? (duplicateEffect.has(index) ? effects[137] : part.covered ? part.translated : undefined);
    if (!flavor[index] || (part.effect && !effect)) throw new Error('Incomplete parent translation ' + index);
    const value = part.effect ? flavor[index] + 'EX技能「' + part.skill + '」：' + effect : flavor[index];
    if (JSON.stringify(core.placeholders(task.key)) !== JSON.stringify(core.placeholders(value))) throw new Error('Parent placeholder mismatch ' + index);
    translations[task.key] = value;
    const sources = new Set([...task.examples, ...task.references.map(reference => tables[reference.table].find(row => row.id === reference.id).d)]);
    for (const source of sources) {
        const values = core.tokenize(source).values;
        const actual = value.replace(/\{(\d+)\}/g, (_, slot) => values[Number(slot)]);
        for (const quote of actual.matchAll(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g)) {
            const name = quote[1] ?? quote[2] ?? quote[3];
            if (/[ぁ-ゖァ-ヺ]/.test(name) && !names.has(name) && !known.some(item => item.preserve && item.ja === name)) glossary.set(name, { ja: name, zhTW: name, preserve: true, reason: 'MAccessory 描述明確引用的 EX 技能、角色版本或服裝／店名；保留來源名稱以利對照，不保留一般敘述。' });
        }
    }
}
for (const name of ['ミラマギ', 'カフェジャ', '放セカ', 'ミスラビ', 'コイカク', 'レリバニ']) glossary.set(name, { ja: name, zhTW: name, preserve: true, reason: 'MAccessory 背景敘述直接引用的服裝／店名縮稱，保留來源名稱。' });
for (const label of ['【ナ】', '【ヌ】', '【ネ】', '【ノ】']) glossary.set(label, { ja: label, zhTW: label, preserve: true, reason: 'MAccessory 謎題的發言者識別標籤，須保留原字才能對照題目；發言內容已完整翻譯。' });
await fs.writeFile(path.join(directory, 'accessory_foods.parent.translations.json'), JSON.stringify(translations, null, 2) + '\n');
await fs.writeFile(path.join(directory, 'accessory_foods.parent.glossary.json'), JSON.stringify([...glossary.values()], null, 2) + '\n');
console.log(JSON.stringify({ count: Object.keys(translations).length, reusedSkillEffects: parts.filter(part => part.covered).length, glossary: glossary.size }));
