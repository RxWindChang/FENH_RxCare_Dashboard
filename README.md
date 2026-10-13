# 亞東藥學部 藥事照護組 Dashboard

靜態網頁（GitHub Pages）＋ Google Apps Script 資料端點。每次開啟網頁時即時讀取 Google 試算表；只有持有完整連結（含金鑰）的人看得到數字，網頁也設定為不被搜尋引擎收錄。

```
瀏覽器開啟 https://<帳號>.github.io/<repo>/?k=<金鑰>
   │  fetch（帶金鑰）
   ▼
Apps Script 網頁應用程式 ──讀取──▶ 照護組行政 › 照護組指標
   （以擁有者身分執行）          2026照護組業務量填寫 › 群組月彙總
```

端點只回傳兩張彙總表，個人明細（「儀表板資料」）不會傳出。

## 檔案

| 路徑 | 用途 |
|---|---|
| `site/index.html` | 網頁本體（由 `src/build.py` 產生） |
| `site/config.js` | Apps Script 網址，部署後填入 |
| `site/robots.txt`、`.nojekyll` | 不收錄、讓 GitHub Pages 原樣提供檔案 |
| `apps-script/Code.gs` | 資料端點程式碼，貼到 Apps Script |
| `src/` | 建置用：執行環境外殼與建置腳本 |

## 一、部署資料端點（約 5 分鐘，一次即可）

1. 用擁有兩份試算表權限的 Google 帳號開啟 <https://script.google.com>，按「新專案」。
2. 刪除預設內容，貼上 `apps-script/Code.gs` 全部內容，存檔，專案名稱可取「照護組 Dashboard 端點」。
3. 上方函式選單選 `setupKey`，按「執行」。第一次會要求授權，依畫面允許存取試算表。
4. 開啟「執行紀錄」，複製「新金鑰：」後面那串字。這就是分享連結中的金鑰，請妥善保存。
5. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」：
   - 執行身分：**我**
   - 誰可以存取：**所有人**（沒有金鑰仍讀不到資料）
6. 按「部署」，複製「網頁應用程式網址」（結尾是 `/exec`）。

## 二、填入網址並發佈網站

1. 把 `site/config.js` 中的 `PASTE_APPS_SCRIPT_URL_HERE` 換成上一步的網址，commit。
2. GitHub repo →「Settings」→「Pages」→ Source 選「GitHub Actions」（本 repo 已附部署流程），或選「Deploy from a branch」並指定 `site` 資料夾所在的分支。
3. 幾分鐘後網站會出現在 `https://<帳號>.github.io/<repo>/`。

## 三、分享連結

```
https://<帳號>.github.io/<repo>/?k=<金鑰>
```

- 加上 `#icu`、`#groups` 等可直接開到指定分頁。
- 沒有金鑰或金鑰錯誤時，頁面只會顯示提示，不會有任何數字。
- **要撤銷所有人的存取**：在 Apps Script 再執行一次 `setupKey`，舊連結立即失效，再分享新連結即可，不需要重新部署。

## 維護

- 修改 `Code.gs` 之後，要用「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」，網址才會沿用。
- 端點有 60 秒快取（`CACHE_SECONDS`），同時多人開啟時不會反覆讀取試算表；設為 0 即每次即時讀取。
- 試算表工作表改名時，同步修改 `Code.gs` 的 `SOURCES`。
- 修改頁面：編輯 Claude 上的 Dashboard 版本後，以 `python3 src/build.py <頁面檔>` 重新產生 `site/index.html`。

## 注意

- repo 若為公開，程式碼看得到，但資料看不到（資料需金鑰）。若有 GitHub Pro，也可以把 repo 設為私人。
- 「不被收錄」靠的是 `noindex` 與不公開連結，並非登入驗證；拿到完整連結的人都能開啟，就像 YouTube 非公開影片。
