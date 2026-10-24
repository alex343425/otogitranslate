import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, loadCurrent, loadTranslations } from '../../manage.mjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const tasks = (await fs.readFile(path.join(directory, 'accessory_foods.parent3.pending.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const manual = JSON.parse(await fs.readFile(path.join(directory, 'accessory_foods.parent3.manual.json'), 'utf8'));
const { tables } = await loadCurrent(path.resolve(directory, '../..'));
const knownGlossary = (await loadTranslations(path.resolve(directory, '../..'))).glossary;
const names = new Set(Object.values(tables).flatMap(rows => rows.map(row => row.n).filter(Boolean)));
const output = {}, glossary = new Map();
for (const [index, task] of tasks.entries()) {
    const value = manual[index]?.replaceAll('索賽恩', '素材因');
    if (!value) throw new Error('Missing parent3 translation ' + index);
    if (JSON.stringify(core.placeholders(task.key)) !== JSON.stringify(core.placeholders(value))) throw new Error('Parent3 placeholder mismatch ' + index);
    output[task.key] = value;
    for (const ref of task.references) {
        const source = tables[ref.table].find(row => row.id === ref.id).d;
        const numbers = core.tokenize(source).values;
        const rendered = value.replace(/\{(\d+)\}/g, (_, slot) => numbers[Number(slot)]);
        for (const quote of rendered.matchAll(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g)) {
            const name = quote[1] ?? quote[2] ?? quote[3];
            if (/[ぁ-ゖァ-ヺ]/.test(name) && !names.has(name) && !knownGlossary.some(item => item.ja === name)) glossary.set(name, { ja: name, zhTW: name, preserve: true, reason: 'MAccessory 描述直接引用的 EX 技能、角色或物品／組織完整名稱；一般背景與效果已完整翻譯。' });
        }
    }
}
await fs.writeFile(path.join(directory, 'accessory_foods.parent3.translations.json'), JSON.stringify(output, null, 2) + '\n');
await fs.writeFile(path.join(directory, 'accessory_foods.parent3.glossary.json'), JSON.stringify([...glossary.values()], null, 2) + '\n');
console.log(JSON.stringify({ count: Object.keys(output).length, glossary: glossary.size }));
