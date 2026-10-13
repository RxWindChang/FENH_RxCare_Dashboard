# 亞東藥學部 藥事照護組 Dashboard

靜態網頁（GitHub Pages）＋ Google Apps Script 資料端點。進入網頁需輸入密碼，通過後即時讀取 Google 試算表的最新數字。

```
https://rxwindchang.github.io/FENH_RxCare_Dashboard/
   │  輸入密碼 → fetch（帶密碼）
   ▼
Apps Script 網頁應用程式（比對密碼）──讀取──▶ 照護組行政 › 照護組指標
   以擁有者身分執行                             2026照護組業務量填寫 › 群組月彙總
```

- 密碼只存在 Apps Script 的「指令碼屬性」裡，由伺服器端比對；網頁與這個 repo 都沒有密碼，也沒有任何數字。
- 端點只回傳兩張彙總表，個人明細（「儀表板資料」）不會傳出。
- 同一台裝置登入一次後會記住密碼，右上角可「登出」。

## 檔案

| 路徑 | 用途 |
|---|---|
| `site/index.html` | 網頁本體（由 `src/build.py` 產生） |
| `site/config.js` | Apps Script 網址 |
| `apps-script/Code.gs` | 資料端點程式碼，貼到 Apps Script |
| `.github/workflows/pages.yml` | 推送 `site/` 後自動發佈到 GitHub Pages |
| `src/` | 建置用：執行環境外殼與建置腳本 |

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

- **換密碼**：改指令碼屬性 `PASSWORD` 的值即可，立即生效，不需重新部署；舊密碼的裝置會被要求重新輸入。
- 修改 `Code.gs` 後，要用「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」，網址才會沿用。
- 端點有 60 秒快取（`CACHE_SECONDS`）；設為 0 即每次即時讀取。
- 10 分鐘內累計 30 次密碼錯誤，端點會暫停登入 10 分鐘（`MAX_FAILS`、`LOCK_SECONDS`），用來防止被逐一猜密碼。
- 試算表工作表改名時，同步修改 `Code.gs` 的 `SOURCES`。
- 修改頁面：以 `python3 src/build.py <頁面檔>` 重新產生 `site/index.html`。
