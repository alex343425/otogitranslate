// ==UserScript==
// @name         童话翻译V2
// @version      1.0
// @description  拦截指定路径的请求，修改内容并返回
// @author       红凯
// @match        https://otogi-rest.otogi-frontier.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

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
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/MAdults/"+lastPartOfUrl+".json?t="+ new Date().getTime();;
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
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/MScenes/"+lastPartOfUrl+".json?t="+ new Date().getTime();;
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
                        const translationJsonUrl = "https://raw.githubusercontent.com/alex343425/otogitranslate/refs/heads/main/Mstory/"+lastPartOfUrl+".json?t="+ new Date().getTime();;
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
                return JSON.parse(xhr.responseText);
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
		// 先进行 `%user_name` 的替换
		if (typeof data === "string") {
			// 如果字符串包含 "%user_name"，先替换成 "人間さん"
			data = data.replace(/%user_name/g, "人間さん");
			data = data.replace(/人間さん先生/g, "人間さん");
			data = data.replace(/人間さんさん/g, "人間さん");
            data = data.replace(/\\n/g,' ')

		}


		// 现在再检查是否可以从 translationDict 中替换
		if (typeof data === "string" && translationDict[data]) {
			return translationDict[data]; // 替换为译文 JSON 中的对应值
		} else if (Array.isArray(data)) {
			return data.map((item) => replaceUsingTranslation(item, translationDict));
		} else if (typeof data === "object" && data !== null) {
			const newData = {};
			for (const key in data) {
				newData[key] = replaceUsingTranslation(data[key], translationDict);
			}
			return newData;
		}
		return data;
	}

})();