/**
 * 亞東藥學部 藥事照護組 Dashboard 資料端點
 *
 * 回傳：
 *   indicators：照護組行政 › 照護組指標
 *   groups：    2026照護組業務量填寫 › 群組月彙總
 *   persons：   2026照護組業務量填寫 › 儀表板資料（個人逐月，只留有填報的列）
 *   board：     班表/假表/會議時間 公告 › 當月與下月班表、休假、照護組會議、晨會（藥學部會議）、
 *               實習生排程、宣達事項（工作表依名稱自動找最新的一張）
 *
 * 評鑑評核：?evals=1&from=&to= 查詢評核紀錄；POST 送出評核（見檔案最後的「評鑑評核」段落）。
 *
 * 網頁以 <網頁應用程式網址>?p=<密碼> 呼叫。
 * 密碼存在「專案設定 › 指令碼屬性」的 PASSWORD，不寫在程式碼裡
 * （這份程式碼放在公開的 GitHub repo，寫進來任何人都看得到）。
 */

const SOURCES = {
  indicators: { id: '1OpRQ2XZCuPOCy2e6MHboPtww19knVDN4LiL7XOciE_o', sheet: '照護組指標' },
  groups: { id: '1HFfeTxY28hMSETGyyU2Zuf7zwfe90gqWkKQSekCprWg', sheet: '群組月彙總' },
  persons: { id: '1HFfeTxY28hMSETGyyU2Zuf7zwfe90gqWkKQSekCprWg', sheet: '儀表板資料', trim: true },
};

// 班表/假表/會議時間 公告
const BOARD_ID = '1DWR-cish-CPCX2cDxibjfDXhOWd-WFBEu37vFySJVR0';
const TZ = 'Asia/Taipei';

// 「儀表板資料」中只供公式定位用的欄位，不傳到網頁
const HELPER_COLUMNS = ['來源工作表', '區塊起始列', '區塊列數', '月份欄'];

// 快取秒數：30 分鐘內開啟都直接用快取，不必重讀試算表（網頁按「立即更新」才會強制重讀）。設為 0 則每次都即時讀取。
const CACHE_SECONDS = 1800;
// 改版時換這個字串，舊版程式留下的快取就不會被讀到
const CACHE_VERSION = 'v4';

// 防止猜密碼：10 分鐘內累計錯誤達此次數，就暫停所有登入 10 分鐘。
const MAX_FAILS = 30;
const LOCK_SECONDS = 600;

