// ==UserScript==
// @name         童话翻译V4
// @version      1.5
// @run-at       document-start
// @description  拦截指定路径的请求，修改内容并返回
// @author       红凯
// @match        https://otogi-rest.otogi-frontier.com/*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
// ==/UserScript==

// 0 = 使用繁體字， 1 = 使用簡體字
const SimplifiedChinese = 0
// 0 = 不使用角色翻譯， 1 = 使用角色翻譯
const CharChinese = 0
// 0 = 不翻譯技能／物品描述，1 = 翻譯描述（不更動名稱）
const SkillChinese = 1

var gb_text=""
if (SimplifiedChinese == 1){
    gb_text="_gb"}

(function () {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const nativeResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "response")?.get;

/* BEGIN OT0GI SKILL TRANSLATION CORE - copied verbatim into the userscript. */
function createOtogiSkillCore() {
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const numberPattern = /[0-9０-９]+(?:[.．][0-9０-９]+)?/g;
    function tokenize(source) {
        if (typeof source !== "string" || /\{\d+\}/.test(source)) return null;
        const values = [];
        const key = source.replace(numberPattern, value => "{" + (values.push(value) - 1) + "}");
        return { key, values };
    }
    function placeholders(text) {
        return [...text.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1])).sort((a, b) => a - b);
    }
    function validate(dictionary) {
        if (!dictionary || dictionary.schemaVersion !== 1 || !["zh-TW", "zh-CN"].includes(dictionary.locale)) {
            throw new Error("Unsupported skill dictionary format");
        }
        for (const field of ["templates", "exact"]) {
            const entries = dictionary[field];
            if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("Invalid " + field);
            for (const [source, target] of Object.entries(entries)) {
                if (!source || typeof target !== "string" || !target.trim()) throw new Error("Empty skill translation");
                if (field === "templates" && JSON.stringify(placeholders(source)) !== JSON.stringify(placeholders(target))) {
                    throw new Error("Skill placeholder mismatch: " + source);
                }
                if (field === "exact" && /\{\d+\}/.test(target)) throw new Error("Unresolved exact translation");
            }
        }
        return dictionary;
    }
    function describe(source, dictionary) {
        if (typeof source !== "string") return source;
        if (own(dictionary.exact, source)) return dictionary.exact[source];
        const parts = tokenize(source);
        if (!parts || !own(dictionary.templates, parts.key)) return source;
        const target = dictionary.templates[parts.key];
        if (JSON.stringify(placeholders(target)) !== JSON.stringify(placeholders(parts.key))) return source;
        return target.replace(/\{(\d+)\}/g, (_, index) => parts.values[Number(index)]);
    }
    function translateRows(rows, dictionary) {
        if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || Array.isArray(row) || typeof row.d !== "string")) {
            throw new Error("Unexpected skills table shape");
        }
        let changed = 0;
        const translated = rows.map(row => {
            const d = describe(row.d, dictionary);
            if (d === row.d) return row;
            changed++;
            return Object.assign({}, row, { d });
        });
        return { rows: translated, changed };
    }
    function isSkillUrl(url) {
        return typeof url === "string" && /(?:^|\/)MasterData\/(?:MSkills|MMutationSkills|MMaterials|MWeapons|MAccessory|MItems|MFoods)\.(?:gz|json)(?:[?#]|$)/.test(url);
    }
    return { tokenize, placeholders, validate, describe, translateRows, isSkillUrl };
}
/* END OT0GI SKILL TRANSLATION CORE */

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
            console.warn("[技能／物品翻譯] 字典載入或驗證失敗，保留原文。", error);
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
            const rows = JSON.parse(text.replace(/^\uFEFF/, ""));
            const result = skillCore.translateRows(rows, dictionary);
            if (!result.changed) return;
            const json = JSON.stringify(result.rows);
            const output = gzip ? pako.gzip(json) : new TextEncoder().encode(json);
            const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
            Object.defineProperty(xhr, "response", { value: buffer, configurable: true });
            xhr._otogiSkillResponsePatched = true;
            console.log("[技能／物品翻譯] 已替換描述 " + result.changed + "/" + rows.length + "，名稱與其他欄位保持原值。");
        } catch (error) {
            console.warn("[技能／物品翻譯] 回應處理失敗，保留原始回應。", error);
        }
    }

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._interceptedUrl = url;
        return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        if (this._otogiSkillResponsePatched) {
            delete this.response;
            this._otogiSkillResponsePatched = false;
        }
        this._otogiSkillHandled = false;
        if (url.includes("Assets/font")) {
            console.log("[重定向] 请求已被拦截并重定向到新的 Font。");
            //const newURL = "http://localhost:5000/replace-font"
            const newURL = "https://pub-b895df0a414541cbb44fd2c5871d14e0.r2.dev/font"
            arguments[1] = newURL;
        }

        this._interceptedUrl = url;
        prepareSkillResponse(this, url);
        return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("readystatechange", function () {
            if (this.readyState === 4 && SkillChinese === 1 && skillCore.isSkillUrl(this._interceptedUrl)) {
                translateSkillResponse(this);
            } else if (this.readyState === 4 && this._interceptedUrl.includes("api/MAdults/MonsterMAdults/")) {
                const lastPartOfUrl = this._interceptedUrl.split("/").pop();
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/MAdults/"+lastPartOfUrl+gb_text+".json?t="+ new Date().getTime();;
                        // 加入時間戳參數以避免快取
                        const translationData = loadTranslationJsonSync(translationJsonUrl);

                        if (translationData) {
                            originalJson = replaceUsingTranslation(originalJson, translationData);
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                        console.log("[拦截] 替换后的 ArrayBuffer 响应已返回给页面。");

                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }else if(this.readyState === 4 && this._interceptedUrl.includes("api/MScenes/")){
                const lastPartOfUrl = this._interceptedUrl.split("/").pop();
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/MScenes/"+lastPartOfUrl+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);

                        if (translationData) {
                            originalJson = replaceUsingTranslation(originalJson, translationData);
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                        console.log("[拦截] 替换后的 ArrayBuffer 响应已返回给页面。");

                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
			else if(this.readyState === 4 && this._interceptedUrl.includes("api/Episode/MStory")){
                const lastPartOfUrl = this._interceptedUrl.split("/").pop();
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/Mstory/"+lastPartOfUrl+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);

                        if (translationData) {
                            originalJson = replaceUsingTranslation(originalJson, translationData);
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                        console.log("[拦截] 替换后的 ArrayBuffer 响应已返回给页面。");

                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
			else if(this.readyState === 4 && this._interceptedUrl.includes("api/episode/monsters")){
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const MSceneId = originalJson["Episodes"][0]["MSceneId"];
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/MScenes/"+MSceneId+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);
                        if (translationData) {
                            originalJson["Episodes"][0]["Title"] = '[翻譯]' + originalJson["Episodes"][0]["Title"];
                            console.log("[拦截] 已確認該頁面有翻譯檔案");
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
            else if(this.readyState === 4 && this._interceptedUrl.includes("api/Episode/WorldStories") ){
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const MStoryId = originalJson[0]["MStoryId"];
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/Mstory/"+MStoryId+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);
                        if (translationData) {
                            originalJson[0]["Title"] = '[翻譯]' + originalJson[0]["Title"];
                            console.log("[拦截] 已確認該頁面有翻譯檔案");
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
            else if(this.readyState === 4 && this._interceptedUrl.includes("api/UAdventures/SideStories") ){
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const MSceneId = originalJson[0]["Adventures"][0]["MSceneId"];
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/EventVoice/"+MSceneId+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);
                        if (translationData) {
                            originalJson[0]["Adventures"][0]["Name"] = '[翻譯]' + originalJson[0]["Adventures"][0]["Name"];
                            console.log("[拦截] 已確認該頁面有翻譯檔案");
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
			else if(this.readyState === 4 && this._interceptedUrl.includes("api/EventVoice/Worlds")){
                const lastPartOfUrl = this._interceptedUrl.split("/").pop();
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();

                    try {
                        const originalText = textDecoder.decode(this.response);
                        let originalJson = JSON.parse(originalText);
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/EventVoice/"+lastPartOfUrl+gb_text+".json?t="+ new Date().getTime();;
                        const translationData = loadTranslationJsonSync(translationJsonUrl);

                        if (translationData) {
                            originalJson = replaceUsingTranslation(originalJson, translationData);
                        } else {
                            console.warn("[拦截] 未加载到译文 JSON，跳过替换。");
                        }
                        const modifiedText = JSON.stringify(originalJson);
                        const modifiedArrayBuffer = textEncoder.encode(modifiedText).buffer;
                        Object.defineProperty(this, "response", { value: modifiedArrayBuffer });
                        console.log("[拦截] 替换后的 ArrayBuffer 响应已返回给页面。");

                    } catch (e) {
                        console.error("[拦截] ArrayBuffer 转换或 JSON 解析失败：", e);
                    }
                }
            }
            else if(this.readyState === 4 && (this._interceptedUrl.includes("MasterData/MMonsters.gz")||this._interceptedUrl.includes("MasterData/MSpirits.gz")) && CharChinese == 1 ){
                if (this.responseType === "arraybuffer") {
                    const textDecoder = new TextDecoder();
                    const textEncoder = new TextEncoder();
                    try {
                        const originalGzip = new Uint8Array(this.response);
                        const decompressed = pako.ungzip(originalGzip, { to: 'string' });
                        let monstersData = JSON.parse(decompressed);

                        const translationData = loadTranslationJsonSync("https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/trans_dict.json?t="+ new Date().getTime());

                        if (translationData) {
                            monstersData = monstersData.map(monster => {
                                if (translationData[monster.n]) {
                                    monster.n = translationData[monster.n];
                                }
                                return monster;
                            });
                        }

                        const modifiedJson = JSON.stringify(monstersData);
                        const compressed = pako.gzip(modifiedJson);
                        Object.defineProperty(this, "response", { value: compressed.buffer });
                        console.log("[拦截] 已修改 MMonsters.gz 并返回。");
                    } catch (e) {
                        console.error("[拦截] 处理 MMonsters.gz 失败：", e);
                    }
                }
            }
        });
        return send.apply(this, arguments);
    };

    function loadTranslationJsonSync(url) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        try {
            xhr.send();
            if (xhr.status >= 200 && xhr.status < 300) {
                console.log("[拦截] 同步加载译文 JSON 成功：", url);
                const jsonText = xhr.responseText.replace(/^\uFEFF/, ""); // 去除 BOM
                return JSON.parse(jsonText);
            } else {
                console.error(`[拦截] 同步加载译文 JSON 失败，HTTP 状态码：${xhr.status}`);
                return null;
            }
        } catch (error) {
            console.error("[拦截] 同步加载译文 JSON 过程中出错：", error);
            return null;
        }
    }

    function interceptFontRequest(xhr, fontApiUrl) {
        const xhrFont = new XMLHttpRequest();
        xhrFont.open("GET", fontApiUrl, true);
        xhrFont.responseType = "arraybuffer";

        xhrFont.onload = function () {
            if (xhrFont.status >= 200 && xhrFont.status < 300) {
                console.log("[拦截] 从 Flask font API 加载字体成功。");
                Object.defineProperty(xhr, "response", { value: xhrFont.response });
                xhr.dispatchEvent(new Event("readystatechange")); // 手动触发事件通知
            } else {
                console.error(`[拦截] 加载 Flask font API 失败，HTTP 状态码：${xhrFont.status}`);
            }
        };

        xhrFont.onerror = function () {
            console.error("[拦截] 加载 Flask font API 时出错。");
        };

        xhrFont.send();
    }

function replaceUsingTranslation(data, translationDict) {
        // --- 第一階段：預處理 (為了匹配字典) ---
        if (typeof data === "string") {
            // 保留原始功能：將原文中的變數轉為特定稱呼以利字典比對
            data = data.replace(/%user_name/g, "人間さん");
            data = data.replace(/人間さん先生/g, "人間さん");
            data = data.replace(/人間さんさん/g, "人間さん");
            data = data.replace(/\\n/g, ' ');
        }

        // --- 第二階段：執行翻譯比對 ---
        let result = data;
        if (typeof data === "string" && translationDict[data]) {
            result = translationDict[data]; // 取得譯文
        } else if (Array.isArray(data)) {
            return data.map((item) => replaceUsingTranslation(item, translationDict));
        } else if (typeof data === "object" && data !== null) {
            const newData = {};
            for (const key in data) {
                newData[key] = replaceUsingTranslation(data[key], translationDict);
            }
            return newData;
        }

        // --- 第三階段：後處理 (確保遊戲內顯示變數) ---
        // 在這裡把所有翻譯後的稱呼，全部替換回 %user_name
        if (typeof result === "string") {
            result = result.replace(/人類君/g, "%user_name");
            result = result.replace(/人間君/g, "%user_name");
            result = result.replace(/人类君/g, "%user_name");
            result = result.replace(/人间君/g, "%user_name");
        }

        return result;
    }
})();