# 童話前線技能／物品描述翻譯

以繁體中文主字典維護，離線產生繁簡兩份共用字典。插件只修改 `MSkills`、`MMutationSkills`、`MMaterials`、`MWeapons`、`MAccessory`、`MItems`、`MFoods` 的 `d`，保留 `n`、`il`、ID、CT、能力值、關聯 ID 及所有其他資料。`MSkillMutationData` 是關聯資料，不翻譯，也不作為排除技能的條件。

## 本次交付與安裝

1. 將 `release/Skills/` 整個資料夾放到現有 `alex343425/otogitranslate` 儲存庫的 `main` 分支根目錄。確認 `Skills/skills.json` 和 `Skills/skills_gb.json` 可從 GitHub Raw 讀取。
2. 使用本工作區更新後的 `童話翻譯插件20261008.js` 更新 Tampermonkey 腳本。原本腳本已保存在 `backup/童話翻譯插件20261008.original.js`。
3. 儲存腳本後重新載入遊戲；若遊戲仍使用既有主資料快取，在遊戲標題畫面的選單清除快取後重新載入。
4. `SimplifiedChinese = 0` 使用繁體；`1` 使用簡體。`SkillChinese = 1` 同時啟用技能、素材、武器、飾品、道具及料理描述，`0` 全部關閉。角色名稱開關 `CharChinese` 保持原有行為。

GitHub 資料網址沿用既有插件；在字典上傳前，新技能分支會下載失敗並保留日文。本次只準備本機發布包，未推送 GitHub。

## 平常更新：三個指令

需要 Node.js 22 以上版本。首次維護在本目錄執行 `npm ci --ignore-scripts` 安裝鎖定版 OpenCC；玩家只安裝插件，不需要 Node.js。

```powershell
Set-Location D:\codex_test\otogi_test\skill_translation
node manage.mjs sync
# 將 pending.jsonl 交給 Codex，補齊主字典。
node manage.mjs build
node manage.mjs check
npm.cmd test
```

`sync` 下載七張描述表與一張技能變化關聯表，八表全部下載及驗證成功後才更新作用中的來源快照。它不改主字典或既有發布檔。原始 JSON 依 SHA-256 保存於 `source/snapshots/`，`source/current.json` 指向目前版本；新增、修改、移除及改名差異在 `reports/latest-diff.json`，有變更的歷史另存 `source/history/`。既有三表快照可直接執行 sync 升級，首次新增的五表會列為新增資料；升級前 build/check 會提示先同步。

`pending.jsonl` 是自動產生的待辦清單，附句型、原文例子、來源表、ID、名稱與 `mutationRelations` 變化關聯，方便對照同系列技能。只有技能資料會附技能變化關聯；物品的相同 ID 不會誤配技能關聯。Codex 應將譯文寫入 `translations/` 下的主字典，不直接修改待辦檔。只有數值改變時，既有核准句型會自動沿用；新增文字會重新進入待辦。同 ID 的舊描述不會覆蓋新描述，移除資料的快照和譯文仍保留。

新物品描述完整翻譯效果、背景及情境文字，不自動套用早期技能的情境刪減例外。名稱欄位保留原文；描述內有必要保留的名稱引用需有明確來源或術語理由。

補譯前先讀 `translations/glossary.json` 與 `translations/style-guide.md`，沿用使用者核准的用語與倍率句型；例如「回復魔力」、「八卦之陣」、「萬能之印」、「金縛」及武器種類「本」。

`build` 先驗證全部來源、數字與參數、日文殘留及例外理由，再準備兩種語言。若有待辦或錯誤，保留舊發布字典。`check` 另外核對發布檔與主字典一致，並對兩種語言逐筆確認除 `d` 之外的所有欄位不變。

成功後只需上傳 `release/Skills/` 的兩份 JSON，重新載入遊戲即可。字典格式版本仍為 `1` 時，不需要重新安裝插件。

### 已有本機 JSON 時

```powershell
node manage.mjs sync --source-dir D:\path\to\MasterData
```

該目錄需同時提供上述七個描述表 JSON 與 `MSkillMutationData.json`，共八個原始 JSON；內容與網路擷取使用相同驗證流程。不要改寫來源快照來修正翻譯。

## 主字典格式

`translations/templates.zh-TW.json` 以完整日文句型為 key、中文句型為 value：

```json
{
  "威力{0}％の水属性{1}～{2}回攻撃": "威力{0}％的水屬性{1}～{2}次攻擊"
}
```

數字依原文出現順序替換為 `{0}`、`{1}`……，小數仍是一個參數。譯文可以調整參數順序，但必須完整保留各參數及其出現次數。倍率、百分比、範圍、次數、觸發條件、對象和回合的意義需逐項對照；不得由資料表其他數值自行補寫描述沒有明示的倍率或機率。

`translations/exact.zh-TW.json` 用於完整原文例外：

```json
{
  "1位の喜びが超運気を呼び込みアイテムドロップ率UP": {
    "translation": "道具掉落率提升",
    "effectiveSource": "アイテムドロップ率UP",
    "reason": "省略早期純情境敘述，保留實際效果。"
  }
}
```

