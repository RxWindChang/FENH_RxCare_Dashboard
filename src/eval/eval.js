"use strict";
/* 照護組評核：三份評核表＋下載頁共用程式。VIEW 由建置腳本寫入（inhaler / insulin / cva / export）。
 * 資料經由 Dashboard 的 Apps Script 端點寫入／讀取「照護組評核紀錄」試算表，需 Dashboard 密碼。 */
const VIEW = window.EVAL_VIEW;

/* ---------- 評核表內容（依亞東評核表原稿） ---------- */
const FORMS = {
  inhaler: {
    name: "吸入劑衛教評核", docTitle: "吸入性藥物評值表", ver: "2024年12月初版制定", kind: "steps",
    sub: "吸入性藥物評值表（一）～（三）｜2024年12月初版制定",
    sections: [
      { id: "ellipta", label: "評值表(一) 衛教要點與步驟", tag: "Relvar / Anoro / Trelegy", steps: [
        "打開吸嘴蓋，勿將手放置通氣孔處。",
        "先向外吐一口氣，然後將吸嘴含入嘴唇內，長而穩定的方式深吸入一口氣。",
        "吸氣完畢後移去吸入器，閉緊雙唇，接著閉氣5-10秒。",
        "閉氣後恢復正常呼吸，待確認吸乾淨所有藥粉後，即完成一次吸入劑量，關閉吸入器。",
        "如吸入藥物內含類固醇則吸藥結束後須漱口。"] },
      { id: "pmdi", label: "評值表(一) pMDI 衛教要點與步驟", tag: "定量噴霧吸入器", steps: [
        "打開吸嘴帽蓋。(新開瓶藥物，請先排空氣)",
        "直立將吸入器拿好，將吸入器上下震搖4-5次，使藥物充分混合。",
        "先向外慢慢深吐一口氣。",
        "以嘴唇含住藥品開口的吸嘴，然後按壓吸入器金屬罐底，並同時緩慢地吸飽一口氣(吸氣時間約4-5秒)。",
        "移去吸入器，閉緊雙唇，閉氣5-10秒，閉氣完後恢復正常呼吸。",
        "兩口間可隔30秒鐘，如無呼吸不順或不適情形，可吸第二口藥品。",
        "如吸入藥物含類固醇則吸藥結束後須漱口。"] },
      { id: "resp-setup", label: "評值表(二) 吸入器安裝步驟", tag: "Spiriva / Striverdi / Spiolto", steps: [
        "充填藥罐，確認綠色/黃色蓋子蓋緊，按壓住安全扣，並拔下透明底座",
        "自藥盒取出藥罐，將藥罐的窄端推向吸入器。(藥罐一旦插入吸入器後，不可再取出)",
        "裝回透明底座，請勿再將透明底座取下。",
        "確認藥物已備妥，將吸入器朝上握好，綠色/黃色蓋子蓋緊，將透明底座像扭毛巾一樣旋轉(依黑色箭頭方向)，直到聽到卡塔聲。",
        "從側面打開綠色/黃色蓋子，對外按壓給藥按鈕，再蓋上綠色/黃色蓋子。",
        "重複以上動作五次，直到出現霧狀的藥液，以確保吸入器已備妥可供使用。"] },
      { id: "resp-use", label: "評值表(二) 吸入器使用步驟", tag: "Spiriva / Striverdi / Spiolto", steps: [
        "確認藥物已備妥，將吸入器朝上握好，綠色/黃色蓋子蓋緊，將透明底座像扭毛巾一樣旋轉(依黑色箭頭方向)，直到聽到卡塔聲。",
        "蓋子從側邊打開。",
        "先向外吐一口氣，含住口含器，勿遮住通氣孔，用口慢慢深吸氣時，按壓給藥按鈕，然後儘可能地繼續緩慢吸氣。",
        "吸氣完畢後自口中移去吸入器，閉緊雙唇，接著閉氣5-10秒。",
        "閉氣後恢復正常呼吸，即完成一次吸入劑量。",
        "兩口間可隔30秒鐘，如無呼吸不順或不適情形，可吸第二口藥品。"] },
      { id: "turbu", label: "評值表(三) Turbuhaler 衛教要點與步驟", tag: "Symbicort turbuhaler", steps: [
        "旋轉打開護蓋，瓶身保持直立，不要握住吸嘴，將下方旋轉向右轉到底，再向左轉，直到聽到喀擦聲。(第一次使用時此步驟需重複2次)",
        "先向外吐一口氣，然後以口含住吸嘴，快速地用力吸飽一口氣。",
        "吸氣完畢後自口中移去吸入器，閉緊雙唇，接著盡可能地閉氣，越久越好(或閉氣5-10秒)。",
        "閉氣後恢復正常呼吸，待確認吸乾淨所有藥粉後，即完成一次吸入劑量。",
        "兩口間可隔30秒鐘，如無呼吸不順或不適情形，可吸第二口藥品。",
        "如吸入藥物含類固醇則吸藥結束後須漱口。"] }
    ]
  },
  insulin: {
    name: "筆型胰島素注射技術", docTitle: "品管評核表｜筆型胰島素及GLP-1注射技術正確率", ver: "2026.03.15制定", kind: "steps",
    sub: "亞東紀念醫院品管評核表｜監測項目：筆型胰島素及GLP-1注射技術正確率｜2026.03.15制定",
    sections: [{ id: "pen", label: "評核項目", tag: "評值說明列於各項下方", steps: [
      { t: "拿取正確胰島素或GLP-1", d: "能正確拿取正確胰島素或GLP-1" },
      { t: "拔除筆蓋檢查筆芯、卡管底部是否有結晶或異常狀況", d: "能說出筆芯/卡管底部是否有結晶或異常" },
      { t: "預混型胰島素(混濁)使用前搖勻", d: "能將藥物夾於雙手掌間滾動並輕輕上下翻轉≥20次", na: true },
      { t: "正確裝置針頭，注射前完成排氣", d: "用酒精棉片，消毒注射筆的橡皮頂端部分，將針頭與注射筆呈一直線垂直對正後旋緊，拔除針頭外蓋及內蓋，轉至2單位針頭朝上排氣至針尖出現一滴藥水" },
      { t: "依照醫囑設定劑量", d: "依照醫囑設定劑量" },
      { t: "注射部位選擇正確並正確執行注射", d: "1. 能說出正確注射部位：肚臍周圍約2指寬外一個拳頭大；大腿外上1/3；上臂外後側中段1/3區；臀部外上1/4；在同一部位注射7-8次後要更換部位。2. 注射前使用酒精棉片清潔皮膚，同一部位相鄰針孔間距約1指寬(約1–2公分)，以正確角度皮下注射（多為90度）" },
      { t: "注射後針頭停留皮下足夠時間", d: "按壓按鈕至底並持續按壓不鬆手停留至少10–15秒以上" },
      { t: "注射後正確卸除針頭", d: "將外蓋蓋回後卸除針頭丟入針頭回收筒帶至北棟二樓門診注射室。" }
    ] }]
  },
  cva: {
    name: "CVA 衛教評核", docTitle: "【腦中風團隊-藥師年度評核表】", ver: "2025-12-01 制定", kind: "cva",
    sub: "亞東紀念醫院 藥學部｜腦中風團隊-藥師年度評核表｜2025-12-01 制定",
    items: [
      { t: "藥物治療評估能力", d: "能完整蒐集並評估病人用藥史，檢視藥物間交互作用、適應症/禁忌症。能辨識藥物治療過程中之相關問題（如副作用、不良反應等），並主動提出合適的處置及追蹤方案。並提供適切的藥物治療建議。" },
      { t: "團隊溝通能力", d: "能與跨專業團隊成員溝通藥物治療計畫，亦能在病歷中留下相關建議，確保團隊資訊傳達無誤。" },
      { t: "病人衛教能力", d: "能針對抗血小板藥物及抗凝血藥物提供清楚的用藥指導，說明療效與注意事項，確保病人充分了解並能正確使用藥物。" }
    ]
  }
};
const PEOPLE = ["李宜汶","柯姿璇","林怡伶","張寧真","王台欣","張維倫","艾明穎","闕昌琪","楊欣瑜","林明燊","陳瀅仁","林于雅"];
const SCORE_LBL = { 5: "優良", 4: "良好", 3: "一般", 2: "尚可", 1: "不符合" };
const stepObj = (s) => (typeof s === "string" ? { t: s } : s);

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => ymd(new Date());
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 3000); }
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------- 密碼（與 Dashboard 共用同一組記憶） ---------- */
const pw = {
  get() { let v = ls.get("rxcare_pw"); if (!v) { const m = document.cookie.match(/(?:^|; )rxcare_pw=([^;]*)/); v = m ? decodeURIComponent(m[1]) : null; } return v; },
  set(v) { ls.set("rxcare_pw", v); try { document.cookie = "rxcare_pw=" + encodeURIComponent(v) + "; max-age=31536000; path=/; SameSite=Strict; Secure"; } catch (e) {} }
};

