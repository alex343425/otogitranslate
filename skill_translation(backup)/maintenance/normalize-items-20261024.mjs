import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTranslations, readJson, writeJson, hash } from '../manage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'maintenance/items-20261023');
const groups = ['materials', 'weapons_items', 'accessory_foods'];
const finalReview = await readJson(path.join(directory, 'final-review.zh-TW.json'), {});
const current = await loadTranslations(root);
const approved = new Map(current.glossary.map(entry => [entry.ja, entry]));
const knownNames = { ...await readJson(path.join(directory, 'materials.names.json')), ...await readJson(path.join(root, 'translations/names.json')) };
const shared = { 'デンデン': '蝸蝸', 'メタルデンデン': '金屬蝸蝸', 'ソザイン': '素材因', 'ソザイン幸代': '素材因幸代', 'ソザイン工石': '素材因工石' };
const batches = [];
const candidates = new Map();
for (const group of groups) {
    const values = await readJson(path.join(directory, group + '.translations.json'));
    const glossary = await readJson(path.join(directory, group + '.glossary.json'), []);
    batches.push({ group, values, glossary });
    for (const entry of glossary) {
        if (!candidates.has(entry.ja)) candidates.set(entry.ja, []);
        candidates.get(entry.ja).push(entry);
    }
}
const canonical = new Map();
for (const [ja, options] of candidates) {
    const known = knownNames[ja];
    const preferred = approved.get(ja) ?? (shared[ja] ? { ja, zhTW: shared[ja], note: '本次物品描述批次統一用語。' } :
        typeof known === 'string' && known.trim() && !/[ぁ-ゖァ-ヺ]/.test(known) ? { ja, zhTW: known, note: '精確沿用本機既有完整字典對照；主術語表及技能名稱字典優先。' } :
        options.find(entry => !entry.preserve) ?? options[0]);
    canonical.set(ja, preferred);
}

const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const changes = [];
for (const batch of batches) {
    const normalized = {};
    const extraReferences = new Map();
    for (const [source, original] of Object.entries(batch.values)) {
        const aliases = new Map();
        for (const [ja, options] of candidates) {
            if (!source.includes(ja)) continue;
            const preferred = canonical.get(ja).zhTW;
            if (ja !== preferred) aliases.set(ja, preferred);
            for (const option of options) if (option.zhTW !== preferred) aliases.set(option.zhTW, preferred);
        }
        // Replace complete quoted references, never just a prefix of a longer
        // preserved name. Narrative aliases are replaced in one longest-first pass.
        const slots = [];
        let value = original.replace(/「([^」]+)」|『([^』]+)』|"([^"]+)"/g, (all, a, b, c) => {
            const name = a ?? b ?? c;
            const target = aliases.get(name) ?? (name.endsWith('之證') && aliases.has(name.slice(0, -2)) ? aliases.get(name.slice(0, -2)) + '之證' : undefined);
            const quoted = target ? (a !== undefined ? '「' + target + '」' : b !== undefined ? '『' + target + '』' : '"' + target + '"') : all;
            return '\uE000' + (slots.push(quoted) - 1) + '\uE001';
        });
        const safeAliases = [...aliases].filter(([before]) => before.length > 1);
        if (safeAliases.length) value = value.replace(new RegExp(safeAliases.map(([before]) => before).sort((a, b) => b.length - a.length).map(escaped).join('|'), 'g'), before => aliases.get(before));
        value = value.replace(/\uE000(\d+)\uE001/g, (_, index) => slots[Number(index)]);
        const skillName = source.match(/EXスキル(?:名)?[『「"”“]*([^"”“」』]+)["”“」』]/)?.[1]?.replace(/\\+$/, '');
        if (skillName) {
            const known = canonical.get(skillName) ?? approved.get(skillName);
            const title = known && !known.preserve ? known.zhTW : skillName;
            value = value.replace(/EX(?:技能|スキル)(?:名)?[『「"”“]+[^"”“」』]+["”“」』]+/g, 'EX技能「' + title + '」');
            if (title === skillName && /[ぁ-ゖァ-ヺ]/.test(title) && !approved.has(title)) extraReferences.set(title, {
                ja: title, zhTW: title, preserve: true, reason: '來源 d 明確標示的完整 EX 技能名稱；保持原名，避免不同引號樣式造成局部詞彙翻譯。',
            });
        }
        value = finalReview[source] ?? value;
        normalized[source] = value;
        if (value !== original) changes.push({ group: batch.group, source, before: original, after: value });
    }
    const glossary = [...new Set(batch.glossary.map(entry => entry.ja))].filter(ja => !approved.has(ja)).map(ja => canonical.get(ja));
    for (const entry of extraReferences.values()) if (!glossary.some(item => item.ja === entry.ja)) glossary.push(entry);
    await writeJson(path.join(directory, batch.group + '.normalized.translations.json'), normalized);
    await writeJson(path.join(directory, batch.group + '.normalized.glossary.json'), glossary);
}
await writeJson(path.join(root, 'reports/items-terminology-normalization-20261024.json'), {
    createdAt: new Date().toISOString(), rules: ['existing glossary', 'exact existing name dictionaries', 'shared new terms', 'reviewed batch terms'],
    changes, canonical: [...canonical.values()],
    sourceFiles: Object.fromEntries(await Promise.all(groups.map(async group => [group, hash(await fs.readFile(path.join(directory, group + '.translations.json')))]))),
});
console.log(JSON.stringify({ normalizedTemplates: changes.length, canonicalTerms: canonical.size }));
