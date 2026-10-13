/**
 * 亞東藥學部 藥事照護組 Dashboard 資料端點
 *
 * 只回傳兩張彙總表（不含個人明細）：
 *   indicators：照護組行政 › 照護組指標
 *   groups：    2026照護組業務量填寫 › 群組月彙總
 *
 * 呼叫方式：<網頁應用程式網址>?k=<金鑰>
 * 金鑰存在「指令碼屬性」KEY，第一次請執行 setupKey() 產生。
 */

const SOURCES = {
  indicators: { id: '1OpRQ2XZCuPOCy2e6MHboPtww19knVDN4LiL7XOciE_o', sheet: '照護組指標' },
  groups: { id: '1HFfeTxY28hMSETGyyU2Zuf7zwfe90gqWkKQSekCprWg', sheet: '群組月彙總' },
};

// 快取秒數：多人同時開啟時不必每次都重讀試算表。設為 0 則每次都即時讀取。
const CACHE_SECONDS = 60;

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  const given = e && e.parameter ? e.parameter.k : '';
  if (!key || given !== key) return json_({ ok: false, error: 'unauthorized' });

  const cache = CacheService.getScriptCache();
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

/** 第一次部署前執行一次：產生金鑰並顯示在「執行紀錄」。要換金鑰時再執行一次即可。 */
function setupKey() {
  const k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('KEY', k);
  CacheService.getScriptCache().remove('payload');
  Logger.log('新金鑰：' + k);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