/* ---------- 資料端點 ---------- */
const GS = typeof google !== "undefined" && google.script && google.script.run; // 由 Apps Script 備用網址開啟時
function gsCall(fn, args) { return new Promise((res, rej) => { const r = google.script.run.withSuccessHandler(res).withFailureHandler(rej); r[fn].apply(r, args); }); }
const api = {
  save(p, rec) {
    if (GS) return gsCall("evalSaveRun", [p, rec]);
    const ep = (window.DASH_CONFIG || {}).endpoint;
    if (!ep) return Promise.reject(new Error("找不到資料端點設定（config.js）"));
    return fetch(ep, { method: "POST", body: JSON.stringify({ p, action: "save", rec }) }).then((r) => r.json());
  },
  list(p, from, to, nosig) {
    if (GS) return gsCall("evalListRun", [p, from, to, !!nosig]);
    const ep = (window.DASH_CONFIG || {}).endpoint;
    if (!ep) return Promise.reject(new Error("找不到資料端點設定（config.js）"));
    const q = `?p=${encodeURIComponent(p)}&evals=1&from=${from}&to=${to}${nosig ? "&nosig=1" : ""}&t=${Date.now()}`;
    return fetch(ep + q, { cache: "no-store" }).then((r) => r.json());
  }
};
function errText(e) {
  const m = e && (e.error || e.message) || String(e || "");
  if (m === "unauthorized") return "密碼不正確";
  if (m === "locked") return "密碼錯誤次數過多，請 10 分鐘後再試";
  if (/找不到|evals|doPost|Script function not found/i.test(m)) return "資料端點尚未更新：請在 Apps Script 貼上新版 Code.gs 並發布新版本（" + m + "）";
  return m;
}

