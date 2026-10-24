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
        return typeof url === "string" && /(?:^|\/)MasterData\/(?:MSkills|MMutationSkills)\.(?:gz|json)(?:[?#]|$)/.test(url);
    }
    return { tokenize, placeholders, validate, describe, translateRows, isSkillUrl };
}
/* END OT0GI SKILL TRANSLATION CORE */
if (typeof module !== "undefined" && module.exports) module.exports = createOtogiSkillCore;
