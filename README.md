# 亞東藥學部 藥事照護組 Dashboard

靜態網頁（GitHub Pages）＋ Google Apps Script 資料端點。進入網頁需輸入密碼，通過後即時讀取 Google 試算表的最新數字。

```
https://rxwindchang.github.io/FENH_RxCare_Dashboard/
   │  輸入密碼 → fetch（帶密碼）
   ▼
Apps Script 網頁應用程式（比對密碼）──讀取──▶ 照護組行政 › 照護組指標
   以擁有者身分執行                             2026照護組業務量填寫 › 群組月彙總、儀表板資料
                                                班表/假表/會議時間 公告 › 本月與下月班表、休假、會議、晨會、實習生排程、宣達事項
```

首頁是六個功能圖示：當月班表、休假與代理、會議（藥學部／照護組）、實習生排程、宣達事項、服務量指標（點開後才顯示原本的各分頁）。

- 密碼只存在 Apps Script 的「指令碼屬性」裡，由伺服器端比對；網頁與這個 repo 都沒有密碼，也沒有任何數字。
- 端點回傳「照護組指標」「群組月彙總」，以及「儀表板資料」的個人逐月數字（去掉定位用欄位與空白列），供「個人業務量」分頁使用。
- 「班表/假表/會議時間 公告」依工作表名稱自動挑選：`yyyymm班表` 取本月與下月、`yyyymm休假` 與 `yyyymm會議` 取最新一張、`晨會座長參加序`、`實習生排程`、`宣達事項` 取名稱開頭相符且未隱藏的那張。新月份只要照原本的命名方式新增工作表即可。
- 回傳前會移除 e-mail 與員工編號；休假表只取 A–E 欄。
- 同一台裝置登入一次後會記住密碼（一年；換密碼後才需重新輸入），右上角可「登出」。
- 資料會暫存在裝置上：30 分鐘內再開啟直接顯示，不重新讀取；超過 30 分鐘則先顯示上次的資料、背景更新。頁尾「立即更新」可強制重讀試算表。

## 備用網址（連不到 github.io 的電腦）

直接用瀏覽器開 Apps Script 的 `/exec` 網址（不帶任何參數），就會顯示同一個 Dashboard。
Google 伺服器會到 GitHub 取最新網頁再送出（快取 10 分鐘），所以更新網站後不用另外處理。
第一次啟用需執行一次 `authorize`（允許「連線到外部服務」），並發布新版本。

臨床資源頁與工具頁也能經由備用網址開啟：`/exec?page=resources`（臨床資源）、`/exec?page=vpa`（Valproic acid 計算器）、`/exec?page=eval`（評鑑評核）。這些頁面不含資料、不需密碼；Dashboard 不是在 github.io 開啟時，「臨床資源」「評鑑評核」圖示會自動改連到 `/exec?page=resources`、`/exec?page=eval`。新增工具頁時，同步在 `Code.gs` 的 `SUBPAGES` 加一筆。

## 檔案

| 路徑 | 用途 |
|---|---|
| `site/index.html` | 網頁本體（由 `src/build.py` 產生） |
| `site/config.js` | Apps Script 網址 |
| `site/resources.html` | 臨床資源頁（Dashboard 右上角「臨床資源」圖示進入），不需密碼、不含任何資料 |
| `site/eval/index.html` | 評鑑評核頁（Dashboard「評鑑評核」圖示進入）：照護組評核三項＋評核表下載 |
| `site/eval/{inhaler,insulin,cva,export}.html` | 吸入劑衛教、筆型胰島素注射技術、CVA 衛教評核表與下載頁（由 `src/build_eval.py` 產生） |
| `site/tdm/valproic-acid.html` | Valproic acid TDM 計算器（獨立靜態頁，可直接更新此檔） |
| `site/tdm/vpa-icon.svg` | 計算器圖示 |
| `apps-script/Code.gs` | 資料端點程式碼，貼到 Apps Script |
| `.github/workflows/pages.yml` | 推送 `site/` 後自動發佈到 GitHub Pages |
| `src/` | 建置用：執行環境外殼與建置腳本 |
| `src/eval/` | 評核表原始檔（`eval.js` 評核內容與程式、`eval.css`、`page.html`）；改完執行 `python3 src/build_eval.py` |

