import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sync, build, check, core, writeJson, readJson, ITEM_TABLES, TABLES, inspectTranslations, makeSimplified } from '../manage.mjs';

async function fixture(run) {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'otogi-items-'));
    try {
        const root = path.join(temporary, 'work'), input = path.join(temporary, 'input');
        await fs.mkdir(input, { recursive: true });
        await writeJson(path.join(input, 'MSkills.json'), [{ id: 1, n: '技名', d: '威力150％の攻撃' }]);
        await writeJson(path.join(input, 'MMutationSkills.json'), [{ id: 21, n: '変化技', d: '威力220％の攻撃' }]);
        await writeJson(path.join(input, 'MSkillMutationData.json'), [{ id: 1, smi: [21], umi: [], umsi: [] }]);
        for (const table of ITEM_TABLES) await writeJson(path.join(input, table + '.json'), [{ id: 1, n: table + 'の名前', d: '威力150％の攻撃', nested: { stats: [1, 2] }, msid: 21 }]);
        await run({ root, input });
    } finally {
        assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
        await fs.rm(temporary, { recursive: true, force: true });
    }
}

test('all seven description routes match json/gzip but relationship and unrelated tables do not', () => {
    for (const table of TABLES.filter(table => table !== 'MSkillMutationData')) {
        for (const extension of ['json', 'gz']) assert.equal(core.isSkillUrl('https://example.com/prodassets/MasterData/' + table + '.' + extension + '?v=1#x'), true);
        assert.equal(core.isSkillUrl('https://example.com/MasterData/' + table + '.json.extra'), false);
    }
    for (const table of ['MSkillMutationData', 'MMonsters', 'NotMItems']) assert.equal(core.isSkillUrl('https://example.com/MasterData/' + table + '.json'), false);
});

test('overlapping preserved names are validated and converted without breaking complete references', async () => {
    const tables = { MSkills: [{ id: 1, n: '技名', d: '「アルター・新しい名」の力' }], MMutationSkills: [], MSkillMutationData: [] };
    for (const table of ITEM_TABLES) tables[table] = [];
    const translations = {
        templates: { '「アルター・新しい名」の力': '「アルター・新しい名」的力量' }, exact: {},
        simplified: { templates: {}, exact: {} }, retained: [],
        glossary: [{ ja: 'アルター', preserve: true, reason: '系列名稱' }, { ja: 'アルター・新しい名', preserve: true, reason: '完整專名' }],
    };
    const { dictionary, report } = inspectTranslations(tables, translations);
    assert.deepEqual(report.errors, []);
    const simplified = await makeSimplified(tables, translations, dictionary);
    assert.equal(simplified.templates['「アルター・新しい名」の力'], '「アルター・新しい名」的力量');
});

test('old three-table snapshots upgrade safely and item IDs do not inherit skill relations', async () => fixture(async ({ root, input }) => {
    await sync(root, input);
    const manifest = await readJson(path.join(root, 'source/current.json'));
    for (const table of ITEM_TABLES) delete manifest.tables[table];
    await writeJson(path.join(root, 'source/current.json'), manifest);
    await assert.rejects(build(root), /Run node manage.mjs sync/);
    await assert.rejects(check(root), /Run node manage.mjs sync/);
    const result = await sync(root, input);
    assert.deepEqual(result.changes, { added: 5, modified: 0, removed: 0, renamed: 0 });
    assert.equal(result.pending, 1);
    const pending = JSON.parse((await fs.readFile(path.join(root, 'pending.jsonl'), 'utf8')).trim());
    assert.equal(pending.references.length, 7);
    for (const reference of pending.references) assert.equal(reference.mutationRelations.length, ITEM_TABLES.includes(reference.table) ? 0 : 1);
    await writeJson(path.join(root, 'translations/templates.zh-TW.json'), { '威力{0}％の攻撃': '威力{0}％的攻擊' });
    assert.equal((await build(root)).rows, 7);
    assert.deepEqual((await check(root)).errors, []);
}));

test('new item effects are pending, numeric changes reuse approval, and failed sync preserves all current data', async () => fixture(async ({ root, input }) => {
    await writeJson(path.join(root, 'translations/templates.zh-TW.json'), { '威力{0}％の攻撃': '威力{0}％的攻擊' });
    await sync(root, input);
    await build(root);
    const approved = await fs.readFile(path.join(root, 'release/Skills/skills.json'));
    await writeJson(path.join(input, 'MItems.json'), [{ id: 1, n: '道具', d: '威力300％の攻撃' }]);
    let result = await sync(root, input);
    assert.equal(result.pending, 0);
    assert.equal(result.changes.modified, 1);
    await writeJson(path.join(input, 'MItems.json'), [{ id: 1, n: '道具', d: '威力300％の攻撃と新効果' }]);
    result = await sync(root, input);
    assert.equal(result.pending, 1);
    await assert.rejects(build(root), /Build refused/);
    assert.deepEqual(await fs.readFile(path.join(root, 'release/Skills/skills.json')), approved);
    const current = await fs.readFile(path.join(root, 'source/current.json'));
    await fs.unlink(path.join(input, 'MFoods.json'));
    await assert.rejects(sync(root, input), /ENOENT/);
    assert.deepEqual(await fs.readFile(path.join(root, 'source/current.json')), current);
    await writeJson(path.join(input, 'MFoods.json'), [{ id: 1, n: '料理', d: ' ' }]);
    await assert.rejects(sync(root, input), /Invalid description/);
    assert.deepEqual(await fs.readFile(path.join(root, 'source/current.json')), current);
}));
