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

// 快取秒數：多人同時開啟時不必每次都重讀試算表。設為 0 則每次都即時讀取。
const CACHE_SECONDS = 60;
// 改版時換這個字串，舊版程式留下的快取就不會被讀到
const CACHE_VERSION = 'v3';

// 防止猜密碼：10 分鐘內累計錯誤達此次數，就暫停所有登入 10 分鐘。
const MAX_FAILS = 30;
const LOCK_SECONDS = 600;

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return json_({ ok: false, error: 'locked' });

  const password = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  const given = e && e.parameter ? String(e.parameter.p || '') : '';
  if (!password) return json_({ ok: false, error: '尚未設定密碼（指令碼屬性 PASSWORD）' });
  if (given !== password) {
    cache.put('fails', String(fails + 1), LOCK_SECONDS);
    return json_({ ok: false, error: 'unauthorized' });
  }

  if (CACHE_SECONDS > 0) {
    const hit = cacheGet_(cache);
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }

  const payload = { ok: true, updated: new Date().toISOString() };
  for (const name in SOURCES) {
    const s = SOURCES[name];
    const sheet = SpreadsheetApp.openById(s.id).getSheetByName(s.sheet);
    if (!sheet) return json_({ ok: false, error: '找不到工作表：' + s.sheet });
    const values = sheet.getDataRange().getDisplayValues();
    payload[name] = s.trim ? trim_(values) : values;
  }
  try {
    payload.board = board_();
  } catch (err) {
    payload.board = { error: String(err && err.message || err) };
  }

  const text = JSON.stringify(payload);
  if (CACHE_SECONDS > 0) cachePut_(cache, text);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
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
  if (lv.length) { const l = latest(lv); out.leave = { title: l.sh.getName(), values: read(l.sh, 5) }; }

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
    cache.putAll(parts, CACHE_SECONDS);
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
  Logger.log('授權完成。');
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
