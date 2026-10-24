import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import createCore from './runtime.cjs';

const require = createRequire(import.meta.url);
export const SKILL_TABLES = ['MSkills', 'MMutationSkills'];
export const ITEM_TABLES = ['MMaterials', 'MWeapons', 'MAccessory', 'MItems', 'MFoods'];
export const DESCRIPTION_TABLES = [...SKILL_TABLES, ...ITEM_TABLES];
export const TABLES = [...DESCRIPTION_TABLES, 'MSkillMutationData'];
export const DEFAULT_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const core = createCore();
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sorted = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b, 'en')));
export function parseUniqueJson(text) {
    text = text.replace(/^\uFEFF/, '');
    const stack = [];
    for (const token of text.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\]]/g)) {
        const value = token[0];
        if (value === '{') stack.push(new Set());
        else if (value === '[') stack.push(null);
        else if (value === '}' || value === ']') stack.pop();
        else if (stack.at(-1) && /^\s*:/.test(text.slice(token.index + value.length))) {
            const key = JSON.parse(value);
            if (stack.at(-1).has(key)) throw new Error('Duplicate JSON key: ' + key);
            stack.at(-1).add(key);
        }
    }
    return JSON.parse(text);
}
export async function readJson(file, fallback) {
    try { return parseUniqueJson(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}
export async function atomicWrite(file, text) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = file + '.' + process.pid + '.tmp';
    try { await fs.writeFile(temporary, text, 'utf8'); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
}
export const writeJson = (file, data) => atomicWrite(file, JSON.stringify(data, null, 2) + '\n');
export async function loadCurrent(root, { allowLegacy = false } = {}) {
    const manifest = await readJson(path.join(root, 'source/current.json'));
    const tables = {};
    for (const name of TABLES) {
        if (!manifest.tables[name]) {
            if (allowLegacy && ITEM_TABLES.includes(name)) continue;
            throw new Error('Missing source table: ' + name + '. Run node manage.mjs sync to download all eight tables first.');
        }
        const file = path.join(root, manifest.tables[name].file);
        const bytes = await fs.readFile(file);
        if (hash(bytes) !== manifest.tables[name].sha256) throw new Error('Source hash mismatch: ' + name);
        tables[name] = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
        validateTable(name, tables[name]);
    }
    return { manifest, tables };
}
function validateTable(name, data) {
    if (!Array.isArray(data) || !data.length) throw new Error('Empty/non-array source: ' + name);
    const ids = new Set();
    for (const row of data) {
        if (!Number.isSafeInteger(row.id) || ids.has(row.id)) throw new Error('Invalid/duplicate ID in ' + name + ': ' + row.id);
        ids.add(row.id);
        if (name === 'MSkillMutationData') {
            for (const field of ['smi', 'umi', 'umsi']) if (!Array.isArray(row[field]) || row[field].some(id => !Number.isSafeInteger(id))) throw new Error('Invalid mutation mapping');
        } else if (typeof row.n !== 'string' || typeof row.d !== 'string' || !row.d.trim()) throw new Error('Invalid description in ' + name + ': ' + row.id);
    }
}
export async function loadTranslations(root) {
    return {
        templates: await readJson(path.join(root, 'translations/templates.zh-TW.json'), {}),
        exact: await readJson(path.join(root, 'translations/exact.zh-TW.json'), {}),
        simplified: await readJson(path.join(root, 'translations/overrides.zh-CN.json'), { templates: {}, exact: {} }),
        glossary: await readJson(path.join(root, 'translations/glossary.json'), []),
        retained: await readJson(path.join(root, 'translations/retained.json'), []),
    };
}
export function entries(tables) {
    return DESCRIPTION_TABLES.flatMap(table => (tables[table] ?? []).map(row => ({ table, id: row.id, name: row.n, source: row.d })));
}
export function dictionaryFrom(translations) {
    return { schemaVersion: 1, locale: 'zh-TW', templates: translations.templates,
        exact: Object.fromEntries(Object.entries(translations.exact).map(([key, record]) => [key, record.translation])) };
}
export function findPending(tables, translations) {
    const pending = new Map();
    const relations = new Map();
    for (const relation of tables.MSkillMutationData) {
        for (const id of new Set([relation.id, ...relation.smi, ...relation.umi, ...relation.umsi])) {
            if (!relations.has(id)) relations.set(id, []);
            relations.get(id).push(relation);
        }
    }
    for (const entry of entries(tables)) {
        if (Object.hasOwn(translations.exact, entry.source)) continue;
        const part = core.tokenize(entry.source);
        if (part && Object.hasOwn(translations.templates, part.key)) continue;
        const key = part?.key ?? entry.source;
        if (!pending.has(key)) pending.set(key, { key, kind: part ? 'template' : 'exact', examples: [], references: [] });
        const task = pending.get(key);
        task.references.push({ table: entry.table, id: entry.id, name: entry.name, mutationRelations: SKILL_TABLES.includes(entry.table) ? relations.get(entry.id) ?? [] : [] });
        if (task.examples.length < 3 && !task.examples.includes(entry.source)) task.examples.push(entry.source);
    }
    return [...pending.values()].sort((a, b) => a.key.localeCompare(b.key, 'ja'));
}
export async function writePending(root, tables, translations) {
    const pending = findPending(tables, translations);
    await atomicWrite(path.join(root, 'pending.jsonl'), pending.map(row => JSON.stringify(row)).join('\n') + (pending.length ? '\n' : ''));
    return pending;
}
export async function sync(root, sourceDir) {
    const hasPrevious = await fs.stat(path.join(root, 'source/current.json')).then(() => true).catch(error => { if (error.code === 'ENOENT') return false; throw error; });
    const previous = hasPrevious ? await loadCurrent(root, { allowLegacy: true }) : null;
    const fetched = await Promise.all(TABLES.map(async name => {
        const url = `https://otogimigwestsp.blob.core.windows.net/prodassets/MasterData/${name}.json`;
        let bytes, lastModified = null;
        if (sourceDir) bytes = await fs.readFile(path.join(sourceDir, name + '.json'));
        else {
            const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
            if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
            bytes = Buffer.from(await response.arrayBuffer()); lastModified = response.headers.get('last-modified');
        }
        const data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
        validateTable(name, data);
        return { name, url, bytes, data, lastModified, sha256: hash(bytes) };
    }));
    const tables = Object.fromEntries(fetched.map(item => [item.name, item.data]));
    const changes = { added: [], modified: [], removed: [], renamed: [] };
    for (const name of DESCRIPTION_TABLES) {
        const oldRows = new Map((previous?.tables[name] ?? []).map(row => [row.id, row]));
        for (const row of tables[name]) {
            const old = oldRows.get(row.id);
            if (!old) changes.added.push({ table: name, id: row.id, name: row.n, source: row.d });
            else {
                if (old.d !== row.d) changes.modified.push({ table: name, id: row.id, name: row.n, before: old.d, source: row.d });
                if (old.n !== row.n) changes.renamed.push({ table: name, id: row.id, before: old.n, name: row.n });
            }
            oldRows.delete(row.id);
        }
        for (const row of oldRows.values()) changes.removed.push({ table: name, id: row.id, name: row.n, source: row.d });
    }
    const manifest = { schemaVersion: 1, fetchedAt: new Date().toISOString(), tables: {} };
    for (const item of fetched) {
        const relative = `source/snapshots/${item.sha256}/${item.name}.json`;
        const output = path.join(root, relative);
        await fs.mkdir(path.dirname(output), { recursive: true });
        try { await fs.writeFile(output, item.bytes, { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
        manifest.tables[item.name] = { file: relative, sha256: item.sha256, count: item.data.length, url: item.url, lastModified: item.lastModified };
    }
    // All downloads, schema checks, and snapshot writes complete before changing the active snapshot.
    await writeJson(path.join(root, 'source/current.json'), manifest);
    const changeHash = hash(JSON.stringify(fetched.map(item => item.sha256)));
    const changed = fetched.some(item => previous?.manifest.tables[item.name]?.sha256 !== item.sha256);
    if (changed) await writeJson(path.join(root, 'source/history', manifest.fetchedAt.replace(/[:.]/g, '-') + '-' + changeHash + '.json'), { fetchedAt: manifest.fetchedAt, previous: previous?.manifest.tables ?? null, current: manifest.tables, changes });
    await writeJson(path.join(root, 'reports/latest-diff.json'), { ...Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value.length])), changes });
    const pending = await writePending(root, tables, await loadTranslations(root));
    return { tables: Object.fromEntries(fetched.map(item => [item.name, item.data.length])), changes: Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value.length])), pending: pending.length };
}
function numericValues(value) { return value.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g) ?? []; }
export function inspectTranslations(tables, translations) {
    const dictionary = core.validate(dictionaryFrom(translations));
    const pending = findPending(tables, translations);
    const errors = [];
    const retained = new Map(translations.retained.map(item => [item.source, item.reason]));
    let changed = 0;
    const names = new Set(entries(tables).map(entry => entry.name));
    const preservedSources = translations.glossary.filter(item => item.preserve).map(item => item.ja).sort((a, b) => b.length - a.length);
    const observed = new Set();
    const coverage = Object.fromEntries(DESCRIPTION_TABLES.map(table => [table, { rows: tables[table]?.length ?? 0, translatedRows: 0, retainedRows: 0, pendingRows: 0 }]));
    for (const entry of entries(tables)) {
        const target = core.describe(entry.source, dictionary);
        const covered = Object.hasOwn(dictionary.exact, entry.source) || Object.hasOwn(dictionary.templates, core.tokenize(entry.source)?.key ?? '');
        if (!covered) { coverage[entry.table].pendingRows++; continue; }
        if (target !== entry.source) { changed++; coverage[entry.table].translatedRows++; }
        else {
            coverage[entry.table].retainedRows++;
            if (!retained.has(entry.source)) errors.push('Unexplained unchanged description: ' + entry.table + '/' + entry.id);
        }
        if (!target.trim() || /\{\d+\}/.test(target)) errors.push('Empty/unresolved translation: ' + entry.id);
        const exact = translations.exact[entry.source];
        const effectiveSource = exact?.effectiveSource ?? entry.source;
        if (JSON.stringify(numericValues(effectiveSource).sort()) !== JSON.stringify(numericValues(target).sort())) errors.push('Numeric mismatch: ' + entry.table + '/' + entry.id);
        if (exact && (!exact.reason || typeof exact.effectiveSource !== 'string')) errors.push('Exact entry requires effectiveSource/reason: ' + entry.id);
        if (!observed.has(entry.source)) {
            observed.add(entry.source);
            // Japanese is allowed only inside known, explicitly preserved skill-name references.
            let residue = target;
            residue = residue.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => names.has(a ?? b ?? c) ? '' : all);
            for (const source of preservedSources) if (residue.includes(source)) residue = residue.split(source).join('');
            if (/[ぁ-ゖァ-ヺ]/.test(residue)) errors.push('Japanese residue: ' + entry.table + '/' + entry.id + ': ' + residue);
        }
    }
    return { dictionary, report: { schemaVersion: 1, rows: entries(tables).length, uniqueDescriptions: new Set(entries(tables).map(entry => entry.source)).size, translatedRows: changed, retainedRows: entries(tables).length - changed - pending.reduce((sum, task) => sum + task.references.length, 0), pending: pending.length, tables: coverage, errors: [...new Set(errors)] } };
}
export async function makeSimplified(tables, translations, traditional) {
    const OpenCC = require('opencc-js');
    const convert = OpenCC.Converter({ from: 'tw', to: 'cn' });
    const names = new Set(entries(tables).map(row => row.name));
    const preserved = translations.glossary.filter(item => item.preserve).map(item => item.ja).sort((a, b) => b.length - a.length);
    // Protect names with private-use tokens; only Chinese translation values are converted.
    const convertValue = text => {
        const slots = [];
        text = text.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => names.has(a ?? b ?? c) ? '\uE000' + (slots.push(all) - 1) + '\uE001' : all);
        for (const name of preserved) if (text.includes(name)) text = text.split(name).join('\uE000' + (slots.push(name) - 1) + '\uE001');
        return convert(text).replace(/\uE000(\d+)\uE001/g, (_, index) => slots[Number(index)]);
    };
    const output = { schemaVersion: 1, locale: 'zh-CN', templates: {}, exact: {} };
    for (const field of ['templates', 'exact']) for (const key of Object.keys(translations.simplified[field] ?? {})) {
        if (!Object.hasOwn(traditional[field], key)) throw new Error('Unknown simplified override key: ' + key);
    }
    for (const field of ['templates', 'exact']) for (const [key, value] of Object.entries(traditional[field])) {
        output[field][key] = translations.simplified[field]?.[key] ?? convertValue(value);
    }
    core.validate(output);
    for (const entry of entries(tables)) {
        const target = core.describe(entry.source, output);
        const effective = translations.exact[entry.source]?.effectiveSource ?? entry.source;
        if (JSON.stringify(numericValues(effective).sort()) !== JSON.stringify(numericValues(target).sort())) throw new Error('Simplified numeric mismatch: ' + entry.table + '/' + entry.id);
        if (/[ぁ-ゖァ-ヺ]/.test(target)) {
            let residue = target.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => names.has(a ?? b ?? c) ? '' : all);
            for (const item of preserved) residue = residue.split(item).join('');
            if (/[ぁ-ゖァ-ヺ]/.test(residue)) throw new Error('Simplified Japanese residue: ' + entry.id);
        }
    }
    return output;
}
export async function build(root) {
    const { manifest, tables } = await loadCurrent(root);
    const translations = await loadTranslations(root);
    const { dictionary, report } = inspectTranslations(tables, translations);
    await writePending(root, tables, translations);
    await writeJson(path.join(root, 'reports/validation.json'), report);
    if (report.pending || report.errors.length) throw new Error(`Build refused: ${report.pending} pending; ${report.errors.length} validation errors. Previous release preserved.`);
    const simplified = await makeSimplified(tables, translations, dictionary);
    // Prepare both languages before touching release files.
    const output = path.join(root, 'release/Skills');
    const prepared = [dictionary, simplified].map(item => JSON.stringify({ ...item, templates: sorted(item.templates), exact: sorted(item.exact) }) + '\n');
    for (const [index, filename] of ['skills.json', 'skills_gb.json'].entries()) await atomicWrite(path.join(output, filename), prepared[index]);
    await writeJson(path.join(root, 'release/build-info.json'), { builtAt: new Date().toISOString(), source: manifest.tables, ...report, files: { 'Skills/skills.json': hash(prepared[0]), 'Skills/skills_gb.json': hash(prepared[1]) } });
    return report;
}
export async function check(root) {
    const { tables } = await loadCurrent(root);
    const translations = await loadTranslations(root);
    const { dictionary, report } = inspectTranslations(tables, translations);
    for (const [name, expected] of [['skills.json', dictionary], ['skills_gb.json', await makeSimplified(tables, translations, dictionary)]]) {
        const actual = core.validate(await readJson(path.join(root, 'release/Skills', name)));
        for (const field of ['templates', 'exact']) if (JSON.stringify(sorted(actual[field])) !== JSON.stringify(sorted(expected[field]))) report.errors.push('Release out of date: ' + name + '/' + field);
        for (const table of DESCRIPTION_TABLES) {
            const transformed = core.translateRows(tables[table], actual).rows;
            for (let index = 0; index < transformed.length; index++) {
                const { d: before, ...left } = tables[table][index];
                const { d: after, ...right } = transformed[index];
                if (JSON.stringify(left) !== JSON.stringify(right)) report.errors.push('Non-description field changed: ' + table + '/' + index);
                if (/[\{]\d+[}]/.test(after)) report.errors.push('Unresolved release placeholder');
                const effective = translations.exact[before]?.effectiveSource ?? before;
                if (JSON.stringify(numericValues(effective).sort()) !== JSON.stringify(numericValues(after).sort())) report.errors.push('Release numeric mismatch: ' + name + '/' + table + '/' + index);
            }
        }
    }
    await writeJson(path.join(root, 'reports/check.json'), report);
    if (report.pending || report.errors.length) throw new Error(`Check failed: ${report.pending} pending; ${report.errors.length} errors`);
    return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2); const command = args.shift();
    const option = key => { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : undefined; };
    const root = path.resolve(option('--root') ?? DEFAULT_ROOT);
    try {
        let result;
        if (command === 'sync') result = await sync(root, option('--source-dir') && path.resolve(option('--source-dir')));
        else if (command === 'build') result = await build(root);
        else if (command === 'check') result = await check(root);
        else throw new Error('Usage: node manage.mjs sync|build|check [--root PATH] [--source-dir PATH]');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
