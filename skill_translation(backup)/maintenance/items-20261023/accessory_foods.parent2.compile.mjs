import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, loadCurrent } from '../../manage.mjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const tasks = (await fs.readFile(path.join(directory, 'accessory_foods.parent2.pending.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const parts = new Map(JSON.parse(await fs.readFile(path.join(directory, 'accessory_foods.work.parts.json'), 'utf8')).map(part => [part.key, part]));
const flavors = JSON.parse(await fs.readFile(path.join(directory, 'accessory_foods.parent2.flavor.json'), 'utf8'));
const { tables } = await loadCurrent(path.resolve(directory, '../..'));
const output = {}, glossary = new Map();
for (const [index, task] of tasks.entries()) {
    const part = parts.get(task.key);
    if (!flavors[index] || !part?.tail) throw new Error('Missing parent2 flavor/tail ' + index);
    const value = (flavors[index] + part.tail).replace(/((?:獲得(?:玩家|角色)?經驗值|CT增加速度)(?:\{\d+\}|[0-9]+(?:\.[0-9]+)?)倍)變為/g, '$1');
    if (JSON.stringify(core.placeholders(task.key)) !== JSON.stringify(core.placeholders(value))) throw new Error('Parent2 placeholder mismatch ' + index);
    output[task.key] = value;
    for (const ref of task.references) {
        const source = tables[ref.table].find(row => row.id === ref.id).d;
        const numbers = core.tokenize(source).values;
        const rendered = value.replace(/\{(\d+)\}/g, (_, slot) => numbers[Number(slot)]);
        for (const quote of rendered.matchAll(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g)) {
            const name = quote[1] ?? quote[2] ?? quote[3];
            if (/[ぁ-ゖァ-ヺ]/.test(name)) glossary.set(name, { ja: name, zhTW: name, preserve: true, reason: 'MAccessory 描述明確引用的角色、道具或 EX 技能完整名稱；描述正文已翻譯，引用名稱保留以利對照。' });
        }
    }
}
await fs.writeFile(path.join(directory, 'accessory_foods.parent2.translations.json'), JSON.stringify(output, null, 2) + '\n');
await fs.writeFile(path.join(directory, 'accessory_foods.parent2.glossary.json'), JSON.stringify([...glossary.values()], null, 2) + '\n');
console.log(JSON.stringify({ count: Object.keys(output).length, glossary: glossary.size }));