function doGet(e) {
  // 沒有帶密碼參數＝直接用瀏覽器開這個網址：回傳 Dashboard 網頁本身（給連不到 github.io 的電腦使用）
  // ?page=resources / ?page=vpa：臨床資源頁與 TDM 計算器（同樣由 GitHub 取得後轉送，給連不到 github.io 的電腦）
  if (e && e.parameter && e.parameter.page) return subpage_(String(e.parameter.page));
  if (!e || !e.parameter || e.parameter.p == null) return page_();
  const cache = CacheService.getScriptCache();
  const bad = checkPw_(e.parameter.p);
  if (bad) return json_({ ok: false, error: bad });

  // 評鑑評核：查詢評核紀錄（不快取）
  if (e.parameter.evals) {
    try { return json_(evalList_(e.parameter.from, e.parameter.to, e.parameter.nosig === '1')); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }

  const fresh = e && e.parameter && e.parameter.fresh === '1';
  if (CACHE_SECONDS > 0 && !fresh) {
    const hit = cacheGet_(cache);
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }
  let text;
  try { text = build_(); } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  if (CACHE_SECONDS > 0) cachePut_(cache, text);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 備用網址：由 Google 伺服器去 GitHub 取最新的 Dashboard 網頁，再從 script.google.com 送給瀏覽器。
 * 網頁內容永遠與 GitHub 版相同，更新網站後這裡不用改；網頁本身不含任何資料或密碼。
 */
const PAGE_URL = 'https://rxwindchang.github.io/FENH_RxCare_Dashboard/';
// 網頁快取的版本代號：改動這裡就會立刻改抓 GitHub 最新網頁（不必等 10 分鐘）
const PAGE_CACHE = 'page_v2';
function page_() {
  const cache = CacheService.getScriptCache();
  let html = null;
  const n = Number(cache.get(PAGE_CACHE + '_n') || 0);
  if (n) {
    const keys = []; for (let i = 0; i < n; i++) keys.push(PAGE_CACHE + '_' + i);
    const got = cache.getAll(keys);
    if (!keys.some((k) => got[k] == null)) html = keys.map((k) => got[k]).join('');
  }
  if (!html) {
    const t = Date.now();
    const res = UrlFetchApp.fetch(PAGE_URL + '?t=' + t, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return HtmlService.createHtmlOutput('<p>暫時無法取得網頁（' + res.getResponseCode() + '），請稍後再試。</p>');
    html = res.getContentText('UTF-8');
    const cfg = UrlFetchApp.fetch(PAGE_URL + 'config.js?t=' + t, { muteHttpExceptions: true }).getContentText('UTF-8');
    // 這裡沒有 config.js 檔案，改成直接內嵌
    html = html.replace(/<script>[^<]*?\n?document\.write\('<script src="config\.js[^<]*<\\\/script>'\);<\/script>/, '<script>' + cfg + '<\/script>');
    if (html.indexOf('config.js?v=') >= 0) html = html.replace(/document\.write\('<script src="config\.js\?v=' \+ Date\.now\(\) \+ '"><\\\/script>'\);/, cfg);
    try {
      const size = 90000, parts = {}, m = Math.ceil(html.length / size);
      for (let i = 0; i < m; i++) parts[PAGE_CACHE + '_' + i] = html.slice(i * size, (i + 1) * size);
      parts[PAGE_CACHE + '_n'] = String(m);
      cache.putAll(parts, 600);
    } catch (err) { /* 快取失敗時略過 */ }
  }
  const out = HtmlService.createHtmlOutput(html)
    .setTitle('亞東藥學部 藥事照護組 Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // 分頁小圖示：網址必須以 .png 結尾（不能帶 ?v= 參數）；設定失敗也不影響網頁顯示
  try { out.setFaviconUrl(PAGE_URL + 'favicon-v2.png'); } catch (err) {}
  return out;
}

/** 臨床資源頁與工具頁：不含任何資料，不需密碼。網頁內以 window.EXEC_URL 判斷連結要指回這個網址。 */
const SUBPAGES = { resources: { path: 'resources.html', title: '臨床資源｜藥事照護組' },
  eval: { path: 'eval/index.html', title: '評鑑評核｜藥事照護組' }, evalinhaler: { path: 'eval/inhaler.html', title: '吸入劑衛教評核｜評鑑評核' },
  evalinsulin: { path: 'eval/insulin.html', title: '筆型胰島素注射技術｜評鑑評核' }, evalcva: { path: 'eval/cva.html', title: 'CVA 衛教評核｜評鑑評核' },
  evalexport: { path: 'eval/export.html', title: '評核表下載｜評鑑評核' },vpa: { path: 'tdm/valproic-acid.html', title: 'Valproic Acid TDM Calculator', icon: 'tdm/vpa-icon.png' }, vpaguide: { path: 'tdm/valproic-acid-guide.html', title: 'VPA TDM Calculator 使用說明書', icon: 'tdm/vpa-icon.png' }, amdc: { path: 'dose/amdc.html', title: 'Anti-Microbial Dose Calculator (AMDC)', icon: 'dose/amdc-icon.png' }, ccmc: { path: 'dose/ccmc.html', title: 'Critical Care Medication Calculator (CCMC)', icon: 'dose/ccmc-icon.png' } };
function subpage_(name) {
  const sp = SUBPAGES[name];
  if (!sp) return HtmlService.createHtmlOutput('<p>找不到這個頁面。</p>');
  const cache = CacheService.getScriptCache();
  const key = PAGE_CACHE + '_sub_' + name;
  let html = null;
  const n = Number(cache.get(key + '_n') || 0);
  if (n) {
    const keys = []; for (let i = 0; i < n; i++) keys.push(key + '_' + i);
    const got = cache.getAll(keys);
    if (!keys.some((k) => got[k] == null)) html = keys.map((k) => got[k]).join('');
  }
  if (!html) {
    const res = UrlFetchApp.fetch(PAGE_URL + sp.path + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return HtmlService.createHtmlOutput('<p>暫時無法取得網頁（' + res.getResponseCode() + '），請稍後再試。</p>');
    html = res.getContentText('UTF-8');
    try {
      const size = 90000, parts = {}, m = Math.ceil(html.length / size);
      for (let i = 0; i < m; i++) parts[key + '_' + i] = html.slice(i * size, (i + 1) * size);
      parts[key + '_n'] = String(m);
      cache.putAll(parts, 600);
    } catch (err) { /* 快取失敗時略過 */ }
  }
  // getUrl() 對網域帳號會回傳 /a/macros/網域/… 的網址，未登入該網域的人打不開，改成一般網址
  const exec = ScriptApp.getService().getUrl().replace(/\/a\/macros\/[^/]+\//, '/macros/');
  html = html.replace('<head>', '<head><script>window.EXEC_URL=' + JSON.stringify(exec) + ';<\/script>');
  const out = HtmlService.createHtmlOutput(html)
    .setTitle(sp.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // 分頁小圖示（網址必須以 .png 結尾；失敗時略過）
  try { out.setFaviconUrl(PAGE_URL + (sp.icon || 'favicon-v2.png')); } catch (err) {}
  return out;
}

/** 讀取所有試算表，組成網頁要的資料（JSON 字串）。 */
function build_() {
  const payload = { ok: true, updated: new Date().toISOString() };
  for (const name in SOURCES) {
    const s = SOURCES[name];
    const sheet = SpreadsheetApp.openById(s.id).getSheetByName(s.sheet);
    if (!sheet) throw new Error('找不到工作表：' + s.sheet);
    const values = sheet.getDataRange().getDisplayValues();
    payload[name] = s.trim ? trim_(values) : values;
  }
  try {
    payload.board = board_();
  } catch (err) {
    payload.board = { error: String(err && err.message || err) };
  }
  return JSON.stringify(payload);
}

/** 由定時觸發每 30 分鐘執行：先把資料讀好放進快取，大家開網頁時就不用等。 */
function warm() {
  cachePut_(CacheService.getScriptCache(), build_());
}

/** 執行一次即可：建立「每 30 分鐘執行 warm」的定時觸發（重複執行不會重複建立）。 */
function setupTrigger() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'warm').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('warm').timeBased().everyMinutes(30).create();
  warm();
  Logger.log('已設定每 30 分鐘預先讀取資料。');
}

/** 班表/假表/會議時間 公告：依工作表名稱找出要用的那幾張。 */
function board_() {
  const ss = SpreadsheetApp.openById(BOARD_ID);
  const now = new Date();
  const ym = Utilities.formatDate(now, TZ, 'yyyyMM');
  const next = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 15), TZ, 'yyyyMM');
  const sheets = ss.getSheets().filter((sh) => !sh.isSheetHidden());
  const pick = (re) => sheets
    .map((sh) => ({ sh: sh, m: sh.getName().match(re) }))
    .filter((x) => x.m)
    .map((x) => ({ sh: x.sh, ym: x.m[1] }));
  const read = (sh, cols) => {
    const r = sh.getDataRange();
    const n = cols ? Math.min(cols, r.getNumColumns()) : r.getNumColumns();
    return clean_(sh.getRange(1, 1, r.getNumRows(), n).getDisplayValues());
  };
  const latest = (list) => {
    const ok = list.filter((x) => x.ym <= ym).sort((a, b) => (a.ym < b.ym ? 1 : -1));
    return ok[0] || list.sort((a, b) => (a.ym < b.ym ? 1 : -1))[0];
  };
  const byPrefix = (p) => sheets.filter((sh) => sh.getName().indexOf(p) === 0)[0];

  const out = { today: Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), rosters: [] };

  // 班表：本月與下月（有的話）
  const ros = pick(/^(\d{6})班表/);
  [ym, next].forEach((m) => {
    const hit = ros.filter((x) => x.ym === m)[0];
    if (hit) out.rosters.push({ ym: m, title: hit.sh.getName(), values: read(hit.sh, 13) });
  });
  if (!out.rosters.length && ros.length) {
    const l = latest(ros);
    out.rosters.push({ ym: l.ym, title: l.sh.getName(), values: read(l.sh, 13) });
  }

  // 休假：最新一張（滾動式紀錄，只取 A–E：日期、星期、休假×2、備註）
  const lv = pick(/^(\d{6})休假/);
  if (lv.length) {
    const l = latest(lv);
    const values = read(l.sh, 5);
    out.leave = { title: l.sh.getName(), values: values, marks: marks_(l.sh, values) };
  }

  // 照護組會議：最新一張「yyyymm會議」（A–E）
  const mt = pick(/^(\d{6})會議/);
  if (mt.length) { const l = latest(mt); out.careMeetings = { title: l.sh.getName(), values: read(l.sh, 5) }; }

  // 藥學部會議（晨會）（A–F）
  const am = byPrefix('晨會座長參加序');
  if (am) out.deptMeetings = { title: am.getName(), values: read(am, 6) };

  // 實習生排程
  const it = byPrefix('實習生排程');
  if (it) out.interns = { title: it.getName(), values: read(it) };

  // 宣達事項（A–D：公告日期、類別、主旨、PGY須讀）
  const an = byPrefix('宣達事項');
  if (an) out.announcements = { title: an.getName(), values: read(an, 4) };

  return out;
}

/**
 * 刪除線／底線：回傳 { "列,欄": [[起, 迄, "s"|"u"|"su"], ...] }，位置以去掉前後空白後的文字計算。
 * 整格套用與只套用部分文字都看得到；沒有格式的儲存格不列出。
 */
function marks_(sh, values) {
  const out = {};
  const nr = values.length;
  const nc = values.reduce((m, r) => Math.max(m, r.length), 0);
  if (!nr || !nc) return out;
  const range = sh.getRange(1, 1, nr, nc);
  const lines = range.getFontLines();
  const rich = range.getRichTextValues();
  for (let r = 0; r < nr; r++) {
    for (let c = 0; c < nc; c++) {
      const text = String((values[r] || [])[c] || '');
      if (!text.trim()) continue;
      const lead = text.length - text.replace(/^\s+/, '').length;
      const len = text.trim().length;
      const runs = [];
      const whole = lines[r][c];
      if (whole === 'line-through' || whole === 'underline') runs.push([0, len, whole === 'line-through' ? 's' : 'u']);
      const rt = rich[r] && rich[r][c];
      if (rt && rt.getText() === text) {
        rt.getRuns().forEach((run) => {
          const st = run.getTextStyle();
          const f = (st.isStrikethrough() ? 's' : '') + (st.isUnderline() && !run.getLinkUrl() ? 'u' : '');
          if (!f) return;
          const a = Math.max(0, run.getStartIndex() - lead), b = Math.min(len, run.getEndIndex() - lead);
          if (b > a) runs.push([a, b, f]);
        });
      }
      if (runs.length) out[r + ',' + c] = runs;
    }
  }
  return out;
}

/** 拿掉 e-mail 與員工編號，並去掉尾端空白列。 */
function clean_(values) {
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const rows = values.map((r) => r.map((c) => {
    const s = String(c);
    if (/^F\d{4}$/.test(s.trim())) return '';
    return s.replace(email, '');
  }));
  let end = rows.length;
  while (end > 0 && rows[end - 1].every((c) => String(c).trim() === '')) end--;
  return rows.slice(0, end).map((r) => {
    let k = r.length;
    while (k > 0 && String(r[k - 1]).trim() === '') k--;
    return r.slice(0, k);
  });
}

/** 快取：單一項目上限約 100KB，所以切成多段存放。 */
function cachePut_(cache, text) {
  try {
    const size = 90000, parts = {};
    const n = Math.ceil(text.length / size);
    for (let i = 0; i < n; i++) parts[CACHE_VERSION + '_' + i] = text.slice(i * size, (i + 1) * size);
    parts[CACHE_VERSION + '_n'] = String(n);
    cache.putAll(parts, CACHE_SECONDS + 600);
  } catch (err) { /* 快取失敗時略過，下次直接讀試算表 */ }
}

function cacheGet_(cache) {
  const n = Number(cache.get(CACHE_VERSION + '_n') || 0);
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(CACHE_VERSION + '_' + i);
  const got = cache.getAll(keys);
  if (keys.some((k) => got[k] == null)) return null;
  return keys.map((k) => got[k]).join('');
}

/** 第一次部署時執行一次，讓 Google 跳出授權畫面（讀取試算表）。不會改動任何資料。 */
function authorize() {
  for (const name in SOURCES) SpreadsheetApp.openById(SOURCES[name].id).getName();
  SpreadsheetApp.openById(BOARD_ID).getName();
  UrlFetchApp.fetch(PAGE_URL, { muteHttpExceptions: true }); // 備用網址需要「連線到外部服務」權限
  Logger.log('評核紀錄試算表：' + evalSheet_().getParent().getUrl());
  Logger.log('授權完成。');
}

/* ======================= 評鑑評核（照護組評核紀錄） =======================
 * 評核網頁（site/eval/）送出的紀錄寫進「照護組評核紀錄」試算表，一筆一列，簽名以圖片字串存在儲存格。
 * 試算表第一次使用時自動建立在擁有者的雲端硬碟，ID 記在指令碼屬性 EVAL_SHEET_ID；
 * 想改用既有的試算表，把 EVAL_SHEET_ID 改成該試算表 ID 即可（會自動新增「評核紀錄」工作表）。
 */
const EVAL_SHEET = '評核紀錄';
const EVAL_HEAD = ['紀錄編號', '考核日期', '評核項目', '受評者', '考核者', '員編', '結果', '備註', '送出時間', '明細(JSON)', '受評者簽名', '考核者簽名'];
const EVAL_FORMS = { inhaler: '吸入劑衛教評核', insulin: '筆型胰島素注射技術', cva: 'CVA 衛教評核' };
const EVAL_FORM_KEY = { '吸入劑衛教評核': 'inhaler', '筆型胰島素注射技術': 'insulin', 'CVA 衛教評核': 'cva' };

/** 比對密碼；通過回傳 null，否則回傳錯誤代碼（與 Dashboard 共用錯誤次數限制）。 */
function checkPw_(given) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return 'locked';
  const password = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  if (!password) return '尚未設定密碼（指令碼屬性 PASSWORD）';
  if (String(given || '') !== password) { cache.put('fails', String(fails + 1), LOCK_SECONDS); return 'unauthorized'; }
  return null;
}

/** 執行一次：建立（或找到）評核紀錄試算表，並在執行紀錄顯示網址。 */
function evalSetup() {
  Logger.log('評核紀錄試算表：' + evalSheet_().getParent().getUrl());
}

function evalSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('EVAL_SHEET_ID');
  let ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else { ss = SpreadsheetApp.create('照護組評核紀錄'); props.setProperty('EVAL_SHEET_ID', ss.getId()); }
  let sh = ss.getSheetByName(EVAL_SHEET);
  if (!sh) {
    sh = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0].setName(EVAL_SHEET) : ss.insertSheet(EVAL_SHEET);
    sh.getRange(1, 1, 1, EVAL_HEAD.length).setValues([EVAL_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:L').setNumberFormat('@');
    sh.setColumnWidth(10, 120); sh.setColumnWidth(11, 120); sh.setColumnWidth(12, 120);
  }
  return sh;
}

/** POST：{ p: 密碼, action: 'save', rec: {...} } */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '資料格式錯誤' }); }
  const bad = checkPw_(body.p);
  if (bad) return json_({ ok: false, error: bad });
  try {
    if (body.action === 'save') return json_(evalSave_(body.rec));
    return json_({ ok: false, error: '不支援的動作' });
  } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}

