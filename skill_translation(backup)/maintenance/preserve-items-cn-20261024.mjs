import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from '../manage.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = await readJson(path.join(root, 'reports/items-compatibility-20261024.json'));
const overrides = await readJson(path.join(root, 'translations/overrides.zh-CN.json'));
const added = [];
for (const entry of report['skills_gb.json'].differences) {
    if (Object.hasOwn(overrides[entry.field], entry.source) && overrides[entry.field][entry.source] !== entry.before) throw new Error('Existing simplified override differs');
    overrides[entry.field][entry.source] = entry.before;
    added.push({ field: entry.field, source: entry.source, translation: entry.before });
}
await writeJson(path.join(root, 'translations/overrides.zh-CN.json'), overrides);
await writeJson(path.join(root, 'reports/items-cn-compatibility-overrides-20261024.json'), {
    reason: '新增物品專名保留詞不能改變原先簡體發布譯文；以精確覆寫保留本次更新前的值。', added,
});
console.log(JSON.stringify({ overrides: added.length }));