/* ---------- 頁面骨架 ---------- */
const app = $("#app");
const backHref = () => (window.EXEC_URL ? window.EXEC_URL.replace(/\/a\/macros\/[^/]+\//, "/macros/") + "?page=eval" : "./");
function headerHTML(title, sub) {
  return `<header><div><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p></div><a class="back" id="back" href="${esc(backHref())}"${window.EXEC_URL ? ' target="_top"' : ""}>← 評鑑評核</a></header>`;
}
function gateHTML() {
  return `<div class="panel gate" id="gate" hidden><div class="sec-h"><h2>輸入 Dashboard 密碼</h2></div>
    <div class="sub">評核結果存放在照護組試算表，需輸入 Dashboard 密碼才能送出與查詢。這台裝置登入過 Dashboard 就不必再輸入。</div>
    <form class="row" id="gate-form"><input type="password" id="gate-pw" inputmode="numeric" aria-label="密碼" autocomplete="current-password"><button class="btn" type="submit">確認</button></form>
    <div class="err" id="gate-err"></div></div>`;
}
let PW = null;
function needPw(msg) { $("#gate").hidden = false; $("#gate-err").textContent = msg || ""; $("#gate-pw").focus(); }
function bindGate(onOk) {
  $("#gate-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const v = $("#gate-pw").value.trim(); if (!v) return;
    $("#gate-err").textContent = "確認中…";
    try { const r = await api.list(v, today(), today(), true); if (!r || !r.ok) throw r; PW = v; pw.set(v); $("#gate").hidden = true; toast("已登入"); onOk(r); }
    catch (err) { $("#gate-err").textContent = errText(err); }
  });
}

/* ---------- 簽名板 ---------- */
function makePad(wrap) {
  const cv = wrap.querySelector("canvas"), ph = wrap.querySelector(".ph"), ctx = cv.getContext("2d");
  let empty = true, drawing = false, last = null;
  function size() { const r = cv.getBoundingClientRect(); if (!r.width || !empty) return; const dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111111"; ctx.fillStyle = "#111111"; }
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener("pointerdown", (e) => { if (!cv.width) size(); drawing = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} last = pos(e);
    ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fill(); if (empty) { empty = false; ph.hidden = true; } });
  cv.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
  const end = () => { drawing = false; };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  window.addEventListener("resize", size);
  return {
    size, isEmpty: () => empty,
    clear() { empty = true; ph.hidden = false; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); size(); },
    /* 縮成 420px 寬；試算表單格上限 50,000 字，PNG 太大時改存白底 JPEG */
    data() {
      const w = 420, h = Math.round(w * cv.height / cv.width), o = document.createElement("canvas"); o.width = w; o.height = h;
      const c = o.getContext("2d"); c.drawImage(cv, 0, 0, w, h);
      let url = o.toDataURL("image/png"); if (url.length < 45000) return url;
      const j = document.createElement("canvas"); j.width = w; j.height = h; const jc = j.getContext("2d");
      jc.fillStyle = "#ffffff"; jc.fillRect(0, 0, w, h); jc.drawImage(o, 0, 0);
      for (const q of [0.8, 0.6, 0.4]) { url = j.toDataURL("image/jpeg", q); if (url.length < 45000) return url; }
      return url;
    }
  };
}

/* ---------- 評核表 ---------- */
const pads = {};
function metaHTML(k) {
  return `<div class="panel meta">
    <div class="field"><label for="f-date">考核日期</label><input type="date" id="f-date" value="${today()}"></div>
    <div class="field"><label for="f-emp">員編（選填）</label><input id="f-emp" autocomplete="off"></div>
    <div class="field"><label for="f-who">受評者</label><input id="f-who" list="people" placeholder="選擇或輸入姓名" autocomplete="off"></div>
    <div class="field"><label for="f-by">考核者</label><input id="f-by" list="people" placeholder="選擇或輸入姓名" autocomplete="off" value="${esc(ls.get("rxeval-evaluator") || "")}"></div>
    ${k === "cva" ? `<div class="field"><span class="lbl">受評藥師類別</span><div class="seg" role="radiogroup" aria-label="受評藥師類別">
        <input type="radio" class="s" name="cva-type" id="cva-type-new" value="新進人員"><label for="cva-type-new">新進人員</label>
        <input type="radio" class="s" name="cva-type" id="cva-type-gen" value="一般人員" checked><label for="cva-type-gen">一般人員</label></div></div>` : ""}
  </div>`;
}
function stepsHTML(k) {
  const F = FORMS[k];
  const secs = F.sections.map((s) => `<div class="panel" data-sec="${s.id}">
    <div class="sec-h"><h2>${esc(s.label)}<span class="tag">${esc(s.tag)}</span></h2>
      <div class="sec-tools">${F.sections.length > 1 ? `<label class="tog"><input type="checkbox" id="on-${s.id}" checked> 納入本次評核</label>` : ""}
        <button type="button" class="ghost" data-allok="${s.id}">全部正確</button></div></div>
    <div class="steps">${s.steps.map((raw, i) => { const st = stepObj(raw), nm = `st-${s.id}-${i}`;
      return `<div class="step"><span class="n">${i + 1}</span><div class="t">${esc(st.t)}${st.d ? `<small>${esc(st.d)}</small>` : ""}</div>
        <div class="seg" role="radiogroup" aria-label="第${i + 1}項">
          <input type="radio" class="y" name="${nm}" id="${nm}-y" value="y"><label for="${nm}-y">正確</label>
          <input type="radio" class="x" name="${nm}" id="${nm}-x" value="x"><label for="${nm}-x">不正確</label>
          ${st.na ? `<input type="radio" class="na" name="${nm}" id="${nm}-na" value="na"><label for="${nm}-na">不適用</label>` : ""}
        </div></div>`; }).join("")}</div></div>`).join("");
  return secs + (k === "insulin" ? `<div class="rule">第 3 項僅適用預混型（混濁）胰島素；評核非預混型製劑時可選「不適用」，不列入正確率分母。</div>` : "");
}
function cvaHTML() {
  const F = FORMS.cva;
  return `<div class="panel"><div class="sec-h"><h2>考核項目<span class="tag">評核標準以 5 分為基準</span></h2></div>
    <div class="steps">${F.items.map((it, i) => `<div class="step"><span class="n">${i + 1}</span><div class="t"><b>${esc(it.t)}</b><small>${esc(it.d)}</small></div>
      <div class="seg" role="radiogroup" aria-label="${esc(it.t)}">${[1, 2, 3, 4, 5].map((v) => `<input type="radio" class="s" name="cva-${i}" id="cva-${i}-${v}" value="${v}"><label for="cva-${i}-${v}" title="${SCORE_LBL[v]}">${v}</label>`).join("")}</div></div>`).join("")}
      <div class="step"><span class="n">4</span><div class="t"><b>腦中風藥物治療課程</b></div>
      <div class="seg" role="radiogroup" aria-label="課程">
        <input type="radio" class="y" name="cva-course" id="cva-course-y" value="完成"><label for="cva-course-y">完成</label>
        <input type="radio" class="x" name="cva-course" id="cva-course-x" value="未完成"><label for="cva-course-x">未完成</label></div></div>
    </div>
    <div class="rule">評分準則：5 優良、4 良好、3 一般、2 尚可、1 不符合。
      <ol><li>如有任一項 2 分(含)以下，需接受輔導訓練，並於 1 週後覆核，通過後才能執行腦中風藥事照護相關業務。</li>
      <li>藥師依藥學部人力會議安排入藥事照護組擔任臨床工作，於 3 個月內進行首次評核。每年 12 月進行複評。</li></ol></div>
    <div id="cva-flag"></div></div>
  <div class="panel"><div class="sec-h"><h2>覆核紀錄<span class="tag">以下接受覆核時填寫</span></h2>
    <label class="tog"><input type="checkbox" id="rev-on"> 填寫覆核</label></div>
    <div id="rev" class="meta" hidden>
      <div class="field"><span class="lbl">輔導訓練方式</span><label class="tog"><input type="checkbox" id="rev-f2f" checked> 面授指導</label></div>
      <div class="field"><label for="rev-date">覆核日期</label><input type="date" id="rev-date"></div>
      <div class="field"><span class="lbl">覆核結果</span><div class="seg">
        <input type="radio" class="y" name="rev-res" id="rev-pass" value="通過"><label for="rev-pass">通過</label>
        <input type="radio" class="x" name="rev-res" id="rev-fail" value="未通過"><label for="rev-fail">未通過</label></div></div>
      <div class="field"><label for="rev-by">覆核評核藥師</label><input id="rev-by" list="people" autocomplete="off"></div>
    </div></div>`;
}
function sigHTML() {
  return `<div class="panel"><div class="sigs">${["who", "by"].map((r) => `<div class="sig" data-sig="${r}">
    <div class="row"><span class="lbl">${r === "who" ? "受評者簽名" : "考核者簽名"}</span><button type="button" class="ghost" data-clear="${r}">清除</button></div>
    <div class="pad"><canvas></canvas><div class="ph">請在此簽名</div></div></div>`).join("")}</div></div>`;
}

