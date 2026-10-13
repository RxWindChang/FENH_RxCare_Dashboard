/**
 * 亞東藥學部 藥事照護組 Dashboard 資料端點
 *
 * 只回傳兩張彙總表（不含個人明細）：
 *   indicators：照護組行政 › 照護組指標
 *   groups：    2026照護組業務量填寫 › 群組月彙總
 *
 * 網頁以 <網頁應用程式網址>?p=<密碼> 呼叫。
 * 密碼存在「專案設定 › 指令碼屬性」的 PASSWORD，不寫在程式碼裡
 * （這份程式碼放在公開的 GitHub repo，寫進來任何人都看得到）。
 */

const SOURCES = {
  indicators: { id: '1OpRQ2XZCuPOCy2e6MHboPtww19knVDN4LiL7XOciE_o', sheet: '照護組指標' },
  groups: { id: '1HFfeTxY28hMSETGyyU2Zuf7zwfe90gqWkKQSekCprWg', sheet: '群組月彙總' },
};

// 快取秒數：多人同時開啟時不必每次都重讀試算表。設為 0 則每次都即時讀取。
const CACHE_SECONDS = 60;

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
    const hit = cache.get('payload');
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }

  const payload = { ok: true, updated: new Date().toISOString() };
  for (const name in SOURCES) {
    const s = SOURCES[name];
    const sheet = SpreadsheetApp.openById(s.id).getSheetByName(s.sheet);
    if (!sheet) return json_({ ok: false, error: '找不到工作表：' + s.sheet });
    payload[name] = sheet.getDataRange().getDisplayValues();
  }

  const text = JSON.stringify(payload);
  if (CACHE_SECONDS > 0) {
    try { cache.put('payload', text, CACHE_SECONDS); } catch (err) { /* 超過快取上限時略過 */ }
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/** 第一次部署時執行一次，讓 Google 跳出授權畫面（讀取試算表）。不會改動任何資料。 */
function authorize() {
  for (const name in SOURCES) SpreadsheetApp.openById(SOURCES[name].id).getName();
  Logger.log('授權完成。');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
