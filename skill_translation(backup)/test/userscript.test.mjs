import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { gzipSync, gunzipSync } from 'node:zlib';

const userscript = await fs.readFile(new URL('../../童話翻譯插件20261008.js', import.meta.url), 'utf8');
const sharedCore = (await fs.readFile(new URL('../runtime.cjs', import.meta.url), 'utf8')).split('\nif (typeof module')[0].trim();
const base = 'https://web-assets.otogi-frontier.com/prodassets/MasterData/';
const descriptionTables = ['MSkills', 'MMutationSkills', 'MMaterials', 'MWeapons', 'MAccessory', 'MItems', 'MFoods'];
const toBuffer = data => { const b = Buffer.from(data); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
function harness({ simplified = 0, characters = 0, skills = 1, dictionary, dictionaryStatus = 200 } = {}) {
    const resources = new Map(), requests = [], warnings = [];
    dictionary ??= { schemaVersion: 1, locale: simplified ? 'zh-CN' : 'zh-TW', templates: { '威力{0}％の攻撃': simplified ? '威力{0}％的攻击' : '威力{0}％的攻擊' }, exact: {} };
    class XHR {
        constructor() { this.readyState = 0; this.status = 0; this.responseType = ''; this.listeners = []; }
        get response() { return this._nativeResponse; }
        get responseText() { return this._nativeText; }
        open(method, url, async = true) { this.url = url; this.async = async; this.readyState = 1; }
        addEventListener(type, callback) { this.listeners.push([type, callback]); }
        send() {
            requests.push(this.url);
            let response = resources.get(this.url);
            if (this.url.includes('/Skills/skills')) response = { status: dictionaryStatus, body: JSON.stringify(dictionary) };
            response ??= { status: 404, body: '' };
            this.status = response.status;
            this._nativeResponse = toBuffer(typeof response.body === 'string' ? Buffer.from(response.body) : response.body);
            this._nativeText = typeof response.body === 'string' ? response.body : Buffer.from(response.body).toString('utf8');
            this.readyState = 4;
            // A consumer registered before send can run before the injected listener.
            this.onreadystatechange?.call(this);
            for (const [type, callback] of this.listeners) if (type === 'readystatechange') callback.call(this);
            this.onload?.call(this);
        }
    }
    const source = userscript.replace('const SimplifiedChinese = 0', 'const SimplifiedChinese = ' + simplified).replace('const CharChinese = 0', 'const CharChinese = ' + characters).replace('const SkillChinese = 1', 'const SkillChinese = ' + skills);
    vm.runInNewContext(source, { XMLHttpRequest: XHR, TextEncoder, TextDecoder, Uint8Array, pako: { gzip: text => new Uint8Array(gzipSync(text)), ungzip: bytes => gunzipSync(bytes).toString('utf8') }, console: { log() {}, warn(...args) { warnings.push(args); }, error(...args) { warnings.push(args); } } });
    return { XHR, resources, requests, warnings, request(url, body, status = 200) {
        resources.set(url, { status, body });
        const xhr = new XHR(); let observed;
        xhr.onreadystatechange = function () { if (this.readyState === 4) observed = this.response; };
        xhr.open('GET', url, true); xhr.responseType = 'arraybuffer'; xhr.send();
        return { xhr, observed };
    } };
}
const decode = buffer => { const bytes = Buffer.from(buffer); return JSON.parse((bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8')).replace(/^\uFEFF/, '')); };

test('userscript embeds the tested shared translation core exactly', () => {
    assert.ok(userscript.replace(/\r\n/g, '\n').includes(sharedCore));
});
for (const simplified of [0, 1]) for (const characters of [0, 1]) {
    test(`all seven routes, raw/gzip, one dictionary fetch, early consumers; locale=${simplified}, characters=${characters}`, () => {
        const h = harness({ simplified, characters });
        const rows = [{ id: 1, n: '日本語の技名', il: '日本語\\n技名', d: '威力150.5％の攻撃', ct: 20, sfi: [1] }];
        for (const table of descriptionTables) {
            const raw = h.request(base + table + '.json?v=2', '\uFEFF' + JSON.stringify(rows));
            const gzip = h.request(base + table + '.gz?version=3', gzipSync(JSON.stringify(rows)));
            for (const result of [raw, gzip]) {
                const output = decode(result.observed);
                assert.equal(output[0].d, simplified ? '威力150.5％的攻击' : '威力150.5％的攻擊');
                const { d, ...other } = output[0]; const { d: original, ...expected } = rows[0]; assert.deepEqual(other, expected);
                assert.deepEqual(decode(result.xhr.response), output);
            }
            assert.equal(Buffer.from(gzip.xhr.response)[0], 31);
        }
        assert.equal(h.requests.filter(url => url.includes('/Skills/skills')).length, 1);
        assert.ok(h.requests.some(url => url.includes(simplified ? '/Skills/skills_gb.json?' : '/Skills/skills.json?')));
        assert.equal(h.warnings.length, 0);
    });
}

test('unknown text and mutation links pass through unchanged; disabled toggle makes no dictionary request', () => {
    const h = harness(); const rows = [{ id: 1, n: '技', d: '新しい未翻訳の効果' }]; const bytes = gzipSync(JSON.stringify(rows));
    assert.deepEqual(Buffer.from(h.request(base + 'MSkills.gz', bytes).xhr.response), bytes);
    const links = [{ id: 1, smi: [21], umi: [], umsi: [] }];
    assert.deepEqual(decode(h.request(base + 'MSkillMutationData.gz', gzipSync(JSON.stringify(links))).xhr.response), links);
    const disabled = harness({ skills: 0 });
    for (const table of descriptionTables) assert.deepEqual(Buffer.from(disabled.request(base + table + '.gz', bytes).xhr.response), bytes);
    assert.equal(disabled.requests.filter(url => url.includes('/Skills/skills')).length, 0);
});

test('item routes detect actual compression and preserve nested non-description fields', () => {
    const h = harness();
    const rows = [{ id: 1, n: '日本語の物品名', d: '威力150％の攻撃', msid: 123, stats: { hp: 25, values: [1, 2] }, optional: null }];
    for (const table of descriptionTables.slice(2)) {
        const gzip = h.request(base + table + '.json', gzipSync(JSON.stringify(rows)));
        const raw = h.request(base + table + '.gz', JSON.stringify(rows));
        for (const result of [gzip, raw]) assert.deepEqual(decode(result.xhr.response), [{ ...rows[0], d: '威力150％的攻擊' }]);
        assert.equal(Buffer.from(gzip.xhr.response)[0], 31);
        assert.equal(Buffer.from(raw.xhr.response)[0], 91);
    }
    assert.equal(h.requests.filter(url => url.includes('/Skills/skills')).length, 1);
});

test('unknown item descriptions, corrupt payloads, and failed dictionaries retain original bytes', () => {
    for (const table of descriptionTables.slice(2)) {
        const unknown = gzipSync(JSON.stringify([{ id: 1, n: '物品', d: '新しい未翻訳の説明' }]));
        assert.deepEqual(Buffer.from(harness().request(base + table + '.gz', unknown).xhr.response), unknown);
        for (const body of [Buffer.from([31, 139, 0, 1]), Buffer.from('{bad'), Buffer.from('{"not":"a table"}')]) {
            const h = harness();
            assert.deepEqual(Buffer.from(h.request(base + table + '.gz', body).xhr.response), body);
            assert.ok(h.warnings.length);
        }
        const body = gzipSync(JSON.stringify([{ id: 1, n: '物品', d: '威力150％の攻撃' }]));
        assert.deepEqual(Buffer.from(harness({ dictionaryStatus: 404 }).request(base + table + '.gz', body).xhr.response), body);
    }
});

test('download, schema, locale, corrupt gzip, invalid JSON, and shape failures preserve original bytes', () => {
    const body = gzipSync(JSON.stringify([{ id: 1, n: '技', d: '威力150％の攻撃' }]));
    for (const options of [{ dictionaryStatus: 404 }, { dictionary: { schemaVersion: 99 } }, { dictionary: { schemaVersion: 1, locale: 'zh-CN', templates: {}, exact: {} } }]) {
        const h = harness(options); assert.deepEqual(Buffer.from(h.request(base + 'MSkills.gz', body).xhr.response), body); assert.ok(h.warnings.length);
    }
    for (const payload of [Buffer.from([31, 139, 0, 1]), Buffer.from('{bad'), Buffer.from('{"not":"a table"}')]) {
        const h = harness(); assert.deepEqual(Buffer.from(h.request(base + 'MSkills.gz', payload).xhr.response), payload); assert.ok(h.warnings.length);
    }
});

test('reusing one XHR clears the patched response and does not translate twice', () => {
    const h = harness();
    const first = h.request(base + 'MSkills.json', JSON.stringify([{ id: 1, n: '技', d: '威力150％の攻撃' }]));
    const secondUrl = base + 'MMutationSkills.json';
    h.resources.set(secondUrl, { status: 200, body: JSON.stringify([{ id: 2, n: '変化', d: '威力250％の攻撃' }]) });
    first.xhr.open('GET', secondUrl, true); first.xhr.responseType = 'arraybuffer'; first.xhr.send();
    assert.equal(decode(first.xhr.response)[0].d, '威力250％的攻擊');
    assert.equal(h.requests.filter(url => url.includes('/Skills/skills')).length, 1);
});

test('legacy story, character-name toggle, and font redirect still work', () => {
    const h = harness({ characters: 1 });
    // Match dynamic legacy dictionary URLs via a Map-compatible getter.
    const originalGet = h.resources.get.bind(h.resources);
    h.resources.get = function (url) {
        if (url.includes('/MScenes/123.json?t=')) return { status: 200, body: JSON.stringify({ 'こんにちは': '你好' }) };
        if (url.includes('/trans_dict.json?t=')) return { status: 200, body: JSON.stringify({ 'テスト': '測試' }) };
        return originalGet(url);
    };
    assert.equal(decode(h.request('https://otogi-rest.otogi-frontier.com/api/MScenes/123', JSON.stringify({ Text: 'こんにちは' })).xhr.response).Text, '你好');
    assert.deepEqual(decode(h.request(base + 'MMonsters.gz', gzipSync(JSON.stringify([{ n: 'テスト', d: '威力150％の攻撃' }]))).xhr.response), [{ n: '測試', d: '威力150％の攻撃' }]);
    const font = new h.XHR(); font.open('GET', 'https://otogi-rest.otogi-frontier.com/Assets/font');
    assert.equal(font.url, 'https://pub-b895df0a414541cbb44fd2c5871d14e0.r2.dev/font');
});