function collect(k) {
  const F = FORMS[k];
  const base = { form: k, date: $("#f-date").value, empId: $("#f-emp").value.trim(), evaluatee: $("#f-who").value.trim(), evaluator: $("#f-by").value.trim(), note: $("#f-note").value.trim() };
  if (F.kind === "steps") {
    const sections = []; let correct = 0, total = 0, marked = 0, need = 0;
    F.sections.forEach((s) => { const on = $(`#on-${s.id}`); if (on && !on.checked) return;
      const res = s.steps.map((_, i) => { const c = $(`input[name="st-${s.id}-${i}"]:checked`); return c ? c.value : ""; });
      res.forEach((v) => { need++; if (v) marked++; if (v === "y") { correct++; total++; } else if (v === "x") total++; });
      sections.push({ id: s.id, res }); });
    return { ...base, sections, score: { correct, total, pct: total ? Math.round(correct / total * 1000) / 10 : null }, _marked: marked, _need: need };
  }
  const scores = FORMS.cva.items.map((_, i) => { const c = $(`input[name="cva-${i}"]:checked`); return c ? +c.value : null; });
  const course = ($('input[name="cva-course"]:checked') || {}).value || "";
  const type = ($('input[name="cva-type"]:checked') || {}).value || "";
  const review = $("#rev-on").checked ? { method: $("#rev-f2f").checked ? "面授指導" : "", date: $("#rev-date").value, result: ($('input[name="rev-res"]:checked') || {}).value || "", by: $("#rev-by").value.trim() } : null;
  return { ...base, type, scores, course, needsTraining: scores.some((s) => s !== null && s <= 2), review, _marked: scores.filter((s) => s !== null).length + (course ? 1 : 0), _need: 4 };
}
function resultText(rec) {
  if (rec.form === "cva") return { txt: (rec.scores || []).map((s, i) => `${i + 1}:${s}`).join("　") + `　課程:${rec.course || "—"}`, bad: !!rec.needsTraining };
  const s = rec.score || {}; return { txt: `${s.correct}/${s.total}（${s.pct}%）`, bad: s.pct !== 100 };
}
function updateScore(k) {
  const r = collect(k);
  $("#sb-l").textContent = `已評 ${r._marked} / ${r._need}`;
  $("#sb-bar").style.width = (r._need ? r._marked / r._need * 100 : 0) + "%";
  if (k === "cva") {
    const done = r.scores.filter((s) => s !== null);
    $("#sb-r").textContent = `平均 ${done.length ? (done.reduce((a, b) => a + b, 0) / done.length).toFixed(1) : "—"} 分`;
    let h = ""; if (r.needsTraining) h += `<div class="flag bad">有項目評分 ≤ 2 分：需接受輔導訓練，並於 1 週後覆核（請填寫下方覆核紀錄）。</div>`;
    if (r.course === "未完成") h += `<div class="flag warn">腦中風藥物治療課程尚未完成。</div>`;
    $("#cva-flag").innerHTML = h;
  } else $("#sb-r").textContent = r.score.pct === null ? "正確率 —" : `正確率 ${r.score.correct}/${r.score.total}（${r.score.pct}%）`;
}
async function loadToday(k) {
  if (!PW) return;
  try { const r = await api.list(PW, today(), today(), true); if (r && r.ok) renderToday(k, r.rows); } catch (e) {}
}
function renderToday(k, rows) {
  const list = (rows || []).filter((r) => r.form === k).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $("#today").innerHTML = list.length ? list.map((r) => `<li><span>${esc(r.evaluatee)}　<small>考核者 ${esc(r.evaluator)}</small></span><span>${esc(resultText(r).txt)}</span></li>`).join("") : `<li><span>尚無紀錄</span></li>`;
}
async function save(k) {
  const r = collect(k), errs = [];
  if (!r.date) errs.push("考核日期"); if (!r.evaluatee) errs.push("受評者"); if (!r.evaluator) errs.push("考核者");
  if (r._need === 0) errs.push("至少納入一種評核"); else if (r._marked < r._need) errs.push(`尚有 ${r._need - r._marked} 項未評`);
  if (pads.who.isEmpty()) errs.push("受評者簽名"); if (pads.by.isEmpty()) errs.push("考核者簽名");
  if (errs.length) { toast("請完成：" + errs.join("、")); return; }
  if (!PW) { needPw(); toast("請先輸入 Dashboard 密碼"); return; }
  const btn = $("#save"); btn.disabled = true; btn.textContent = "送出中…";
  delete r._marked; delete r._need;
  r.summary = resultText(r).txt; r.sigEvaluatee = pads.who.data(); r.sigEvaluator = pads.by.data();
  try {
    const res = await api.save(PW, r);
    if (!res || !res.ok) throw res;
    toast(`評核結果已儲存（${r.evaluatee}｜${FORMS[k].name}）`); resetForm(k, false); loadToday(k);
  } catch (e) { const m = errText(e); if (m === "密碼不正確") needPw(m); toast("送出失敗：" + m); }
  finally { btn.disabled = false; btn.textContent = "送出評核"; }
}
function resetForm(k, full) {
  const keepDate = $("#f-date").value, keepBy = $("#f-by").value;
  $("#eval-form").reset();
  $("#f-date").value = full ? today() : keepDate; $("#f-by").value = keepBy;
  $$(".panel.off").forEach((s) => s.classList.remove("off"));
  if (k === "cva") $("#rev").hidden = true;
  pads.who.clear(); pads.by.clear(); updateScore(k); window.scrollTo({ top: 0 });
}
function buildForm(k) {
  const F = FORMS[k];
  document.title = F.name + "｜評鑑評核";
  app.innerHTML = headerHTML(F.name, F.sub) + gateHTML() +
    `<form id="eval-form" novalidate style="display:flex;flex-direction:column;gap:16px">
      ${metaHTML(k)}${F.kind === "cva" ? cvaHTML() : stepsHTML(k)}
      <div class="panel"><div class="field"><label for="f-note">備註（選填）</label><textarea id="f-note" rows="2"></textarea></div></div>
      ${sigHTML()}
      <div class="actions"><button type="button" class="btn sec" id="btn-reset">清空重填</button><button type="submit" class="btn" id="save">送出評核</button></div>
    </form>
    <div class="today"><h3>今日已送出</h3><ul id="today"><li><span>尚無紀錄</span></li></ul></div>
    <footer>亞東紀念醫院｜臨床藥學科｜藥事照護組</footer>`;
  $("#scorebar").hidden = false;
  pads.who = makePad($('[data-sig="who"] .pad')); pads.by = makePad($('[data-sig="by"] .pad'));
  requestAnimationFrame(() => { pads.who.size(); pads.by.size(); });
  const form = $("#eval-form");
  form.addEventListener("change", () => updateScore(k));
  form.addEventListener("submit", (e) => { e.preventDefault(); save(k); });
  $("#f-by").addEventListener("change", (e) => ls.set("rxeval-evaluator", e.target.value.trim()));
  $("#btn-reset").addEventListener("click", () => resetForm(k, true));
  form.addEventListener("click", (e) => {
    const a = e.target.closest("[data-allok]"); if (a) { const s = F.sections.find((x) => x.id === a.dataset.allok); s.steps.forEach((_, i) => { const el = $(`#st-${s.id}-${i}-y`); if (el) el.checked = true; }); updateScore(k); }
    const c = e.target.closest("[data-clear]"); if (c) pads[c.dataset.clear].clear();
  });
  if (k === "cva") $("#rev-on").addEventListener("change", (e) => { $("#rev").hidden = !e.target.checked; if (e.target.checked && !$("#rev-date").value) $("#rev-date").value = today(); });
  (F.sections || []).forEach((s) => { const t = $(`#on-${s.id}`); if (t) t.addEventListener("change", () => { t.closest(".panel").classList.toggle("off", !t.checked); updateScore(k); }); });
  updateScore(k);
  bindGate((r) => renderToday(k, r.rows));
  PW = pw.get();
  if (!PW) needPw(); else api.list(PW, today(), today(), true).then((r) => { if (r && r.ok) renderToday(k, r.rows); else { const m = errText(r); if (m === "密碼不正確") { PW = null; needPw("Dashboard 密碼已更換，請重新輸入"); } } }).catch(() => {});
}

