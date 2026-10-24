import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import createCore from '../runtime.cjs';
const core = createCore();
const traditional = JSON.parse(await fs.readFile(new URL('../release/Skills/skills.json', import.meta.url), 'utf8'));
const simplified = JSON.parse(await fs.readFile(new URL('../release/Skills/skills_gb.json', import.meta.url), 'utf8'));

test('released translations preserve escaped line breaks and quantitative intensities', () => {
    assert.equal(core.describe('威力360％の攻撃\\n自身の攻撃力を少し上げ、進撃5％の追加効果(重複有り)', traditional), '威力360％的攻擊\\n小幅提升自身的攻擊力、進擊5％的附加效果(可疊加)');
    assert.equal(core.describe('1位の喜びが超運気を呼び込みアイテムドロップ率UP', traditional), '道具掉落率提升');
    assert.equal(core.describe('1位の喜びが運気を呼び込みアイテムドロップ率僅少UP', traditional), '道具掉落率微量提升');
    assert.equal(core.describe('威力150％の攻撃', simplified), '威力150％的攻击');
});
test('new values reuse a template; an added effect remains Japanese until translated', () => {
    assert.equal(core.describe('威力9876.54％の攻撃', traditional), '威力9876.54％的攻擊');
    const unknown = '威力9876.54％の攻撃・まだ存在しない追加効果';
    assert.equal(core.describe(unknown, traditional), unknown);
});
test('published script API preserves explicit EX skill names in both languages', () => {
    const original = '「ソラノカオリ」装備時にEXスキル"いじめないで！"（バトル開始時自身に現在HP99％ダメージ・全パラメータ30％上昇・確率で攻撃を躱す・バトル中1度だけ気絶するほどのダメージをうけてもHP1％で復活する）が解放';
    assert.ok(core.describe(original, traditional).includes('"いじめないで！"'));
    assert.ok(core.describe(original, simplified).includes('"いじめないで！"'));
});

test('new item names do not change approved simplified skill wording', () => {
    assert.equal(core.describe('「チンロン」に装備時：毎ターン開始時にHP15％回復', simplified), '「青龙」于装备时：每回合开始时HP15％恢复');
});

test('item EX titles survive mixed quotation styles without word-by-word corruption', () => {
    const original = 'その昔、大切な人からよく似たカバンを貰った。彼女はそこにたくさんの思い出を入れていた。中身はガラクタばかりに見える。EXスキル”思い出のカバン”：CT増加速度1.15倍・バトル中1度まで気絶するほどのダメージを受けてもHP50％で復活する、光属性キャラ：毎ターン開始時にHP30％回復';
    for (const dictionary of [traditional, simplified]) {
        const target = core.describe(original, dictionary);
        assert.ok(target.includes('EX技能「思い出のカバン」'));
        assert.ok(target.includes('HP50％'));
        assert.ok(target.includes('HP30％'));
        assert.ok(!target.includes('河馬'));
        assert.ok(!target.includes('河马'));
    }
});
