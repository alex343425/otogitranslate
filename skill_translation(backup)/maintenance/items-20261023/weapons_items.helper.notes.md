# Weapons helper translation, 2026-10-23

- 528 complete source keys, covering 576 referenced rows. All background paragraphs and dedicated weapon/equipment labels are translated.
- `weapons_items.helper.manual.tsv` is the reviewed sentence source. The compiler resolves approved Japanese names within this Chinese prose using a single longest-token pass. Kanji-only and single-character glossary keys are excluded from this pass to prevent accidental rewriting of Chinese prose or partial corruption of proper names.
- The output is `weapons_items.helper.translations.json`. Merge this completed dictionary after any broader draft lexical transformation; do not transform it again with unrestricted Japanese-to-Chinese substring substitutions.
- `weapons_items.helper.glossary.json` contains 66 precisely scoped quoted proper references and four terminology additions, all with reasons. There are no blanket kana or number validation exceptions.
- New place names ブニターリカ and バイレ・アス・ハロウィン follow the main weapons translator's chosen 布尼塔利卡 and 拜萊・阿斯・萬聖節. ディトルパ follows the existing approved 迪托爾帕.
- The source has an explicit duplicate critical phrase in the rare poisonous dagger description. Both occurrences are retained; no historical flavor cleanup was applied.
- Generic books in background prose use 書籍/書本; the weapon type in the Yamato crafting description uses 本. 魔導書 and proper names retain their approved forms.
- `weapons_items.helper.verify.mjs` checks each source row's actual substituted numbers, placeholder counts, literal `\\n` counts, and kana remaining after only exact declared proper names are removed. Final status is recorded in `weapons_items.helper.validation.json`.
- No external translation service, source name edits, or runtime changes were used.