/* ---------- 列印用評核表 ---------- */
function sheetHTML(rec) {
  const F = FORMS[rec.form];
  const head = `<div class="sh-org">亞東紀念醫院 藥學部 藥事照護組</div><div class="sh-title">${esc(F.docTitle)}</div><div class="sh-ver">${esc(F.ver)}</div>
    <table><tr><th style="width:15%">考核日期</th><td style="width:35%">${esc(rec.date)}</td><th style="width:15%">員編</th><td>${esc(rec.empId) || "—"}</td></tr>
    <tr><th>受評者</th><td>${esc(rec.evaluatee)}${rec.type ? `（${esc(rec.type)}）` : ""}</td><th>考核者</th><td>${esc(rec.evaluator)}</td></tr></table>`;
  let body = "";
  if (rec.form === "cva") {
    const rv = rec.review || null;
    body = `<table><tr><th>考核項目</th><th class="c" style="width:150px">評核標準</th></tr>
      ${F.items.map((it, i) => `<tr><td><b>${i + 1}. ${esc(it.t)}</b>：${esc(it.d)}</td><td class="c">${[1, 2, 3, 4, 5].map((v) => (v === rec.scores[i] ? `■${v}` : `□${v}`)).join(" ")}<br><span style="font-size:11px">${esc(SCORE_LBL[rec.scores[i]] || "")}</span></td></tr>`).join("")}
      <tr><td><b>4. 腦中風藥物治療課程</b></td><td class="c">${rec.course === "完成" ? "■" : "□"} 完成　${rec.course === "未完成" ? "■" : "□"} 未完成</td></tr></table>
      <div class="sum">評分準則：5 優良／4 良好／3 一般／2 尚可／1 不符合。如有任一項 2 分(含)以下，需接受輔導訓練，並於 1 週後覆核。<br>
      <b>判定：</b>${rec.needsTraining ? "有項目 ≤ 2 分，需接受輔導訓練並於 1 週後覆核" : "各項均 ≥ 3 分"}</div>
      <table><tr><th colspan="4">覆核紀錄（接受覆核時填寫）</th></tr>
      <tr><th style="width:15%">輔導方式</th><td>${rv && rv.method ? "■" : "□"} 面授指導</td><th style="width:15%">覆核日期</th><td>${esc(rv && rv.date) || "—"}</td></tr>
      <tr><th>覆核結果</th><td>${rv && rv.result === "通過" ? "■" : "□"} 通過　${rv && rv.result === "未通過" ? "■" : "□"} 未通過</td><th>評核藥師</th><td>${esc(rv && rv.by) || "—"}</td></tr></table>`;
  } else {
    const rows = (rec.sections || []).map((sr) => { const s = F.sections.find((x) => x.id === sr.id); if (!s) return "";
      return `<tr class="grp"><td colspan="3">${esc(s.label)}（${esc(s.tag)}）</td></tr>` + s.steps.map((raw, i) => { const st = stepObj(raw), v = sr.res[i];
        return `<tr><td class="c" style="width:28px">${i + 1}</td><td>${esc(st.t)}${st.d && rec.form === "insulin" ? `<div style="font-size:11px;color:var(--ink-muted)">${esc(st.d)}</div>` : ""}</td>
          <td class="c ${v === "na" ? "na" : ""}" style="width:92px">${v === "y" ? "✓ 正確" : v === "x" ? "✗ 不正確" : "不適用"}</td></tr>`; }).join(""); }).join("");
    const sc = rec.score || {};
    body = `<table><tr><th class="c">#</th><th>${rec.form === "insulin" ? "評核項目／評值說明" : "衛教要點與步驟"}</th><th class="c">結果</th></tr>${rows}</table>
      <div class="sum"><b>正確率：</b>${sc.correct} / ${sc.total}（${sc.pct}%）${rec.form === "insulin" ? "　（不適用項目不列入分母）" : ""}</div>`;
  }
  const note = rec.note ? `<div class="sum"><b>備註：</b>${esc(rec.note)}</div>` : "";
  const sigImg = (u) => (u ? `<img src="${esc(u)}" alt="">` : "");
  const sigs = `<div class="sh-sigs"><div>受評者簽名：${esc(rec.evaluatee)}${sigImg(rec.sigEvaluatee)}</div><div>考核者簽名：${esc(rec.evaluator)}${sigImg(rec.sigEvaluator)}</div></div>`;
  const foot = `<div class="foot"><span>紀錄編號 ${esc(rec.id || "")}</span><span>送出時間 ${rec.createdAt ? new Date(rec.createdAt).toLocaleString("zh-TW", { hour12: false }) : ""}</span></div>`;
  const nRows = (rec.sections || []).reduce((a, x) => a + x.res.length, 0);
  return `<div class="sheet${nRows > 16 ? " compact" : ""}">${head}${body}${note}${sigs}${foot}</div>`;
}
function summaryHTML(rows, total, from, to, page, pages) {
  return `<div class="sheet"><div class="sh-org">亞東紀念醫院 藥學部 藥事照護組</div><div class="sh-title">操作技巧評核總表</div>
    <div class="sh-ver">區間 ${esc(from)} ～ ${esc(to)}｜共 ${total} 筆${pages > 1 ? `｜第 ${page}/${pages} 頁` : ""}</div>
    <table><tr><th class="c">#</th><th>考核日期</th><th>評核項目</th><th>受評者</th><th>考核者</th><th>結果</th></tr>
    ${rows.map((r) => `<tr><td class="c">${r.n}</td><td>${esc(r.date)}</td><td>${esc(FORMS[r.form].name)}</td><td>${esc(r.evaluatee)}</td><td>${esc(r.evaluator)}</td><td>${esc(resultText(r).txt)}${r.form === "cva" && r.needsTraining ? "（需輔導）" : ""}</td></tr>`).join("")}
    </table></div>`;
}