/** 由 Apps Script 備用網址開啟評核頁時，網頁以 google.script.run 呼叫這兩個函式。 */
function evalSaveRun(p, rec) {
  const bad = checkPw_(p); if (bad) return { ok: false, error: bad };
  try { return evalSave_(rec); } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
}
function evalListRun(p, from, to, nosig) {
  const bad = checkPw_(p); if (bad) return { ok: false, error: bad };
  try { return evalList_(from, to, nosig); } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
}

function evalSave_(rec) {
  if (!rec || !EVAL_FORMS[rec.form]) throw new Error('評核項目不正確');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rec.date || ''))) throw new Error('考核日期格式不正確');
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  if (!str(rec.evaluatee, 50).trim() || !str(rec.evaluator, 50).trim()) throw new Error('缺少受評者或考核者');
  const sig = (v) => { const s = String(v || ''); if (!/^data:image\/(png|jpeg);base64,/.test(s)) throw new Error('簽名格式不正確'); if (s.length > 49000) throw new Error('簽名圖片過大，請清除後重簽'); return s; };
  const sigA = sig(rec.sigEvaluatee), sigB = sig(rec.sigEvaluator);
  const detail = {};
  ['type', 'scores', 'course', 'needsTraining', 'review', 'sections', 'score'].forEach((k) => { if (rec[k] !== undefined) detail[k] = rec[k]; });
  const detailText = JSON.stringify(detail);
  if (detailText.length > 45000) throw new Error('評核內容過長');
  const now = new Date();
  const id = rec.date + '_' + rec.form + '_' + Utilities.getUuid().slice(0, 6);
  const row = [id, rec.date, EVAL_FORMS[rec.form], str(rec.evaluatee, 50).trim(), str(rec.evaluator, 50).trim(), str(rec.empId, 20),
    str(rec.summary, 200), str(rec.note, 1000), Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm:ss'), detailText, sigA, sigB];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = evalSheet_();
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]);
  } finally { lock.releaseLock(); }
  return { ok: true, id: id };
}