原文 key 始終完整保留。`effectiveSource` 是核准後的實際效果原文，用於驗證數字；它可以省略情境中的名次、年份等數字，但不能省略效果數字。若整段只含情境對白，明確顯示「（原文未提供效果說明）」而不自行推斷效果。

其他維護檔案：

- `glossary.json`：技能機制用語及需要保留原文的技能名。`preserve: true` 必須附理由。
- `overrides.zh-CN.json`：可選的簡體修正，格式為 `{"templates": {}, "exact": {}}`；key 與繁體主字典相同。
- `retained.json`：刻意維持原樣的佔位符或中日相同文字，附保留理由。

簡體字典用 OpenCC `tw → cn` 從繁體產生，只轉換譯文值；原文 key、參數及明確引用的技能名保留。修正繁體後須重新 `build`，不要直接修改發布檔。

## 插件字典介面

發布檔格式為 `{"schemaVersion":1,"locale":"zh-TW","templates":{...},"exact":{...}}`；簡體的 locale 為 `zh-CN`。完整原文例外優先，其次為只抽取數字的完整句型。未知文字不作模糊替換。

描述分支支援 `.gz` 和 `.json` 的 XHR ArrayBuffer，依 gzip magic bytes 判斷實際內容，處理後保留壓縮形式。第一張描述表需要時同步載入一次字典，同頁七張表共用；網址仍為現有 `Skills/skills.json` 或 `Skills/skills_gb.json`。網路速度與字典大小會影響首次載入時間；遊戲啟動載入全部主資料時不增加字典請求數。字典、語系、格式、解碼或資料形狀錯誤均保留原回應；重新載入頁面時重新取得字典。

技能專用 response getter 讓提早註冊的回應讀取者也能取得翻譯結果；既有劇情處理、角色翻譯及字型導向維持原邏輯。

## 驗證與翻譯紀錄

`reports/validation.json`、`reports/check.json` 和 `release/build-info.json` 記錄全量覆蓋、七表個別統計與來源雜湊。`test/` 包含八表更新、三表快照升級、跨表 ID、失敗保護、數值變更與新文字、繁簡切換、gzip／原始 JSON、回應事件順序、XHR 重用及既有功能的回歸測試。

首次字典透過本機術語、句法與明確情境例外編譯，並做代表樣本覆核及全量結構檢查。這些檢查能確認數值與資料欄位保存，不能證明遊戲執行結果或所有技能的實際機制；尚未在登入中的遊戲驗證。需要修辭或用語調整時，直接修正主字典並重新 build/check。

### 2026-10-24 物品描述擴充

新增五張物品表共 14,189 筆，增補 10,116 個句型；全量七張描述表共 64,246 筆，待翻譯 0、驗證錯誤 0。新物品僅原生識別縮寫 `CP` 維持原樣。23 項自動化測試通過，兩種語言的既有發布譯文逐 key 比對保持不變。新增專名不影響既有簡體用字；10 條相容性覆寫保存在 `overrides.zh-CN.json`。

本次由本機子代理分批補譯，再統一覆核背景敘述、效果與術語；沒有使用外部翻譯服務。分批來源、維護句型、人工譯文與驗證紀錄在 `maintenance/items-20261023/`；跨批術語整理、最終覆核與相容性報告在 `reports/items-*.json`。這些日期腳本是本次製作紀錄，日常更新仍用上方 sync → 補譯 → build → check → test，不重跑初版編譯工具。`index_chs.html` 未重新生成。

`seed.mjs`、`curate.mjs`、`names.json`、`lexicon.extra.tsv`、`manual.zh-TW.json`、`flavor-cleanup.json` 是首次製作紀錄。`seed` 與 `curate` 會重建字典，預設禁止執行；不是日常更新工具。不要用它們處理新增技能。未來的新句型由 Codex 閱讀 pending 並補譯，無需翻譯 API 或金鑰。

## 技能搜尋網站繁中頁面

`build-site-page.mjs` 從網站現有 `index.html`、`script.js`、`data.json`、`charjson/` 與本目錄核准的繁中發布字典生成獨立 `index_chs.html`。網站更新資料或本目錄更新譯文後，可重新執行：

```powershell
node build-site-page.mjs C:\Users\user\Documents\GitHub\alex343425.github.io
```

預設輸出 `release/site/index_chs.html`，確認後將此檔案複製到網站根目錄；也可用第二個參數指定輸出路徑。原網站的 HTML、JavaScript、JSON 都不會被工具改寫。頁面內含對應描述的繁中譯文與原有程式，只在描述顯示處套用翻譯，因此篩選、日文關鍵字、名稱、版面、分頁和持有資料仍沿用原有邏輯。

工具只接受完整描述比對，另辨識網站已知的 `\\n` → `、` 排版轉換，保留原有「降抗搜尋／降血技能」中文註記。不用 ID 直接覆蓋新描述。主表或角色詳情內的固有／專武技能若缺少譯文，會中止且不寫入頁面。隊長技能、飾品等不在本次兩張技能表內的描述，僅套用已有完全相同原文的譯文，其他保留原文。覆蓋統計見 `reports/site-page.json`。
