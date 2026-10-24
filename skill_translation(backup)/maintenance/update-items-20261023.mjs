import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, hash, inspectTranslations, loadCurrent, loadTranslations, readJson, writeJson } from '../manage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const batchRoot = path.join(root, 'maintenance/items-20261023');
const groups = ['materials', 'weapons_items', 'accessory_foods'];
const { manifest, tables } = await loadCurrent(root);
const translations = await loadTranslations(root);
const before = structuredClone(translations);
const reviewed = [];
const allTasks = [];
let addedTemplates = 0;
const glossaryAdditions = [];
const retainedAdditions = [];

for (const group of groups) {
    const tasks = (await fs.readFile(path.join(batchRoot, group + '.pending.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
    const additions = await readJson(path.join(batchRoot, group + '.normalized.translations.json'));
    const expected = new Set(tasks.map(task => task.key));
    allTasks.push(...tasks);
    for (const key of Object.keys(additions)) if (!expected.has(key)) throw new Error('Unexpected batch translation: ' + group + '/' + key);
    for (const task of tasks) {
        const value = additions[task.key];
        if (typeof value !== 'string' || !value.trim()) throw new Error('Missing batch translation: ' + group + '/' + task.key);
        if (task.kind !== 'template') throw new Error('Exact entry needs explicit review: ' + task.key);
        if (JSON.stringify(core.placeholders(task.key)) !== JSON.stringify(core.placeholders(value))) throw new Error('Batch placeholder mismatch: ' + group + '/' + task.key);
        if (Object.hasOwn(translations.templates, task.key)) {
            if (translations.templates[task.key] !== value) throw new Error('Approved translation differs: ' + task.key);
        } else {
            translations.templates[task.key] = value;
            addedTemplates++;
        }
    }
    for (const item of await readJson(path.join(batchRoot, group + '.normalized.glossary.json'))) {
        if (!item.ja || typeof item.zhTW !== 'string' || (item.preserve && !item.reason)) throw new Error('Invalid glossary addition: ' + JSON.stringify(item));
        const existing = translations.glossary.find(entry => entry.ja === item.ja);
        if (existing) {
            if (existing.zhTW !== item.zhTW) throw new Error('Glossary conflict: ' + item.ja);
        } else {
            translations.glossary.push(item);
            glossaryAdditions.push(item);
        }
    }
    for (const item of await readJson(path.join(batchRoot, group + '.retained.json'), [])) {
        if (!item.source || !item.reason) throw new Error('Invalid retained addition');
        if (!translations.retained.some(entry => entry.source === item.source)) {
            translations.retained.push(item);
            retainedAdditions.push(item);
        }
    }
    reviewed.push({ group, templates: tasks.length });
}

// Keep exact concrete names alongside numeric-name templates. Validation sees
// rendered source rows, while locale conversion also sees maintained templates.
let addedConcreteNames = 0;
for (const item of [...translations.glossary].filter(item => item.preserve && /\{\d+\}/.test(item.ja))) {
    for (const task of allTasks.filter(task => translations.templates[task.key]?.includes(item.ja))) {
        for (const reference of task.references) {
            const source = tables[reference.table].find(row => row.id === reference.id).d;
            const values = core.tokenize(source).values;
            const ja = item.ja.replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]);
            if (translations.glossary.some(entry => entry.ja === ja)) continue;
            const concrete = { ...item, ja, zhTW: ja, reason: item.reason + ' 對應目前來源快照的完整數值實例。' };
            translations.glossary.push(concrete);
            glossaryAdditions.push(concrete);
            addedConcreteNames++;
        }
    }
}

for (const [key, value] of Object.entries(before.templates)) if (translations.templates[key] !== value) throw new Error('Existing approved template changed');
const { report } = inspectTranslations(tables, translations);
await writeJson(path.join(root, 'reports/items-20261023-preflight.json'), report);
if (report.pending || report.errors.length) throw new Error(`Merge refused: ${report.pending} pending; ${report.errors.length} errors. See reports/items-20261023-preflight.json.`);

let backup = null;
if (addedTemplates || glossaryAdditions.length || retainedAdditions.length) {
    backup = 'backup/items-dictionary-' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.mkdir(path.join(root, backup), { recursive: true });
    for (const name of ['templates.zh-TW.json', 'glossary.json', 'retained.json']) await fs.copyFile(path.join(root, 'translations', name), path.join(root, backup, name));
    await writeJson(path.join(root, 'translations/templates.zh-TW.json'), translations.templates);
    await writeJson(path.join(root, 'translations/glossary.json'), translations.glossary);
    await writeJson(path.join(root, 'translations/retained.json'), translations.retained);
}
const result = {
    updatedAt: new Date().toISOString(), source: manifest.tables, addedTemplates,
    addedGlossary: glossaryAdditions.length, addedConcreteNames, addedRetained: retainedAdditions.length, backup,
    existingTemplatesUnchanged: true,
    exactDictionarySha256: hash(await fs.readFile(path.join(root, 'translations/exact.zh-TW.json'))),
    validation: report, reviewed, glossaryAdditions, retainedAdditions,
};
await writeJson(path.join(root, 'reports/items-update-20261023.json'), result);
console.log(JSON.stringify({ addedTemplates, addedGlossary: result.addedGlossary, addedRetained: result.addedRetained, backup, validation: report }, null, 2));
