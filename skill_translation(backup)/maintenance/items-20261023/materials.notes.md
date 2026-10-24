# MMaterials description translation, 2026-10-23

- Output: `materials.translations.json`, 3,392 source keys, covering 3,482 references in the supplied pending batch.
- Repeated descriptions are compiled by maintained semantic rules. The 172 full descriptions and special cases in `materials.manual.json` preserve the entire source meaning, including background text and literal `\\n` sequences.
- `materials.names.json` is a local snapshot of the already approved `D:/codex_test/otogi_story/童前字典.json`, overridden by `translations/names.json`. It is a maintenance input, not a runtime dictionary or additional URL.
- `materials.glossary.json` contains 431 narrowly scoped preserved names or puzzle literals and 10 translated terminology entries. Preserved references are quoted in descriptions. Entries with numeric placeholders additionally have concrete source snapshot instances so validation can match real `row.d` values without ignoring arbitrary numbers.
- The two intentionally untranslated puzzle literals are `くらりもいと` and the `マ{0}　ラ{1}　ア{2}　ー　タ{3}　ァ{4}` sequence. Their surrounding prose is fully translated. These characters are the puzzle itself, so replacing them would change the question.
- Existing approved character names are preferred. Unknown names and versioned references are preserved exactly and individually documented. No new character-name translations were guessed.
- Numeric invariants, placeholder multiplicity, literal line-break counts, and rendered kana residue are checked by `materials.verify.mjs` across all 3,482 source references. Review regressions cover 次 versus 度, 黑護士, 關羽 versus 羽毛, and duplicated source 心之心. Latest result: `errors=[]`.
- Commands from repository root: `node skill_translation/maintenance/items-20261023/materials.translate.mjs` then `node skill_translation/maintenance/items-20261023/materials.verify.mjs`.
- No external translation services, shared dictionary edits, runtime edits, or in-game tests were performed by this batch.