/* ---------- 下載頁 ---------- */
let exRows = [], exSort = { key: "date", dir: 1 }, exFilter = {};
/* 結果欄的分類與排序值 */
const resultCat = (r) => (r.form === "cva" ? (r.needsTraining ? "CVA：需輔導" : "CVA：各項 ≥ 3 分") : ((r.score || {}).pct === 100 ? "正確率 100%" : "正確率未達 100%"));
const resultVal = (r) => (r.form === "cva" ? (r.scores || []).reduce((a, b) => a + (b || 0), 0) / 3 / 5 * 100 : ((r.score || {}).pct || 0));
const COLS = [
  { key: "date", label: "考核日期", val: (r) => r.date, cat: (r) => r.date.slice(0, 7) },
  { key: "form", label: "評核項目", val: (r) => FORMS[r.form].name, cat: (r) => FORMS[r.form].name },
  { key: "evaluatee", label: "受評者", val: (r) => r.evaluatee, cat: (r) => r.evaluatee },
  { key: "evaluator", label: "考核者", val: (r) => r.evaluator, cat: (r) => r.evaluator },
  { key: "result", label: "結果", val: resultVal, cat: resultCat }
];
function shown() {
  const col = COLS.find((c) => c.key === exSort.key) || COLS[0];
  const cmp = (a, b) => { const x = col.val(a), y = col.val(b);
    const d = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "zh-Hant-TW");
    return d ? d * exSort.dir : (a.date === b.date ? (a.createdAt || 0) - (b.createdAt || 0) : a.date < b.date ? -1 : 1); };
  return exRows.filter((r) => COLS.every((c) => !exFilter[c.key] || c.cat(r) === exFilter[c.key])).sort(cmp);
}
function fillFilters() {
  COLS.forEach((c) => { const sel = $(`.colf[data-f="${c.key}"]`); const cur = exFilter[c.key] || "";
    const vals = [...new Set(exRows.map(c.cat))].sort((a, b) => String(a).localeCompare(String(b), "zh-Hant-TW"));
    sel.innerHTML = `<option value="">全部</option>` + vals.map((v) => `<option value="${esc(v)}">${esc(c.key === "date" ? v.replace("-", " 年 ") + " 月" : v)}</option>`).join("");
    sel.value = vals.includes(cur) ? cur : ""; if (!sel.value) delete exFilter[c.key]; });
}
function buildExport() {
  document.title = "評核表下載｜評鑑評核";
  app.innerHTML = headerHTML("評核表下載", "選擇時間區段查詢，勾選要匯出的評核紀錄，下載 PDF（第一頁為總表，之後每筆一頁，含簽名）") + gateHTML() +
    `<div class="panel">
      <div class="filters">
        <div class="field"><label for="ex-from">起日</label><input type="date" id="ex-from"></div>
        <div class="field"><label for="ex-to">迄日</label><input type="date" id="ex-to"></div>
        <div class="field"><label for="ex-form">評核項目</label><select id="ex-form"><option value="">全部</option><option value="inhaler">吸入劑衛教評核</option><option value="insulin">筆型胰島素注射技術</option><option value="cva">CVA 衛教評核</option></select></div>
        <div class="field"><label for="ex-who">受評者</label><input id="ex-who" list="people" placeholder="全部" autocomplete="off"></div>
      </div>
      <div class="quick"><button class="ghost" data-q="month">本月</button><button class="ghost" data-q="lastmonth">上月</button><button class="ghost" data-q="dec">今年 12 月</button><button class="ghost" data-q="year">今年全年</button></div>
      <div class="actions" style="margin-top:14px"><button class="btn sec" id="ex-run">查詢</button><button class="btn" id="ex-pdf" disabled>下載 PDF</button></div>
    </div>
    <div class="tblbar"><span id="ex-count"></span><button class="ghost" id="ex-clear" hidden>清除篩選</button></div>
    <div class="tblwrap"><table class="res"><thead><tr><th><input type="checkbox" id="ex-all" aria-label="全選顯示中的紀錄" checked></th>
      ${COLS.map((c) => `<th><button type="button" class="sortbtn" data-sort="${c.key}">${c.label}<i aria-hidden="true"></i></button></th>`).join("")}<th></th></tr>
      <tr class="frow"><th></th>${COLS.map((c) => `<th><select class="colf" data-f="${c.key}" aria-label="篩選${c.label}"><option value="">全部</option></select></th>`).join("")}<th></th></tr></thead>
    <tbody id="ex-body"><tr><td colspan="7" class="empty">選擇區段後按「查詢」</td></tr></tbody></table></div>
    <p class="sub">評核紀錄存放於「照護組評核紀錄」試算表；要刪除或修正紀錄，請直接在試算表中處理。</p>
    <footer>亞東紀念醫院｜臨床藥學科｜藥事照護組</footer>`;
  setRange("month");
  $$("[data-q]").forEach((b) => b.addEventListener("click", () => { setRange(b.dataset.q); runQuery(); }));
  $("#ex-run").addEventListener("click", runQuery);
  $("#ex-all").addEventListener("change", (e) => { shown().forEach((r) => (r._sel = e.target.checked)); renderRows(); });
  $("#ex-body").addEventListener("change", (e) => { if (e.target.classList.contains("ex-chk")) { exRows[+e.target.dataset.i]._sel = e.target.checked; syncPdfBtn(); } });
  $$(".sortbtn").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.sort; if (exSort.key === k) exSort.dir = -exSort.dir; else { exSort.key = k; exSort.dir = 1; } renderRows(); }));
  $$(".colf").forEach((sel) => sel.addEventListener("change", () => { exFilter[sel.dataset.f] = sel.value; renderRows(); }));
  $("#ex-clear").addEventListener("click", () => { exFilter = {}; $$(".colf").forEach((x) => (x.value = "")); renderRows(); });
  $("#ex-body").addEventListener("click", (e) => { const v = e.target.closest("[data-view]"); if (v) { $("#modal-body").innerHTML = sheetHTML(exRows[+v.dataset.view]); $("#modal").hidden = false; } });
  $("#ex-pdf").addEventListener("click", makePdf);
  bindGate(() => runQuery());
  PW = pw.get(); if (!PW) needPw();
}
function setRange(q) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth(); let a, b;
  if (q === "month") { a = new Date(y, m, 1); b = new Date(y, m + 1, 0); }
  else if (q === "lastmonth") { a = new Date(y, m - 1, 1); b = new Date(y, m, 0); }
  else if (q === "dec") { a = new Date(y, 11, 1); b = new Date(y, 11, 31); }
  else { a = new Date(y, 0, 1); b = new Date(y, 11, 31); }
  $("#ex-from").value = ymd(a); $("#ex-to").value = ymd(b);
}
async function runQuery() {
  const from = $("#ex-from").value, to = $("#ex-to").value, body = $("#ex-body");
  if (!from || !to) { toast("請選擇起迄日期"); return; }
  if (!PW) { needPw(); return; }
  body.innerHTML = `<tr><td colspan="7" class="empty">查詢中…（含簽名，筆數多時需數秒）</td></tr>`;
  try {
    const r = await api.list(PW, from, to, false); if (!r || !r.ok) throw r;
    const fForm = $("#ex-form").value, fWho = $("#ex-who").value.trim();
    exRows = r.rows.filter((x) => FORMS[x.form] && (!fForm || x.form === fForm) && (!fWho || x.evaluatee === fWho))
      .map((x) => Object.assign(x, { _sel: true }));
    fillFilters(); renderRows();
  } catch (e) { const m = errText(e); if (m === "密碼不正確") { PW = null; needPw(m); } body.innerHTML = `<tr><td colspan="7" class="empty">查詢失敗：${esc(m)}</td></tr>`; }
}
function renderRows() {
  const body = $("#ex-body"), list = shown(), nf = Object.keys(exFilter).filter((k) => exFilter[k]).length;
  $$(".sortbtn").forEach((b) => { const on = b.dataset.sort === exSort.key; b.classList.toggle("on", on); b.querySelector("i").textContent = on ? (exSort.dir > 0 ? "▲" : "▼") : "↕"; });
  $("#ex-count").textContent = exRows.length ? (nf ? `顯示 ${list.length} / ${exRows.length} 筆` : `共 ${exRows.length} 筆`) : "";
  $("#ex-clear").hidden = !nf;
  if (!exRows.length) { body.innerHTML = `<tr><td colspan="7" class="empty">此區間沒有評核紀錄</td></tr>`; syncPdfBtn(); return; }
  if (!list.length) { body.innerHTML = `<tr><td colspan="7" class="empty">沒有符合篩選條件的紀錄</td></tr>`; syncPdfBtn(); return; }
  body.innerHTML = list.map((r) => { const rt = resultText(r), i = exRows.indexOf(r);
    return `<tr><td><input type="checkbox" class="ex-chk" data-i="${i}"${r._sel ? " checked" : ""} aria-label="選取"></td><td>${esc(r.date)}</td><td>${esc(FORMS[r.form].name)}</td>
      <td>${esc(r.evaluatee)}</td><td>${esc(r.evaluator)}</td><td><span class="pill ${rt.bad ? (r.form === "cva" ? "bad" : "n") : "ok"}">${esc(rt.txt)}</span></td>
      <td><button class="linkbtn" data-view="${i}">檢視</button></td></tr>`; }).join("");
  syncPdfBtn();
}
function syncPdfBtn() { const vis = shown(), n = vis.filter((r) => r._sel).length; const all = $("#ex-all"); if (all) { all.checked = !!vis.length && n === vis.length; all.indeterminate = n > 0 && n < vis.length; } b = $("#ex-pdf"); b.disabled = !n; b.textContent = n ? `下載 PDF（${n} 筆）` : "下載 PDF"; }
async function renderToPdf(pdf, html, first) {
  const host = $("#render-host"); host.innerHTML = html;
  await Promise.all($$("img", host).map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  const cv = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: "#ffffff", logging: false });
  const pageH = Math.round(cv.width * 297 / 210);
  /* 稍微超過一頁（≤1.5 頁）時整張縮小放進同一頁，避免把表格從中間切開 */
  if (cv.height > pageH && cv.height <= pageH * 1.5) {
    const k = pageH / cv.height, w = 210 * k;
    if (!first) pdf.addPage();
    pdf.addImage(cv.toDataURL("image/jpeg", 0.9), "JPEG", (210 - w) / 2, 0, w, 297);
    return false;
  }
  for (let y = 0, p = 0; y < cv.height; y += pageH, p++) {
    const h = Math.min(pageH, cv.height - y); if (p > 0 && h < 40) break;
    const part = document.createElement("canvas"); part.width = cv.width; part.height = pageH;
    const c = part.getContext("2d"); c.fillStyle = "#ffffff"; c.fillRect(0, 0, part.width, part.height); c.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(part.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297);
    first = false;
  }
  return first;
}
async function makePdf() {
  const sel = shown().filter((r) => r._sel); if (!sel.length) return; /* 依目前的篩選與排序順序匯出 */
  if (!window.jspdf || !window.html2canvas) { toast("PDF 元件尚未載入，請稍後再試"); return; }
  const btn = $("#ex-pdf"); btn.disabled = true;
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", compress: true });
    const from = $("#ex-from").value, to = $("#ex-to").value;
    const numbered = sel.map((r, i) => ({ ...r, n: i + 1 })), per = 32, pages = Math.ceil(numbered.length / per);
    let first = true;
    for (let p = 0; p < pages; p++) { btn.textContent = "產生總表…"; first = await renderToPdf(pdf, summaryHTML(numbered.slice(p * per, (p + 1) * per), numbered.length, from, to, p + 1, pages), first); }
    for (let i = 0; i < sel.length; i++) { btn.textContent = `產生中 ${i + 1}/${sel.length}…`; first = await renderToPdf(pdf, sheetHTML(sel[i]), first); }
    $("#render-host").innerHTML = "";
    const blob = pdf.output("blob"), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `照護組操作技巧評核_${from}_${to}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast("已下載 PDF");
  } catch (e) { console.error(e); toast("PDF 產生失敗：" + (e && e.message || e)); }
  finally { syncPdfBtn(); }
}

/* ---------- 啟動 ---------- */
document.body.insertAdjacentHTML("beforeend", `<datalist id="people">${PEOPLE.map((n) => `<option value="${n}"></option>`).join("")}</datalist>`);
$("#modal-x").addEventListener("click", () => { $("#modal").hidden = true; });
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("#modal").hidden = true; });
if (VIEW === "export") buildExport(); else buildForm(VIEW);
