import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(root, '../童話翻譯插件20261008.js');
let source = await fs.readFile(target, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
const core = (await fs.readFile(path.join(root, 'runtime.cjs'), 'utf8')).split('\nif (typeof module')[0].trim();
const existing = /\/\* BEGIN OT0GI SKILL TRANSLATION CORE[\s\S]*?\/\* END OT0GI SKILL TRANSLATION CORE \*\//;
if (existing.test(source)) source = source.replace(existing, () => core);
else {
    await fs.mkdir(path.join(root, 'backup'), { recursive: true });
    await fs.copyFile(target, path.join(root, 'backup/童話翻譯插件20261008.original.js'), fs.constants.COPYFILE_EXCL);
    source = source.replace('// @version      1.2', '// @version      1.3\n// @run-at       document-start');
    source = source.replace('const CharChinese = 0', 'const CharChinese = 0\n// 0 = 不翻譯技能描述，1 = 翻譯技能描述（不更動技能名）\nconst SkillChinese = 1');
    source = source.replace('    const send = XMLHttpRequest.prototype.send;', `    const send = XMLHttpRequest.prototype.send;
    const nativeResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "response")?.get;

${core}

    const skillCore = createOtogiSkillCore();
    let skillDictionaryAttempted = false;
    let skillDictionary = null;
    function getSkillDictionaryOnce() {
        if (skillDictionaryAttempted) return skillDictionary;
        skillDictionaryAttempted = true;
        try {
            const url = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/Skills/skills" + gb_text + ".json?t=" + Date.now();
            const dictionary = loadTranslationJsonSync(url);
            skillCore.validate(dictionary);
            if (dictionary.locale !== (SimplifiedChinese === 1 ? "zh-CN" : "zh-TW")) throw new Error("技能字典語系不符");
            skillDictionary = dictionary;
        } catch (error) {
            console.warn("[技能翻譯] 字典載入或驗證失敗，保留原文。", error);
        }
        return skillDictionary;
    }
    function prepareSkillResponse(xhr, url) {
        if (SkillChinese !== 1 || !skillCore.isSkillUrl(url) || !nativeResponseGetter) return;
        Object.defineProperty(xhr, "response", { configurable: true, get: function () {
            const original = nativeResponseGetter.call(this);
            if (this.readyState === 4) {
                translateSkillResponse(this, original);
                const current = Object.getOwnPropertyDescriptor(this, "response");
                if (current && "value" in current) return current.value;
            }
            return original;
        } });
        xhr._otogiSkillResponsePatched = true;
    }
    function translateSkillResponse(xhr, original) {
        if (xhr._otogiSkillHandled) return;
        xhr._otogiSkillHandled = true;
        if (xhr.responseType !== "arraybuffer" || xhr.status < 200 || xhr.status >= 300) return;
        try {
            const dictionary = getSkillDictionaryOnce();
            if (!dictionary) return;
            const raw = original === undefined ? (nativeResponseGetter ? nativeResponseGetter.call(xhr) : xhr.response) : original;
            const bytes = new Uint8Array(raw);
            const gzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
            const text = gzip ? pako.ungzip(bytes, { to: "string" }) : new TextDecoder().decode(bytes);
            const rows = JSON.parse(text.replace(/^\\uFEFF/, ""));
            const result = skillCore.translateRows(rows, dictionary);
            if (!result.changed) return;
            const json = JSON.stringify(result.rows);
            const output = gzip ? pako.gzip(json) : new TextEncoder().encode(json);
            const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
            Object.defineProperty(xhr, "response", { value: buffer, configurable: true });
            xhr._otogiSkillResponsePatched = true;
            console.log("[技能翻譯] 已替換描述 " + result.changed + "/" + rows.length + "，技能名稱保持原文。");
        } catch (error) {
            console.warn("[技能翻譯] 回應處理失敗，保留原始回應。", error);
        }
    }`);
    source = source.replace('        if (url.includes("Assets/font")) {', `        if (this._otogiSkillResponsePatched) {
            delete this.response;
            this._otogiSkillResponsePatched = false;
        }
        this._otogiSkillHandled = false;
        if (url.includes("Assets/font")) {`);
    const condition = '            if (this.readyState === 4 && this._interceptedUrl.includes("api/MAdults/MonsterMAdults/")) {';
    if (!source.includes(condition)) throw new Error('Unexpected userscript integration point');
    source = source.replace(condition, `            if (this.readyState === 4 && SkillChinese === 1 && skillCore.isSkillUrl(this._interceptedUrl)) {
                translateSkillResponse(this);
            } else if (this.readyState === 4 && this._interceptedUrl.includes("api/MAdults/MonsterMAdults/")) {`);
    source = source.replace('        this._interceptedUrl = url;\n        return open.apply(this, arguments);\n    };\n\n    XMLHttpRequest.prototype.send', '        this._interceptedUrl = url;\n        prepareSkillResponse(this, url);\n        return open.apply(this, arguments);\n    };\n\n    XMLHttpRequest.prototype.send');
}
source = source.replace('// @version      1.3', '// @version      1.4');
source = source.replace('// 0 = 不翻譯技能描述，1 = 翻譯技能描述（不更動技能名）', '// 0 = 不翻譯技能／物品描述，1 = 翻譯描述（不更動名稱）');
source = source.replaceAll('[技能翻譯]', '[技能／物品翻譯]');
source = source.replace('，技能名稱保持原文。', '，名稱與其他欄位保持原值。');
await fs.writeFile(target, source.replace(/\n/g, newline), 'utf8');
console.log('Updated userscript; original preserved in skill_translation/backup.');