function evalList_(from, to, nosig) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(String(from || '')) || !re.test(String(to || ''))) throw new Error('日期區間格式不正確');
  const sh = evalSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return { ok: true, rows: [] };
  const width = nosig ? 10 : 12;
  const values = sh.getRange(2, 1, n, width).getDisplayValues();
  const rows = [];
  values.forEach((v) => {
    const date = String(v[1]).trim().replace(/\//g, '-');
    if (!v[0] || date < from || date > to) return;
    let detail = {};
    try { detail = JSON.parse(v[9] || '{}'); } catch (err) {}
    const t = Date.parse(String(v[8]).replace(' ', 'T') + '+08:00');
    const o = Object.assign(detail, { id: v[0], date: date, form: EVAL_FORM_KEY[v[2]] || v[2], evaluatee: v[3], evaluator: v[4], empId: v[5],
      summary: v[6], note: v[7], createdAt: isNaN(t) ? null : t });
    if (!nosig) { o.sigEvaluatee = v[10]; o.sigEvaluator = v[11]; }
    rows.push(o);
  });
  return { ok: true, rows: rows };
}

/** 去掉定位用欄位，只留有填報數字的列，讓回傳資料小一點。 */
function trim_(values) {
  const head = values[0];
  const keep = head.map((h, i) => (HELPER_COLUMNS.indexOf(String(h).trim()) < 0 ? i : -1)).filter((i) => i >= 0);
  const firstNum = head.indexOf('藥事服務');
  const rows = values.slice(1).filter((r) => r[0] && r.slice(firstNum).some((x) => String(x).trim() !== ''));
  return [head].concat(rows).map((r) => keep.map((i) => r[i]));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
