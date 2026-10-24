import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sync, build, check, core, writeJson, parseUniqueJson, ITEM_TABLES } from '../manage.mjs';

test('duplicate translation keys are rejected even with escaped names and nested objects', () => {
    assert.throws(() => parseUniqueJson('{"a":1,"\\u0061":2}'), /Duplicate/);
    assert.deepEqual(parseUniqueJson('{"a":{"same":1},"b":{"same":2},"text":"{\\\"a\\\":9}"}'), { a: { same: 1 }, b: { same: 2 }, text: '{"a":9}' });
});

test('exact, numbered templates, literals, unknown effects, and immutable names', () => {
    const dictionary = core.validate({ schemaVersion: 1, locale: 'zh-TW', exact: { '喜びが運気を呼び込みアイテムドロップ率UP': '道具掉落率提升' }, templates: { '威力{0}％の水属性{1}～{2}回攻撃': '威力{0}％的水屬性{1}～{2}次攻擊', 'CT{0}％増加\\n自身': 'CT增加{0}％\\n自身' } });
    assert.equal(core.describe('威力150.5％の水属性2～4回攻撃', dictionary), '威力150.5％的水屬性2～4次攻擊');
    assert.equal(core.describe('威力150％の水属性攻撃と新効果', dictionary), '威力150％の水属性攻撃と新効果');
    assert.equal(core.describe('喜びが運気を呼び込みアイテムドロップ率UP', dictionary), '道具掉落率提升');
    assert.equal(core.describe('CT100％増加\\n自身', dictionary), 'CT增加100％\\n自身');
    const original = [{ id: 1, n: '威力150.5％の水属性2～4回攻撃', il: '技\\n名', d: '威力150.5％の水属性2～4回攻撃', more: { a: [1, 2] } }];
    const copied = structuredClone(original);
    const result = core.translateRows(original, dictionary);
    assert.equal(result.changed, 1); assert.deepEqual(original, copied);
    assert.equal(result.rows[0].n, copied[0].n); assert.equal(result.rows[0].il, copied[0].il);
    assert.deepEqual(result.rows[0].more, copied[0].more);
    assert.throws(() => core.validate({ ...dictionary, templates: { '威力{0}': '威力{1}' } }), /mismatch/);
    assert.throws(() => core.validate({ ...dictionary, schemaVersion: 99 }));
    assert.equal(core.isSkillUrl('https://web-assets.otogi-frontier.com/prodassets/MasterData/MMutationSkills.gz?v=2'), true);
    assert.equal(core.isSkillUrl('https://example.com/MasterData/MSkillMutationData.gz'), false);
    assert.equal(core.isSkillUrl('https://example.com/MasterData/MSkills.gz.extra'), false);
});

test('sync preserves approvals, tracks changed/removed rows, and blocks incomplete releases', async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'otogi-skills-'));
    try {
        const root = path.join(temporary, 'work'), input = path.join(temporary, 'input');
        await fs.mkdir(input, { recursive: true });
        const put = async rows => {
            await writeJson(path.join(input, 'MSkills.json'), rows);
            await writeJson(path.join(input, 'MMutationSkills.json'), [{ id: 21, n: '変化技', d: '威力220％の攻撃' }]);
            await writeJson(path.join(input, 'MSkillMutationData.json'), [{ id: 1, smi: [21], umi: [], umsi: [] }]);
            for (const table of ITEM_TABLES) await writeJson(path.join(input, table + '.json'), [{ id: 1, n: '物品名', d: '威力150％の攻撃', stats: { hp: 20 }, link: null }]);
        };
        await put([{ id: 1, n: '技名', d: '威力150％の攻撃' }, { id: 2, n: '削除技', d: '威力160％の攻撃' }]);
        assert.equal((await sync(root, input)).pending, 1);
        const pendingTask = JSON.parse((await fs.readFile(path.join(root, 'pending.jsonl'), 'utf8')).trim());
        assert.deepEqual(pendingTask.references[0].mutationRelations, [{ id: 1, smi: [21], umi: [], umsi: [] }]);
        await writeJson(path.join(root, 'translations/templates.zh-TW.json'), { '威力{0}％の攻撃': '威力{0}％的攻擊' });
        await writeJson(path.join(root, 'translations/glossary.json'), []);
        assert.equal((await sync(root, input)).pending, 0);
        const duplicate = await sync(root, input);
        assert.deepEqual(duplicate.changes, { added: 0, modified: 0, removed: 0, renamed: 0 });
        assert.equal((await build(root)).rows, 8);
        await check(root);
        const release = await fs.readFile(path.join(root, 'release/Skills/skills.json'));
        const simplifiedRelease = await fs.readFile(path.join(root, 'release/Skills/skills_gb.json'));
        await writeJson(path.join(root, 'translations/overrides.zh-CN.json'), { templates: { '威力{0}％の攻撃': '威力{0}％的攻击2' }, exact: {} });
        await assert.rejects(build(root), /Simplified numeric mismatch/);
        assert.deepEqual(await fs.readFile(path.join(root, 'release/Skills/skills.json')), release);
        assert.deepEqual(await fs.readFile(path.join(root, 'release/Skills/skills_gb.json')), simplifiedRelease);
        await writeJson(path.join(root, 'translations/overrides.zh-CN.json'), { templates: {}, exact: {} });
        const approved = await fs.readFile(path.join(root, 'translations/templates.zh-TW.json'));
        await put([{ id: 1, n: '技名', d: '威力180％の攻撃' }, { id: 3, n: '新技', d: '威力190％の攻撃' }]);
        const numeric = await sync(root, input);
        assert.equal(numeric.pending, 0); assert.equal(numeric.changes.modified, 1); assert.equal(numeric.changes.removed, 1);
        await put([{ id: 1, n: '技名', d: '威力180％の攻撃・新効果' }, { id: 3, n: '新技', d: '威力190％の攻撃' }]);
        assert.equal((await sync(root, input)).pending, 1);
        await assert.rejects(build(root), /Build refused/);
        assert.deepEqual(await fs.readFile(path.join(root, 'release/Skills/skills.json')), release);
        assert.deepEqual(await fs.readFile(path.join(root, 'translations/templates.zh-TW.json')), approved);
        const current = await fs.readFile(path.join(root, 'source/current.json'));
        await writeJson(path.join(input, 'MMutationSkills.json'), [{ id: 21, n: 'bad' }]);
        await assert.rejects(sync(root, input), /Invalid description/);
        assert.deepEqual(await fs.readFile(path.join(root, 'source/current.json')), current);
    } finally {
        assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
        await fs.rm(temporary, { recursive: true, force: true });
    }
});
