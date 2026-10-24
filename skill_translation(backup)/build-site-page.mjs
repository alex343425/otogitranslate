// Build a standalone translated copy of the existing skill-search homepage.
// The website's data and filtering code remain in Japanese; only rendered descriptions change.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const core = require('./runtime.cjs')();
const site = path.resolve(process.argv[2] || 'C:/Users/user/Documents/GitHub/alex343425.github.io');
const destination = path.resolve(process.argv[3] || path.join(root, 'release/site/index_chs.html'));
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const dictionary = core.validate(await json(path.join(root, 'release/Skills/skills.json')));
assert.equal(dictionary.locale, 'zh-TW');
const current = await json(path.join(root, 'source/current.json'));
const master = (await Promise.all(['MSkills', 'MMutationSkills'].map(async table =>
    json(path.join(root, current.tables[table].file))))).flat();
const hasTranslation = source => Object.hasOwn(dictionary.exact, source) ||
    !!(core.tokenize(source) && Object.hasOwn(dictionary.templates, core.tokenize(source).key));

// The website joins the literal game-data \\n separators with a Japanese comma.
// Require an exact description match after that known formatting conversion, never an ID-only match.
const siteFormat = text => text.replace(/\\n|\r?\n/g, '、');
const formatted = new Map();
for (const row of master) {
    assert(hasTranslation(row.d), `Untranslated master description: ${row.id}`);
    const source = siteFormat(row.d);
    const target = siteFormat(core.describe(row.d, dictionary));
    if (formatted.has(source)) assert.equal(formatted.get(source), target, `Ambiguous description: ${source}`);
    formatted.set(source, target);
}

function translate(source) {
    // These site-authored Chinese annotations are not part of the game's descriptions.
    const noteIndex = source.search(/<br>(?:降抗搜尋：|降血技能：)/);
    const original = noteIndex < 0 ? source : source.slice(0, noteIndex);
    const notes = noteIndex < 0 ? '' : source.slice(noteIndex);
    const target = hasTranslation(original) ? siteFormat(core.describe(original, dictionary)) : formatted.get(original);
    return target === undefined ? null : target + notes;
}

const main = await json(path.join(site, 'data.json'));
const descriptionMap = new Map();
const counts = { main: { total: main.length, translated: 0 }, modal: {} };
function collect(rows, count, required) {
    for (const row of rows) {
        if (typeof row.description !== 'string') continue;
        count.total++;
        const target = translate(row.description);
        if (target === null) {
            assert(!required, `Untranslated site skill: ${row.skill_name}: ${row.description}`);
            continue;
        }
        assert(target.trim());
        assert(!/\{\d+\}/.test(target), 'Unresolved translation parameter');
        descriptionMap.set(row.description, target);
        count.translated++;
    }
}
counts.main.total = 0;
collect(main, counts.main, true);
for (const filename of (await fs.readdir(path.join(site, 'charjson'))).sort()) {
    if (!filename.endsWith('.json')) continue;
    const character = await json(path.join(site, 'charjson', filename));
    for (const [group, rows] of Object.entries(character)) {
        if (!Array.isArray(rows)) continue;
        const count = counts.modal[group] ||= { total: 0, translated: 0 };
        collect(rows, count, group === 'skill' || group === 'wep');
    }
}

const index = await fs.readFile(path.join(site, 'index.html'), 'utf8');
const script = await fs.readFile(path.join(site, 'script.js'), 'utf8');
let translatedScript = script;
const replacements = [
    ['let displayDescription = item.description;', 'let displayDescription = describeSkillZhTW(item.description);'],
    ['${s.description}', '${describeSkillZhTW(s.description)}'],
    ['${l.description}', '${describeSkillZhTW(l.description)}'],
    ['${w.description}', '${describeSkillZhTW(w.description)}'],
    ['${a.description}', '${describeSkillZhTW(a.description)}'],
];
for (const [original, replacement] of replacements) {
    assert.equal(translatedScript.split(original).length - 1, 1, `Unexpected rendering code: ${original}`);
    translatedScript = translatedScript.replace(original, replacement);
}
// Verify that reversing these five display-only edits restores the original script exactly.
let restoredScript = translatedScript;
for (const [original, replacement] of replacements) restoredScript = restoredScript.replace(replacement, original);
assert.equal(restoredScript, script);

const safeJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,
    char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
const helper = `// Traditional Chinese descriptions generated from the approved skill dictionary.\n` +
    `// Original data stays untouched so existing Japanese keyword filters keep working.\n` +
    `const skillDescriptionsZhTW = new Map(${safeJSON([...descriptionMap].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))});\n` +
    `function describeSkillZhTW(source) { return skillDescriptionsZhTW.get(source) ?? source; }\n`;
const program = helper + '\n' + translatedScript;
assert(!/<\/script/i.test(program), 'Unsafe inline script content');
new vm.Script(program, { filename: 'index_chs.html' });
const tag = /<script src="script\.js\?[^"\r\n]*"><\/script>/g;
assert.equal([...index.matchAll(tag)].length, 1, 'Unexpected homepage script tag');
const originalTag = index.match(tag)[0];
const replacementTag = `<script>\n${program}\n</script>`;
const output = index.replace(originalTag, () => replacementTag);
assert.equal(output.replace(replacementTag, originalTag), index, 'Unexpected HTML change');
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, output, 'utf8');
const report = { site, output: destination, ...counts, uniqueTranslatedDescriptions: descriptionMap.size,
    unchanged: ['index.html', 'script.js', 'data.json', 'charjson/*', 'all styles, controls, names and filters'],
    notes: 'Descriptions outside MSkills/MMutationSkills keep their original text when no approved translation exists.' };
await fs.writeFile(path.join(root, 'reports/site-page.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