## 一、部署資料端點（約 5 分鐘，一次即可）

1. 用擁有兩份試算表權限的 Google 帳號開啟 <https://script.google.com>，按「新專案」。
2. 刪除預設內容，貼上 `apps-script/Code.gs` 全部內容並存檔。
3. 左側「專案設定」（齒輪）→ 最下方「指令碼屬性」→「新增指令碼屬性」：
   - 屬性：`PASSWORD`
   - 值：你要的密碼
4. 回到編輯器，上方函式選單選 `authorize`，按「執行」，依畫面允許存取試算表。
5. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」：
   - 執行身分：**我**
   - 誰可以存取：**所有人**（沒有密碼仍讀不到資料）
6. 按「部署」，複製「網頁應用程式網址」（結尾是 `/exec`），填進 `site/config.js`。

## 二、發佈網站

repo「Settings」→「Pages」→ Source 選「GitHub Actions」。之後每次推送 `site/` 都會自動發佈。

## 維護

- **更新 Code.gs 後一定要發布新版本**：「部署」→「管理部署作業」→ 鉛筆 → 版本選「新版本」→「部署」。只存檔不發布，網站讀到的仍是舊版。

- **換密碼**：改指令碼屬性 `PASSWORD` 的值即可，立即生效，不需重新部署；舊密碼的裝置會被要求重新輸入。
- 修改 `Code.gs` 後，要用「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」，網址才會沿用。
- 端點有 30 分鐘快取（`CACHE_SECONDS`）；設為 0 即每次即時讀取。
- 執行一次 `setupTrigger`，會建立每 30 分鐘執行 `warm` 的定時觸發，事先把資料讀好放進快取，開網頁就不用等。
- 10 分鐘內累計 30 次密碼錯誤，端點會暫停登入 10 分鐘（`MAX_FAILS`、`LOCK_SECONDS`），用來防止被逐一猜密碼。
- 試算表工作表改名時，同步修改 `Code.gs` 的 `SOURCES`。
- 修改頁面：以 `python3 src/build.py <頁面檔>` 重新產生 `site/index.html`。
- 「臨床資源」圖示目前直接加在 `site/index.html` 的快速連結列最右側；若之後用 `build.py` 從原始頁面檔重新產生，需在頁面檔的快速連結列補上同一個 `<a class="ql-a" href="resources.html" target="_blank" rel="noopener noreferrer">`。
- 新增臨床工具：在 `site/resources.html` 對應區塊加一張卡片，工具頁放在 `site/` 下即可。

## 評鑑評核（照護組操作技巧評核）

Dashboard 快速連結列「Moodle」與「臨床資源」之間的「評鑑評核」圖示 → `site/eval/`。三份評核表（吸入劑衛教評核、筆型胰島素注射技術、CVA 衛教評核）與評核表下載頁。

- 送出與查詢都經由同一個 Apps Script 端點，需 Dashboard 密碼（同一台裝置登入過 Dashboard 就不必再輸入）。
- 紀錄寫入「照護組評核紀錄」試算表的「評核紀錄」工作表，一筆一列，簽名以圖片字串存在最後兩欄。試算表第一次使用時自動建立在 Apps Script 擁有者的雲端硬碟，ID 記在指令碼屬性 `EVAL_SHEET_ID`（要改用既有試算表，把這個屬性改成該試算表 ID）。
- 啟用步驟：貼上新版 `Code.gs` → 執行一次 `evalSetup`（建立試算表並在「執行紀錄」顯示網址）→ 發布新版本。
- 刪除或修正紀錄：直接在試算表刪列或改內容（「明細(JSON)」欄是評核表逐項結果）。
- 修改評核表內容或樣式：改 `src/eval/` 後執行 `python3 src/build_eval.py`，重新產生 `site/eval/` 的四個頁面。
- 若之後用 `build.py` 重新產生 `site/index.html`，需在快速連結列「臨床資源」之前補上 `<a class="ql-a" id="ql-eval" href="eval/" …>` 圖示。
