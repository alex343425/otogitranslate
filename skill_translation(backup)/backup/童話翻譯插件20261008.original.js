// ==UserScript==
// @name         童话翻译V4
// @version      1.2
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

var gb_text=""
if (SimplifiedChinese == 1){
    gb_text="_gb"}

(function () {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._interceptedUrl = url;
        return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        if (url.includes("Assets/font")) {
            console.log("[重定向] 请求已被拦截并重定向到新的 Font。");
            //const newURL = "http://localhost:5000/replace-font"
            const newURL = "https://pub-b895df0a414541cbb44fd2c5871d14e0.r2.dev/font"
            arguments[1] = newURL;
        }

        this._interceptedUrl = url;
        return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("readystatechange", function () {
            if (this.readyState === 4 && this._interceptedUrl.includes("api/MAdults/MonsterMAdults/")) {
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