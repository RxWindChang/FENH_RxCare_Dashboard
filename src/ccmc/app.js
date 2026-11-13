/* ===================== CCMC app ===================== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DMAP = Object.fromEntries(DRUGS.map((d) => [d.id, d]));
const S = { sel: [], cls: 'all', q: '', prep: {}, target: {}, rate: {}, open: {}, prot: {} };
const KEY = 'ccmc.v1';
const NUMF = ['age', 'ht', 'wt', 'scr', 'k', 'mg', 'phos', 'ca', 'ica', 'alb', 'na', 'glu', 'hco3', 'plt', 'hr', 'sbp', 'map'];
const CHKF = ['ecmo', 'mcs', 'mv', 'ttm', 'cvc', 'hf'];


/* ---------- 主診斷：勾選後帶入常用藥並標示最適劑量 ---------- */
const DX = [
  { g: '休克', id: 'septic', n: 'Septic shock', d: ['ne', 'avp', 'hc', 'fent'], f: { ne: /敗血性/, avp: /敗血性/, hc: /敗血性/, fent: /ICU 止痛/ } },
  { g: '休克', id: 'cardio', n: 'Cardiogenic shock', d: ['ne', 'dobu', 'avp', 'epi', 'hc'], f: { ne: /心因性/, dobu: /失代償|休克合併/, avp: /休克/, epi: /休克/, hc: /心因性/ } },
  { g: '休克', id: 'hypo', n: 'Hypovolemic / hemorrhagic shock', d: ['txa', 'cagl', 'ne', 'panto', 'soma'], f: { txa: /外傷/, cagl: /大量輸血/, ne: /休克/, panto: /潰瘍出血/, soma: /靜脈曲張/ } },
  { g: '心血管', id: 'adhf', n: 'Heart failure with AE', d: ['ntg', 'furo', 'dobu', 'levo'], f: { ntg: /心衰竭/, furo: /急性失代償/, dobu: /失代償/, levo: /失代償/ } },
  { g: '心血管', id: 'acs', n: 'ACS', d: ['hep', 'enox', 'ntg', 'tiro'], f: { hep: /NSTE-ACS|PCI 術中/, enox: /治療劑量/, ntg: /ACS/, tiro: /NSTE/ } },
  { g: '心血管', id: 'ad', n: 'Aortic dissection', d: ['labe', 'nicar', 'fent'], f: { labe: /間歇|連續/, nicar: /主動脈/, fent: /ICU 止痛/ } },
  { g: 'NeuroICU', id: 'ais', n: 'Acute ischemic stroke', d: ['tpa', 'labe', 'nicar'], f: { tpa: /中風/, labe: /中風/, nicar: /中風/ } },
  { g: 'NeuroICU', id: 'ich', n: 'ICH / SDH', d: ['nicar', 'labe', 'mann', 'nacl3', 'lev'], f: { nicar: /高血壓急症/, labe: /間歇/, mann: /顱內壓/, nacl3: /顱內壓/, lev: /癲癇預防/ } },
  { g: 'NeuroICU', id: 'tbi', n: 'TBI', d: ['mann', 'nacl3', 'txa', 'lev', 'fent'], f: { mann: /顱內壓/, nacl3: /顱內壓/, txa: /TBI/, lev: /癲癇預防/, fent: /ICU 止痛/ } },
  { g: 'NeuroICU', id: 'sah', n: 'aSAH', d: ['nimo', 'nicar', 'lev', 'nacl3'], f: { nimo: /SAH/, nicar: /高血壓急症/, lev: /癲癇預防/, nacl3: /顱內壓/ } },
  { g: 'NeuroICU', id: 'se', n: 'Status epilepticus', d: ['loraz', 'lev', 'vpa', 'pht', 'mida'], f: { loraz: /^痙攣性/, lev: /癲癇重積/, vpa: /癲癇重積/, pht: /癲癇重積/, mida: /頑固性癲癇重積/ } },
  { g: '代謝', id: 'dka', n: 'DKA / HHS', d: ['ins', 'kcl', 'kphos', 'mg', 'nahco3'], f: { ins: /DKA/, kcl: /低血鉀/, kphos: /低血磷/, mg: /低血鎂/, nahco3: /酸中毒/ } },
];
const DXM = Object.fromEntries(DX.map((x) => [x.id, x]));
function dxFocus(id) { return (S.dx || []).map((k) => DXM[k]).filter((x) => x.d.includes(id)); }
function toggleDx(id, on) {
  S.dx = (S.dx || []).filter((x) => x !== id);
  const x = DXM[id];
  if (on) { S.dx.push(id); x.d.forEach((d) => { if (!S.sel.includes(d)) S.sel.push(d); S.open[d] = false; }); }
  else x.d.forEach((d) => { if (!S.dx.some((k) => DXM[k].d.includes(d))) S.sel = S.sel.filter((y) => y !== d); });
  renderDx(); renderList(); renderDetail(); save();
}
function renderDx() {
  const groups = [...new Set(DX.map((x) => x.g))];
  $('dxBox').innerHTML = groups.map((g) => `<div class="dxg"><span>${g}</span>${DX.filter((x) => x.g === g).map((x) => `<label class="dxc"><input type="checkbox" data-dx="${x.id}" ${(S.dx || []).includes(x.id) ? 'checked' : ''}>${x.n}</label>`).join('')}</div>`).join('');
  $('dxBox').querySelectorAll('input').forEach((c) => c.onchange = () => toggleDx(c.dataset.dx, c.checked));
}

/* ---------- patient ---------- */
function readP() {
  const P = {};
  NUMF.forEach((k) => { const v = $(k).value.trim(); P[k] = v === '' ? null : Number(v); });
  CHKF.forEach((k) => { P[k] = $(k).checked; });
  P.sex = S.sex || null; P.rrt = $('rrt').value; P.child = $('child').value;
  if (P.ht && P.sex) {
    const inch = P.ht / 2.54 - 60;
    P.ibw = Math.max((P.sex === 'M' ? 50 : 45.5) + 2.3 * inch, P.sex === 'M' ? 50 : 45.5);
  }
  if (P.ht && P.wt) P.bmi = P.wt / (P.ht / 100) ** 2;
  if (P.ibw && P.wt) { P.adj = P.ibw + 0.4 * (P.wt - P.ibw); P.obese = (P.bmi ?? 0) >= 30; }
  P.crcl = null;
  if (P.age && P.wt && P.scr && P.sex && P.rrt === 'none') {
    const w = P.ibw ? (P.wt < P.ibw ? P.wt : P.obese ? P.adj : P.ibw) : P.wt;
    P.crclW = w;
    P.crcl = ((140 - P.age) * w) / (72 * P.scr) * (P.sex === 'F' ? 0.85 : 1);
  }
  return P;
}
function patAlerts(P) {
  const a = [];
  if (P.rrt === 'CRRT') a.push(['i', '<b>CRRT</b>：電解質（K、Mg、P）持續流失，依置換液成分補充；levetiracetam、phenobarbital 等可被清除。']);
  if (P.rrt === 'HD') a.push(['i', '<b>iHD</b>：可透析藥物於透析後（AD）給藥或補充；避免 enoxaparin、fondaparinux、morphine。']);
  if (P.ecmo) a.push(['w', '<b>ECMO</b>：脂溶性高的鎮靜止痛藥（fentanyl、midazolam、propofol、dexmedetomidine）被迴路吸附，需求增加；heparin 依 anti-Xa 調整。']);
  if (P.ttm) a.push(['w', '<b>低溫治療（TTM）</b>：CYP 代謝與 Hofmann 降解變慢，midazolam、fentanyl、propofol、phenytoin、cisatracurium 作用延長。']);
  if (P.obese) a.push(['i', `<b>肥胖（BMI ${fx(P.bmi)}）</b>：各藥依 PK 使用 TBW／AdjBW／IBW，卡片上會標示使用的體重。`]);
  if (!P.cvc) a.push(['i', '<b>無中央靜脈導管</b>：需中央給藥的品項會在卡片上提醒；vasopressor 周邊僅短期、近端大靜脈。']);
  if (P.k != null && (P.k < 3 || P.k > 6)) a.push(['d', `<b>血鉀 ${P.k}</b>：危急值，連續 ECG。`]);
  if (P.glu != null && P.glu < 70) a.push(['d', `<b>血糖 ${P.glu}</b>：低血糖，暫停 insulin 並處置。`]);
  return a;
}
function renderPat() {
  const P = readP(); S.P = P;
  const rows = [
    ['BMI', P.bmi ? fx(P.bmi) : '—', ''],
    ['IBW', P.ibw ? fx(P.ibw) : '—', 'kg'],
    ['AdjBW', P.adj ? fx(P.adj) : '—', 'kg'],
    [`CrCl（C-G${P.crclW ? `，${P.obese ? 'AdjBW' : P.wt < P.ibw ? 'TBW' : 'IBW'}` : ''}）`, P.rrt !== 'none' ? P.rrt : P.crcl != null ? r0(P.crcl) : '—', P.rrt !== 'none' ? '' : 'mL/min'],
  ];
  if (P.ca != null && P.alb != null) rows.push(['校正 Ca', fx(P.ca + 0.8 * (4 - P.alb)), 'mg/dL']);
  $('wTable').innerHTML = rows.map(([k, v, u]) => `<tr><td class="k">${k}</td><td class="v">${v} <small>${u}</small></td></tr>`).join('');
  $('pAlerts').innerHTML = patAlerts(P).map(([l, t]) => `<div class="al ${l}">${t}</div>`).join('');
  save();
}

/* ---------- list ---------- */
function score(d, q) {
  if (!q) return 1;
  const h = `${d.g} ${d.b} ${d.kw || ''} ${d.code}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((t) => h.includes(t)) ? 1 : 0;
}
function renderList() {
  const items = DRUGS.filter((d) => (S.cls === 'all' || d.cls === S.cls || d.cls2 === S.cls) && score(d, S.q));
  let h = '';
  CLS.forEach(([k, n]) => {
    const g = items.filter((d) => d.cls === k || d.cls2 === k);
    if (!g.length) return;
    h += `<div class="grp">${n}</div>`;
    h += g.map((d) => {
      const on = S.sel.includes(d.id);
      const rt = d.route === 'ci' ? '連續輸注' : d.route === 'sc' ? '皮下' : '間歇／單次';
      return `<label class="di ms" aria-current="${on}"><input type="checkbox" data-id="${d.id}" ${on ? 'checked' : ''}><span class="n">${esc(d.g)} <i>${esc(d.b)}</i></span><span class="st">${d.line === 'C' ? '<span class="tag no">中央</span>' : d.line === 'CP' ? '<span class="tag adj">中央為佳</span>' : ''}</span><span class="m">${esc(d.spec)}・${rt}</span></label>`;
    }).join('');
  });
  $('dlist').innerHTML = h || '<div class="empty">找不到符合的藥品</div>';
  $('dlist').querySelectorAll('input[type=checkbox]').forEach((c) => c.onchange = () => toggle(c.dataset.id, c.checked));
  $('cnt').textContent = `已選 ${S.sel.length} 項`;
  $('btnNone').hidden = !S.sel.length;
}
function toggle(id, on) {
  S.sel = S.sel.filter((x) => x !== id);
  if (on) { S.sel.push(id); S.open[id] = true; }
  renderList(); renderDetail(); save();
}

/* ---------- infusion math ---------- */
function uparts(u) { return { kg: /\/kg\//.test(u), min: /\/min$/.test(u), num: u.split('/')[0] }; }
function toRate(d, dose, c, w) { const p = uparts(d.ci.u); if (p.kg && !w) return null; return dose * (p.kg ? w : 1) * (p.min ? 60 : 1) / c; }
function toDose(d, rate, c, w) { const p = uparts(d.ci.u); if (p.kg && !w) return null; return rate * c / (p.kg ? w : 1) / (p.min ? 60 : 1); }

/* ---------- compatibility ---------- */
const CL = { C: ['ok', '相容', 'Y-site／三通可並接'], I: ['bad', '不相容', '不可同管路，需不同 lumen'], V: ['mid', '不一定', '依濃度／資料不一，建議分開或確認'], U: ['unk', '無資料', '無可靠資料，以分開 lumen 為原則'], S: ['self', '', ''] };
function lumenPlan(ids) {
  const order = [...ids].sort((a, b) => ids.filter((x) => compat(a, x) !== 'C').length - ids.filter((x) => compat(b, x) !== 'C').length).reverse();
  const L = [];
  order.forEach((id) => {
    if (SOLO[id] && id !== 'nahco3') { L.push([id]); return; }
    const f = L.find((g) => !(g.length === 1 && SOLO[g[0]] && g[0] !== 'nahco3') && g.every((x) => compat(x, id) === 'C'));
    if (f) f.push(id); else L.push([id]);
  });
  return L;
}
function compatHTML(ids) {
  const iv = ids.filter((id) => DMAP[id].route !== 'sc');
  if (iv.length < 2) return '';
  const nm = (id) => DMAP[id].g.replace(/\s*\(.*\)/, '');
  const nb = iv.reduce((n, a, i) => n + iv.slice(i + 1).filter((b) => compat(a, b) === 'I').length, 0);
  let h = `<details class="box cmpbox nabox"${S.cmpOpen ? ' open' : ''}><summary><h4>IV 相容性（Y-site／三通）${nb ? `<span class="tag no">${nb} 組不相容</span>` : ''}<span class="nasum">${iv.length} 項靜脈藥品・點此展開</span></h4></summary><div class="bd">`;
  h += `<div class="mx" style="--n:${iv.length}"><div class="mxc hd"></div>${iv.map((id) => `<div class="mxc hd col" title="${esc(nm(id))}"><span>${esc(nm(id))}</span></div>`).join('')}`;
  iv.forEach((a) => {
    h += `<div class="mxc hd row">${esc(nm(a))}</div>`;
    iv.forEach((b) => { const s = compat(a, b), src = compatSrc(a, b); const [cl, t] = CL[s]; const sl = { tshp: '臨床藥學會表', other: '其他來源（Trissel\'s 整理）', label: '仿單' }[src] || ''; h += `<div class="mxc ${cl}${src && src !== 'tshp' ? ' alt' : ''}" title="${esc(nm(a))} × ${esc(nm(b))}：${t}${sl ? '（' + sl + '）' : ''}">${s === 'S' ? '' : s === 'C' ? '✓' : s === 'I' ? '✕' : s === 'V' ? '△' : '?'}</div>`; });
  });
  h += '</div><div class="lg"><span class="ok">✓ 相容</span><span class="bad">✕ 不相容</span><span class="mid">△ 不一定</span><span class="unk">? 無資料</span><span class="altk">• 非臨床藥學會表</span></div>';
  const bad = [], mid = [];
  iv.forEach((a, i) => iv.slice(i + 1).forEach((b) => { const s = compat(a, b); if (s === 'I') bad.push([a, b]); if (s === 'V') mid.push([a, b]); }));
  if (bad.length) h += `<div class="al d" style="margin-top:10px"><b>不相容，不可同管路：</b>${bad.map(([a, b]) => `${esc(nm(a))} × ${esc(nm(b))}`).join('；')}</div>`;
  if (mid.length) h += `<div class="al w" style="margin-top:6px"><b>結果不一，建議分開：</b>${mid.map(([a, b]) => `${esc(nm(a))} × ${esc(nm(b))}`).join('；')}</div>`;
  iv.filter((id) => SOLO[id]).forEach((id) => { h += `<div class="al w" style="margin-top:6px">${SOLO[id]}</div>`; });
  const L = lumenPlan(iv);
  h += `<h5 class="sub5">建議管路分配（同組內兩兩皆有相容資料）：至少 ${L.length} 條</h5><div class="lumens">${L.map((g, i) => `<div class="lumen"><b>Lumen ${i + 1}</b>${g.map((id) => `<span>${esc(nm(id))}</span>`).join('')}</div>`).join('')}</div>`;
  h += '<p class="note">主要依<b>臨床藥學會第十五屆年輕藥師委員會 Y-site compatibility 表</b>（110 年度醫院醫療品質及病人安全工作目標；合併各科 ICU 工作表，各表結果不一者標 △）。右上角帶小點的格子為該表未收錄、改依其他來源（Trissel\'s 整理或仿單，如 phenytoin）。條件為 Y-site／三通短時間接觸，不等於同袋混合；濃度偏高或非標準稀釋液時結果可能不同。「無資料」不代表不相容，以分開 lumen 或給藥前後沖管為原則。</p>';
  return h + '</div></details>';
}

/* ---------- drug card ---------- */
const LINE = { C: ['no', '須中央靜脈'], CP: ['adj', '中央為佳'], P: ['std', '周邊可'], '': ['std', '皮下'] };
function cardHTML(d, P, idx) {
  const open = S.open[d.id] === undefined ? idx < 3 : S.open[d.id];
  const ec = P.ecmo && d.ecmo;
  const [lc, lt] = LINE[d.line || ''];
  const rt = d.route === 'ci' ? '連續輸注' : d.route === 'sc' ? '皮下注射' : '間歇／單次 IV';
  let h = `<article class="card" id="c-${d.id}"><header class="ch" data-tg="${d.id}"><div><h3>${esc(d.g)} <span class="bn">${esc(d.b)}</span></h3><div class="meta"><span class="tag rt">${esc(d.spec)}</span><span class="tag rt mono">${esc(d.code)}</span><span class="tag ${lc}">${lt}</span>${d.ves === 'V' ? '<span class="tag no">Vesicant</span>' : d.ves === 'I' ? '<span class="tag adj">Irritant</span>' : ''}<span class="tag rt">${rt}</span>${ec ? `<span class="tag ecmo${d.ecmo[0] === 'd' ? ' hi' : ''}">ECMO ${d.ecmo[0] === 'd' ? '高度影響' : d.ecmo[0] === 'w' ? '可能影響' : '注意'}</span>` : ''}${d.utd === 'NA' ? `<span class="tag rt" title="${esc(d.src || '')}">UpToDate 無專論・依仿單（2026-11-13 查證）</span>` : d.utd ? `<span class="tag ok" title="已以 UpToDate 現行版核對${d.src ? '；' + esc(d.src) : ''}">UpToDate 已核對 ${d.utd}</span>` : `<span class="tag pend" title="${esc(d.src || '依 Lexicomp/UpToDate 體例撰寫，尚未逐段核對')}">${d.src ? esc(d.src.split('（')[0]) + '・' : ''}待核對</span>`}</div></div><button class="tgb" aria-expanded="${open}" aria-label="展開或收合">${open ? '收合' : '展開'}</button></header>`;
  if (!open) return h + '</article>';
  h += '<div class="cb">';
  const adj = d.adj ? d.adj(P) : [];
  if (ec) adj.unshift([d.ecmo[0], d.ecmo[1]]);
  if (d.cls === 'nmb' && !P.mv) adj.unshift(['d', '未勾選 Mechanical Ventilator：NMBA 只能用於已插管、機械通氣且已充分鎮靜止痛的病人（rapid sequence intubation 例外）。']);
  if (d.line === 'C' && !P.cvc) adj.unshift(['d', '病人目前未勾選中央靜脈導管：此藥建議經中央靜脈給予。']);
  if (d.line === 'CP' && !P.cvc) adj.unshift(['w', '未勾選中央導管：周邊給藥僅限短期、近端大靜脈並頻繁觀察外滲。']);
  const crit = adj.filter((x) => x[0] === 'd');
  if (crit.length) h += `<div class="alerts">${crit.map(([l, t]) => `<div class="al ${l}">${t}</div>`).join('')}</div>`;
  const fx2 = dxFocus(d.id), rows = d.dose(P).map(([k, v]) => ({ k, v, hit: fx2.filter((x) => x.f[d.id] && x.f[d.id].test(k)) }));
  rows.sort((x, y) => (y.hit.length > 0) - (x.hit.length > 0));
  h += `<div class="sec5"><h5>劑量${fx2.length ? `<small>主診斷：${fx2.map((x) => x.n).join('、')}</small>` : ''}</h5><div class="ind">${rows.map((r) => `<div class="indr${r.hit.length ? ' hi' : ''}"><div class="ik">${r.hit.length ? `<span class="dxt">${r.hit.map((x) => x.n).join('／')}</span>` : ''}${r.k}</div><div class="iv">${r.v}</div></div>`).join('')}</div></div>`;
  if (d.route === 'ci' && d.preps) h += infHTML(d, P);
  if (d.calc === 'prot') h += protHTML();
  const rest = adj.filter((x) => x[0] !== 'd');
  if (rest.length) h += `<div class="sec5"><h5>依此病人調整</h5><div class="alerts">${rest.map(([l, t]) => `<div class="al ${l}">${t}</div>`).join('')}</div></div>`;
  h += `<div class="sec5 two"><div><h5>泡法</h5><p>${d.prep}</p></div><div><h5>給藥途徑</h5><p>${d.admin}${d.ext ? '<br>' + d.ext : ''}</p></div></div>`;
  h += `<div class="sec5"><h5>臨床監測</h5><ul>${d.mon.map((m) => `<li>${m}</li>`).join('')}</ul>${d.notes && d.notes.length ? `<ul class="nt">${d.notes.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}</div>`;
  if (d.nhi) h += `<details class="nhi"><summary>健保給付規定</summary><div class="nhib">${d.nhi}</div></details>`;
  return h + '</div></article>';
}
function infHTML(d, P) {
  const w = d.ci.w ? dw(P, d.ci.w) : null;
  const pi = Math.min(S.prep[d.id] ?? 0, d.preps.length - 1), pr = d.preps[pi];
  const kg = uparts(d.ci.u).kg;
  let h = `<div class="sec5 inf"><h5>輸注速率換算 <small>${esc(d.ci.u)}${kg ? `・${w && w.w ? '以 ' + w.lab : '請輸入體重'}` : ''}</small></h5>`;
  if (d.prods) { const cp = pr.p ?? 0; h += `<div class="prodpick"><span>院內品項</span><div class="seg modes prodseg" data-id="${d.id}">${d.prods.map((q, k) => `<button data-k="${k}" aria-pressed="${k === cp}">${esc(q.l)}<small>${esc(q.s)}・${esc(q.code)}</small></button>`).join('')}</div></div>`; }
  h += `<div class="seg modes prepseg" data-id="${d.id}">${d.preps.map((p, i) => d.prods && (p.p ?? 0) !== (pr.p ?? 0) ? '' : `<button data-i="${i}" aria-pressed="${i === pi}">${esc(p.l)}<small>${fx(p.c, 3)} ${esc(p.cu)}${p.C ? '・中央' : ''}</small></button>`).join('')}</div>`;
  if (pr.C && !P.cvc) h += '<div class="al w" style="margin-top:6px">此濃度建議經中央靜脈。</div>';
  const W = w ? w.w : null;
  if (kg && !W) return h + '<p class="note">輸入身高、體重、性別後顯示 mL/h 換算表。</p></div>';
  h += `<table class="rt"><thead><tr><th>${esc(d.ci.u)}</th>${d.ci.steps.map((s) => `<th class="${s >= d.ci.lo && s <= d.ci.hi ? '' : 'out'}">${s}</th>`).join('')}</tr></thead><tbody><tr><td>mL/h</td>${d.ci.steps.map((s) => `<td class="${s === d.ci.st ? 'st' : ''}">${fx(toRate(d, s, pr.c, W), 1)}</td>`).join('')}</tr></tbody></table>`;
  const t = S.target[d.id] ?? '', r = S.rate[d.id] ?? '';
  const tr = t !== '' ? toRate(d, Number(t), pr.c, W) : null, rd = r !== '' ? toDose(d, Number(r), pr.c, W) : null;
  const flag = (x) => x != null && (x > d.ci.hi * 1.0001) ? ' bad' : '';
  h += `<div class="infg2"><label class="fld"><span>目標劑量</span><div class="inp"><input type="number" step="any" class="tdose" data-id="${d.id}" value="${t}"><span class="u">${esc(d.ci.u)}</span></div></label><div class="kv${flag(Number(t))}"><span>→ 流速</span><b>${tr != null ? fx(tr, 1) : '—'}</b> <small>mL/h</small></div>`;
  h += `<label class="fld"><span>目前流速</span><div class="inp"><input type="number" step="any" class="trate" data-id="${d.id}" value="${r}"><span class="u">mL/h</span></div></label><div class="kv${flag(rd)}"><span>→ 劑量</span><b>${rd != null ? fx(rd, 3) : '—'}</b> <small>${esc(d.ci.u)}</small></div></div>`;
  h += `<p class="note">常用範圍 ${d.ci.lo}–${d.ci.hi} ${esc(d.ci.u)}；粗框為建議起始。超出常用範圍以紅色標示。</p></div>`;
  return h;
}
function protHTML() {
  const p = S.prot;
  const hu = Number(p.hrate || 0) * 2.5 + Number(p.hbolus || 0);
  let txt = '';
  if (hu > 0) txt = `近 2.5 h heparin ≈ ${fx(hu, 0)} units → protamine ${B(fx(Math.min(hu / 100, 50), 1) + ' mg')}${hu / 100 > 50 ? '（已達單次上限 50 mg）' : ''}`;
  if (p.emg) { const e = Number(p.emg), h8 = Number(p.ehr || 0) > 8; txt += `${txt ? '<br>' : ''}Enoxaparin ${e} mg、${h8 ? '>8 h' : '≤8 h'} → protamine ${B(fx(Math.min(e * (h8 ? 0.5 : 1), 50), 1) + ' mg')}`; }
  return `<div class="sec5 inf"><h5>Protamine 劑量計算</h5><div class="grid4"><label class="fld"><span>Heparin 輸注</span><div class="inp"><input type="number" class="pin" data-k="hrate" value="${p.hrate ?? ''}"><span class="u">units/h</span></div></label><label class="fld"><span>2.5 h 內 bolus</span><div class="inp"><input type="number" class="pin" data-k="hbolus" value="${p.hbolus ?? ''}"><span class="u">units</span></div></label><label class="fld"><span>Enoxaparin 末劑</span><div class="inp"><input type="number" class="pin" data-k="emg" value="${p.emg ?? ''}"><span class="u">mg</span></div></label><label class="fld"><span>距末劑</span><div class="inp"><input type="number" class="pin" data-k="ehr" value="${p.ehr ?? ''}"><span class="u">h</span></div></label></div>${txt ? `<div class="ld one" style="margin-top:8px">${txt}</div>` : ''}</div>`;
}
function orderedSel() { const o = []; CLS.forEach(([k]) => S.sel.forEach((id) => { if (DMAP[id].cls === k) o.push(id); })); return o; }
function renderDetail() {
  const P = S.P || readP();
  if (!S.sel.length) {
    $('detail').innerHTML = '<div class="empty"><p style="font-size:15px;color:var(--ink)">在左欄勾選主診斷，或從中間清單勾選藥品（可同時選多項）。</p><p>勾選主診斷會自動帶入 3–5 個常用重症藥品，並把該診斷最適用的劑量列在最上面。</p></div>' + abbrHTML();
    renderSoap(); return;
  }
  const ctx = [];
  if (P.wt) ctx.push(`<span>體重</span><b>${P.wt} kg</b>`);
  ctx.push(`<span>腎功能</span><b>${P.rrt !== 'none' ? P.rrt : P.crcl != null ? 'CrCl ' + r0(P.crcl) : '未輸入'}</b>`);
  if (P.child) ctx.push(`<span>Child-Pugh</span><b>${P.child}</b>`);
  ['ecmo', 'mcs', 'mv', 'ttm'].forEach((k) => { if (P[k]) ctx.push(`<b class="${k === 'ecmo' ? 'ecmoctx' : ''}">${{ ecmo: 'ECMO', mcs: 'IABP／Impella', mv: 'Mechanical Ventilator', ttm: 'TTM' }[k]}</b>`); });
  ctx.push(`<span>中央導管</span><b>${P.cvc ? '有' : '無'}</b>`);
  const ord = orderedSel();
  let h = `<div class="ctxbar">${ctx.join('')}</div>`;
  if (P.ecmo) { const ef = ord.filter((id) => DMAP[id].ecmo && DMAP[id].ecmo[0] !== 'i'); if (ef.length) h += `<div class="al d ecmoal"><b>ECMO 檢核：</b>${ef.map((id) => `<span class="tag ecmo${DMAP[id].ecmo[0] === 'd' ? ' hi' : ''}">${esc(DMAP[id].g)}</span>`).join(' ')} 受迴路吸附或 Vd 改變影響，劑量需求與濃度不可預測，依臨床效果與可得之濃度滴定。</div>`; }
  h += `<div class="cardtools"><span class="hint">主診斷帶入的藥預設收合</span><button class="morebtn" id="expAll">全部展開</button><button class="morebtn" id="colAll">全部收合</button><button class="morebtn" id="printBtn">列印</button></div>`;
  let idx = 0;
  CLS.forEach(([k, n]) => { const ids = ord.filter((id) => DMAP[id].cls === k); if (ids.length) h += `<h2 class="cgrp">${n}<span>${ids.length}</span></h2>` + ids.map((id) => cardHTML(DMAP[id], P, idx++)).join(''); });
  h += compatHTML(S.sel);
  h += abbrHTML();
  h += `<div class="refs"><b>資料來源</b>：劑量、腎肝調整、泡法與監測依 UpToDate（Lexicomp Drug Information）撰寫並逐段核對（標示日期）；未標示者依仿單，待核對。院內規格與批價代碼取自亞東醫院總品項。Y-site 相容性依臨床藥學會 Y-site compatibility 表。健保規定依全民健康保險藥品給付規定。臨床決策仍須依病人狀況、院內 protocol 與最新仿單。</div>`;
  $('detail').innerHTML = h;
  bindDetail(); renderSoap();
}
function bindDetail() {
  document.querySelectorAll('.ch').forEach((e) => e.onclick = () => { const id = e.dataset.tg; S.open[id] = !e.closest('.card').querySelector('.cb'); renderDetail(); });
  document.querySelectorAll('.prodseg button').forEach((b) => b.onclick = () => { const id = b.parentElement.dataset.id, k = Number(b.dataset.k); S.prep[id] = DMAP[id].preps.findIndex((p) => (p.p ?? 0) === k); renderDetail(); save(); });
  document.querySelectorAll('.prepseg button').forEach((b) => b.onclick = () => { S.prep[b.parentElement.dataset.id] = Number(b.dataset.i); renderDetail(); save(); });
  const live = (sel, store) => document.querySelectorAll(sel).forEach((i) => i.onchange = () => { store[i.dataset.id || i.dataset.k] = i.value; renderDetail(); save(); });
  live('.tdose', S.target); live('.trate', S.rate); live('.pin', S.prot);
  const cd = document.querySelector('.cmpbox'); if (cd) cd.ontoggle = () => { S.cmpOpen = cd.open; };
  $('expAll').onclick = () => { S.sel.forEach((id) => { S.open[id] = true; }); renderDetail(); };
  $('colAll').onclick = () => { S.sel.forEach((id) => { S.open[id] = false; }); renderDetail(); };
  $('printBtn').onclick = () => window.print();
}


/* ---------- 縮寫 ---------- */
const ABBR = [
  ['ACS', 'Acute coronary syndrome，急性冠心症'], ['AD', 'After dialysis，透析後給藥'], ['ADHF', 'Acute decompensated heart failure，急性失代償心衰竭'], ['AdjBW', 'Adjusted body weight，校正體重 ＝ IBW + 0.4 ×（TBW − IBW）'],
  ['Afib', 'Atrial fibrillation，心房顫動'], ['UGI bleeding', 'Upper gastrointestinal bleeding，上消化道出血'], ['AIS', 'Acute ischemic stroke，急性缺血性中風'], ['aPTT', 'Activated partial thromboplastin time'], ['ARC', 'Augmented renal clearance，腎廓清增強'],
  ['ARDS', 'Acute respiratory distress syndrome，急性呼吸窘迫症候群'], ['aSAH', 'Aneurysmal subarachnoid hemorrhage，動脈瘤性蜘蛛膜下腔出血'], 
  ['BG', 'Blood glucose，血糖'], ['BMI', 'Body mass index'], ['BPS', 'Behavioral Pain Scale'], ['BTF', 'Brain Trauma Foundation'], ['BZD', 'Benzodiazepine，苯二氮平類'],
  ['CABG', 'Coronary artery bypass grafting，冠狀動脈繞道手術'], ['CAM-ICU', 'Confusion Assessment Method for the ICU，譫妄評估'], ['CCB', 'Calcium channel blocker，鈣離子通道阻斷劑'], ['CI', 'Cardiac index，心臟指數'],
  ['CKD', 'Chronic kidney disease'], ['CP（Child-Pugh）', 'Child-Turcotte-Pugh 肝功能分級 A／B／C'], ['CrCl', 'Creatinine clearance（Cockcroft-Gault）'],
  ['CRRT', 'Continuous renal replacement therapy（CVVH／CVVHD／CVVHDF）'], ['CVC', 'Central venous catheter，中央靜脈導管'], ['CVP', 'Central venous pressure'],
  ['D5W', '5% dextrose in water'], ['DEHP', 'Di(2-ethylhexyl) phthalate，PVC 塑化劑'], ['DKA／HHS', 'Diabetic ketoacidosis／Hyperosmolar hyperglycemic state'], ['DOAC', 'Direct oral anticoagulant'],
  ['ECG', 'Electrocardiogram'], ['ECMO', 'Extracorporeal membrane oxygenation，葉克膜'], ['EEG', 'Electroencephalogram'], 
  ['GCS', 'Glasgow Coma Scale'], ['GP IIb/IIIa', 'Glycoprotein IIb/IIIa receptor'], ['HFrEF', 'Heart failure with reduced ejection fraction'], ['HIT', 'Heparin-induced thrombocytopenia'],
  ['HRS-AKI', 'Hepatorenal syndrome–acute kidney injury，肝腎症候群'], ['IABP', 'Intra-aortic balloon pump，主動脈內氣球幫浦'], ['IBW', 'Ideal body weight（Devine）'], ['iCa', 'Ionized calcium，游離鈣'],
  ['ICH／SDH', 'Intracerebral hemorrhage／Subdural hematoma'], ['ICP', 'Intracranial pressure，顱內壓'], ['iHD', 'Intermittent hemodialysis，間歇性血液透析'], ['IM／IV／IO／SC', 'Intramuscular／Intravenous／Intraosseous／Subcutaneous'],
  ['LBW', 'Lean body weight'], ['LMWH', 'Low-molecular-weight heparin'], ['LR', "Lactated Ringer's"], ['MAP', 'Mean arterial pressure'],
  ['NCS', 'Neurocritical Care Society'], ['NMBA', 'Neuromuscular blocking agent，神經肌肉阻斷劑'], ['NS', 'Normal saline（0.9% NaCl）'],
  ['NSTE-ACS／STEMI', 'Non-ST-elevation ACS／ST-elevation myocardial infarction'], ['PADIS', 'SCCM Pain, Agitation, Delirium, Immobility, Sleep guideline'],
  ['PCI', 'Percutaneous coronary intervention'], ['PD', 'Peritoneal dialysis，腹膜透析'], 
  ['PG', 'Propylene glycol'], ['PICC', 'Peripherally inserted central catheter'], ['PPI', 'Proton pump inhibitor'], ['PSVT', 'Paroxysmal supraventricular tachycardia'],
  ['PVC', 'Polyvinyl chloride（管路材質）'], ['QD／QOD／Q3D', '每日一次／隔日一次／每三日一次'], ['Q4H–Q12H', '每 4–12 小時一次（不等同 BID／TID／QID）'], ['QTc', 'Corrected QT interval'],
  ['RASS', 'Richmond Agitation-Sedation Scale'], ['RRT', 'Renal replacement therapy'], 
  ['ScvO₂／SvO₂', 'Central／Mixed venous oxygen saturation'], ['SCr', 'Serum creatinine'], ['SSC', 'Surviving Sepsis Campaign'], 
  ['SWFI', 'Sterile water for injection'], ['TBI', 'Traumatic brain injury'], ['TBW', 'Total body weight（實際體重）；Na 公式中為 total body water'], ['TDM', 'Therapeutic drug monitoring'],
  ['TG', 'Triglyceride，三酸甘油酯'], ['TTM', 'Targeted temperature management，目標體溫管理'], 
  ['VF／VT', 'Ventricular fibrillation／tachycardia'], ['VTE', 'Venous thromboembolism'], ['WPW', 'Wolff-Parkinson-White syndrome'], ['Y-site', '兩條輸液於 Y 型接頭或三通交會之短時間接觸'],
];
ABBR.push(['ACLF', 'Acute-on-chronic liver failure'], ['APAP', 'Acetaminophen（paracetamol）'], ['AST／ALT', 'Aspartate／Alanine aminotransferase'], ['4F-PCC', 'Four-factor prothrombin complex concentrate（Factor II, VII, IX, X）'], ['DIC', 'Disseminated intravascular coagulation'], ['dTT／ECT', 'Diluted thrombin time／Ecarin clotting time'], ['EPS', 'Extrapyramidal symptoms，錐體外症候群'], ['FDA／EMA／TFDA', 'U.S. Food and Drug Administration／European Medicines Agency／衛福部食藥署'], ['HES', 'Hydroxyethyl starch'], ['INR', 'International normalized ratio'], ['IN', 'Intranasal'], ['IU', 'International unit'], ['NSAID', 'Nonsteroidal anti-inflammatory drug'], ['PRN', 'As needed'], ['SSRI／SNRI', 'Selective serotonin／Serotonin-norepinephrine reuptake inhibitor']);
ABBR.sort((a, b) => a[0].replace(/^\d+F-/, '').localeCompare(b[0].replace(/^\d+F-/, ''), 'en', { sensitivity: 'base' }));
function abbrHTML() { return `<details class="abbr"><summary>縮寫表（${ABBR.length}）</summary><div class="abbrt"><table>${ABBR.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('')}</table></div></details>`; }

/* ---------- SOAP（英文，精簡） ---------- */
const EN = {
  etom: (P) => { const w = dw(P, 'B40').w; return `Etomidate 0.3 mg/kg IV${w ? ` (${fx(0.3 * w, 0)} mg)` : ''} for rapid sequence intubation (range 0.2–0.3 mg/kg).`; },
  sux: (P) => `Succinylcholine 1–1.5 mg/kg IV${P.wt ? ` (${r0(P.wt)}–${r0(1.5 * P.wt)} mg)` : ''} for rapid sequence intubation; avoid if hyperkalemia risk.`,
  diaz: () => 'Diazepam 5–10 mg IV (<=5 mg/min), may repeat Q3–5 min; follow with non-benzodiazepine antiseizure medication.',
  halo: (P) => `Haloperidol 0.5–2.5 mg IV PRN agitation (moderate 2–5 mg), repeat Q15–30 min until calm${P.child ? ` (Child-Pugh ${P.child}: start <=${P.child === 'C' ? 25 : 50}%)` : ''}; cardiac monitoring for QTc.`,
  pare: (P) => (P.age >= 65 || (P.wt && P.wt < 50)) ? 'Parecoxib 20 mg IV, then 20 mg Q12H (max 40 mg/day).' : 'Parecoxib 40 mg IV, then 20–40 mg Q6–12H (max 80 mg/day).',
  apap: (P) => P.wt && P.wt < 50 ? `Paracetamol 15 mg/kg IV Q6H (${r0(Math.min(15 * P.wt, 750))} mg; max 75 mg/kg/day).` : `Paracetamol 1,000 mg IV Q6H (max ${P.child === 'C' ? 2 : P.child === 'B' ? 3 : 4} g/day).`,
  keto: (P) => (typeof renal(P) === 'number' && renal(P) > 30 && renal(P) < 60) ? 'Ketorolac 7.5–15 mg IV Q6H PRN (CrCl 30–60; prefer non-NSAID), <=5 days.' : (P.age >= 65 || (P.wt && P.wt < 50)) ? 'Ketorolac 15 mg IV Q6H (max 60 mg/day, <=5 days).' : 'Ketorolac 15–30 mg IV Q6H (max 120 mg/day, <=5 days).',
  tram: (P) => ((typeof renal(P) === 'number' && renal(P) < 30) || P.rrt !== 'none') ? 'Tramadol 50–100 mg IV Q12H (max 200 mg/day).' : 'Tramadol 50–100 mg IV Q4–6H PRN (max 400 mg/day).',
  nalb: () => 'Nalbuphine 10 mg IV Q3–6H PRN (per 70 kg; max 20 mg/dose, 160 mg/day).',
  nalox: () => 'Naloxone 0.04–0.4 mg IV, repeat/escalate Q2–3 min to adequate respiration; infusion 2/3 of effective bolus per hour if needed.',
  atro: () => 'Atropine 1 mg IV Q3–5 min (max 3 mg).',
  neo: (P) => `Neostigmine 0.02–0.07 mg/kg IV by train-of-four count (max 5 mg)${P.wt ? ` (${fx(0.02 * P.wt, 1)}–${fx(Math.min(0.07 * P.wt, 5), 1)} mg)` : ''} with glycopyrrolate or atropine; reduce in CrCl <=50.`,
  pcc: (P) => `4-factor PCC (Beriplex) per INR: 25/35/50 IU/kg${P.wt ? ` (${fx(Math.min(25 * P.wt, 2500), 0)}/${fx(Math.min(35 * P.wt, 3500), 0)}/${fx(Math.min(50 * P.wt, 5000), 0)} IU)` : ''} + vitamin K1 IV; infuse <=8.4 mL/min.`,
  vitk: () => 'Vitamin K1 2.5–10 mg IV in >=50 mL over 10–20 min (<=1 mg/min); recheck INR in 6–12 h.',
  famo: (P) => ((typeof renal(P) === 'number' && renal(P) < 50) || P.rrt !== 'none') ? 'Famotidine 10 mg IV Q12H or 20 mg QD (CrCl <50).' : 'Famotidine 20 mg IV Q12H.',
  meto: (P) => ((typeof renal(P) === 'number' && renal(P) <= 60) || P.rrt !== 'none') ? 'Metoclopramide 5 mg IV Q6–8H (renal: ~33–50% of usual daily dose).' : 'Metoclopramide 5–10 mg IV Q6–8H (max 40 mg/day).',
  terli: () => 'Terlipressin acetate 2 mg IV Q4H up to 48 h (variceal bleeding) / 1 mg IV Q6H with albumin, adjust on day 4 (hepatorenal syndrome).',
  nac: (P) => `Acetylcysteine 150 mg/kg over 1 h, 50 mg/kg over 4 h, 100 mg/kg over 16 h${P.wt ? ` (${r0(Math.min(150 * P.wt, 15000))}/${r0(Math.min(50 * P.wt, 5000))}/${r0(Math.min(100 * P.wt, 10000))} mg)` : ''}.`,
  thia: () => 'Thiamine 200–500 mg IV TID x 2–3 days (Wernicke) / 100 mg IV QD (prophylaxis).',
  hes: () => 'Voluven 6%: avoid in sepsis/critical illness/renal impairment; max 30 mL/kg/day if used.',
  idar: () => 'Idarucizumab 5 g IV (2 vials).',
  vera: () => 'Verapamil 5–10 mg IV over >=2 min; may repeat in 15–30 min.',
  aden: () => 'Adenosine 6 mg rapid IV push + 20 mL NS flush; 12 mg if no response.',
  dig: (P) => `Digoxin 0.25–0.5 mg IV, then 0.25 mg Q6H (max 1.5 mg/24 h)${(typeof renal(P) === 'number' && renal(P) <= 15) || P.rrt !== 'none' ? '; give 50% (CrCl <=15/RRT)' : ''}.`,
  enox: (P) => `Enoxaparin ${P.wt ? r0(P.wt) + ' mg' : '1 mg/kg'} SC ${(typeof renal(P) === 'number' && renal(P) < 30) ? 'QD (CrCl <30)' : 'Q12H'}${P.rrt !== 'none' ? ' — avoid on RRT; use UFH' : ''}.`,
  fonda: () => 'Fondaparinux 2.5 mg SC QD (prophylaxis); contraindicated if CrCl <30.',
  tpa: (P) => P.wt ? `Alteplase ${fx(Math.min(0.9 * P.wt, 90), 1)} mg (0.9 mg/kg, max 90): 10% bolus over 1 min, remainder over 60 min.` : 'Alteplase 0.9 mg/kg (max 90 mg).',
  uk: () => 'Urokinase per protocol (intrapleural/catheter clearance).',
  loraz: () => 'Lorazepam 4 mg IV (<=2 mg/min), may repeat once in 3–5 min.',
  pht: (P) => P.wt ? `Phenytoin loading dose ${fx(rnd((P.bmi >= 40 ? 15 : 20) * P.wt, 50), 0)} mg IV in NS (<=50 mg/min, ECG/BP), then 100 mg Q8H after 8–12 h.` : 'Phenytoin 20 mg/kg IV loading dose (<=50 mg/min).',
  lev: (P) => { const c = renal(P); const dx = S.dx || []; if (!dx.includes('se') && dx.some((k) => ['ich', 'tbi', 'sah'].includes(k))) { const m = P.rrt === 'HD' ? '500–1000 mg QD + 250–500 mg after dialysis (AD)' : P.rrt === 'CRRT' ? '1000 mg Q12H' : P.rrt === 'PD' ? '500 mg QD' : typeof c !== 'number' || c >= 50 ? '1000 mg IV Q12H' : c >= 30 ? '750 mg Q12H' : c >= 15 ? '500 mg Q12H' : '500 mg QD'; return `Levetiracetam ${m} for seizure prophylaxis${dx.includes('tbi') ? ' (TBI: 7 days)' : ''}.`; } const m = P.rrt === 'HD' ? '500–1000 mg QD + 250–500 mg after dialysis (AD)' : P.rrt === 'CRRT' ? '750–1250 mg Q12H' : P.rrt === 'PD' ? '250–500 mg QD' : typeof c === 'number' ? (c >= 80 ? '500–1500 mg Q12H' : c >= 50 ? '500–1000 mg Q12H' : c >= 30 ? '250–750 mg Q12H' : c >= 15 ? '250–500 mg Q12H' : '250–500 mg QD') : '500–1500 mg Q12H'; return `Levetiracetam${P.wt ? ` loading dose ${fx(Math.min(rnd(60 * P.wt, 250), 4500), 0)} mg (60 mg/kg, max 4.5 g) over 10–15 min;` : ''} maintenance ${m}.`; },
  vpa: (P) => `Valproate${P.wt ? ` loading dose ${fx(Math.min(rnd(40 * dw(P, 'ADJ').w, 100), 3000), 0)} mg (40 mg/kg, max 3 g);` : ''} maintenance 10–15 mg/kg/day Q6H; check VPA level/NH3; avoid carbapenems.`,
  lcm: () => 'Lacosamide 200–400 mg IV loading dose, then 100–200 mg Q12H; ECG (PR).',
  pb: (P) => `Phenobarbital ${P.wt ? fx(rnd(20 * dw(P, 'ADJ').w, 50), 0) + ' mg (20 mg/kg)' : '20 mg/kg'} IV at 50–100 mg/min; airway ready.`,
  brv: () => 'Brivaracetam 50 mg IV BID.',
  kcl: (P) => `KCl ${P.k != null && P.k < 3.5 ? (P.k >= 3 ? '20–60 mEq' : '10–20 mEq/h') : 'per K level'}; ${P.cvc ? 'central <=20 mEq/h' : 'peripheral <=10 mEq/h'}.`,
  mg: (P) => `MgSO4 ${P.mg != null ? (P.mg >= 1.5 ? '1–2 g over 1–2 h' : P.mg >= 1 ? '2–4 g over 2–12 h' : '4–8 g over 4–24 h') : 'per Mg level'}.`,
  kphos: () => 'K phosphate per P level (0.08–0.64 mmol/kg over 4–6 h); 1 mL = P 3 mmol/K 4.4 mEq.',
  naglyp: () => 'Na glycerophosphate per P level (1 mL = P 1 mmol, Na 2 mmol).',
  cagl: () => 'Ca gluconate 1–2 g IV over 10–20 min (hyperK: 1–2 g over 2–5 min).',
  nahco3: () => 'NaHCO3 ~90–100 mEq IV if pH <7.1 (or <=7.2 with severe AKI); recheck ABG q2h.',
  nacl3: (P) => { if (P.wt && P.na != null) { const f = P.sex === 'F' ? (P.age >= 65 ? 0.45 : 0.5) : (P.age >= 65 ? 0.5 : 0.6); const perL = (513 - P.na) / (f * P.wt + 1); return `3% NaCl: expected +${fx(perL / 10, 1)} mEq/L per 100 mL; 24-h limit (+8 mEq/L) ≈ ${r0(8 / perL * 1000)} mL; check Na q2–6h.`; } return '3% NaCl 100 mL over 10 min for severe symptoms (max 3 doses); Na rise <=8 mEq/L/24 h.'; },
  prot: () => 'Protamine 1 mg/100 units heparin (preceding 2–3 h), max 50 mg, <=5 mg/min.',
  flum: () => 'Flumazenil 0.2 mg IV over 2 min, repeat q1min, max 1 mg.',
  hc: () => 'Hydrocortisone 50 mg IV Q6H (or 200 mg/day CI) while on vasopressors.',
  dexa: () => 'Dexamethasone 10 mg IV then 16–40 mg/day (vasogenic edema).',
  mpred: (P) => `Methylprednisolone ${P.wt ? r0(P.wt) + ' mg' : '1 mg/kg'} IV loading dose then 1 mg/kg/day (early ARDS) with taper.`,
  mann: (P) => `Mannitol 20% ${P.wt ? `${r0(0.5 * P.wt)}–${r0(P.wt)} g` : '0.5–1 g/kg'} IV over 10–30 min; monitor osm gap/renal fn.`,
  glyc: () => 'Glycerol (Glycetose) 200–500 mL over 2–3 h QD–BID.',
  txa: () => 'TXA 1 g IV over 10 min, then 1 g over 8 h (trauma, within 3 h).',
  ddavp: () => 'Desmopressin 1 mcg IV Q12H (arginine vasopressin deficiency); monitor Na/UO.',
  alb: () => 'Albumin 25% per indication (NHI criteria apply).',
  pge1: () => 'Alprostadil 40 mcg IV over 2 h BID.',
};
function enPlan(d, P) {
  if (EN[d.id]) return EN[d.id](P);
  if (d.ci && d.preps) {
    const pr = d.preps[Math.min(S.prep[d.id] ?? 0, d.preps.length - 1)], w = d.ci.w ? dw(P, d.ci.w).w : null;
    const t = S.target[d.id] !== undefined && S.target[d.id] !== '' ? Number(S.target[d.id]) : d.ci.st;
    const r = toRate(d, t, pr.c, w);
    return `${d.g} ${pr.l.replace(/[（）]/g, ' ').replace(/至/g, 'to').replace(/／/g, '/').replace(/原液/g, 'undiluted').replace(/[\u4e00-\u9fff]+/g, '').replace(/\s+/g, ' ').trim()} (${fx(pr.c, 3)} ${pr.cu}): ${S.target[d.id] ? '' : 'start '}${t} ${d.ci.u}${r != null ? ` = ${fx(r, 1)} mL/h` : ''}; usual ${d.ci.lo}–${d.ci.hi} ${d.ci.u}.`;
  }
  return `${d.g}: see dosing card.`;
}
const MONEN = { vp: 'MAP/HR/lactate/UO', bp: 'BP q5–15 min until stable', aa: 'continuous ECG/HR/BP', ac: 'aPTT or anti-Xa, CBC, bleeding', sed: 'RASS/Critical-Care Pain Observation Tool, daily SAT', nmb: 'train-of-four 1–2/4, deep sedation, eye care', aed: 'cEEG, drug levels (PHT/VPA/PB)', el: 'electrolytes q4–6h', rev: 'response/aPTT', icp: 'Na/osm/ICP', hem: 'Hb, bleeding, Na (DDAVP)', oth: 'BG, volume status' };
function renderSoap() {
  const box = $('soap'); if (!box) return;
  const P = S.P || readP(), ord = orderedSel();
  const dx = (S.dx || []).map((k) => DXM[k].n);
  const dev = [P.mv && 'mechanical ventilator', P.ecmo && 'ECMO', P.mcs && 'IABP/Impella', P.ttm && 'TTM', P.cvc && 'CVC'].filter(Boolean);
  /* 編號列點；重點才加符號：□ 一般、■ 重要、★ 重點中的重點。子項以全形空白縮排 */
  const SY = { g: '□ ', i: '■ ', k: '★ ', n: '' };
  const line = (n, [l, t, sub]) => `${n + 1}. ${SY[l || 'n']}${t}${(sub || []).map((x) => `\n　□ ${x}`).join('')}`;
  const sec = (h, items) => [h, ...(items.length ? items : [['n', '—']]).map((x, n) => line(n, x))].join('\n');
  const L = [];
  L.push(sec('S:', [['n', `Dx: ${dx.length ? dx.join(', ') : 'ICU patient'}`], ...(dev.length ? [['n', `Devices: ${dev.join(', ')}`]] : [])]));
  const o = [];
  if (P.age || P.sex) o.push(`${P.age ? `${P.age} year-old` : ''}${P.sex ? ` ${P.sex === 'M' ? 'male' : 'female'}` : ''}`.trim());
  if (P.wt) o.push(`TBW ${P.wt} kg${P.obese ? ` (BMI ${fx(P.bmi)}; IBW ${fx(P.ibw)}, AdjBW ${fx(P.adj)})` : ''}`);
  const rf = [P.scr != null ? `SCr ${P.scr}` : '', P.rrt !== 'none' ? P.rrt : P.crcl != null ? `CrCl ${r0(P.crcl)} mL/min` : '', P.child ? `Child-Pugh ${P.child}` : ''].filter(Boolean);
  const vit = [['MAP', 'map'], ['HR', 'hr']].filter(([, k]) => P[k] != null).map(([n, k]) => `${n} ${P[k]}`);
  const lab = [['K', 'k'], ['Mg', 'mg'], ['P', 'phos'], ['Na', 'na'], ['Alb', 'alb'], ['Glu', 'glu'], ['HCO3', 'hco3'], ['PLT', 'plt']].filter(([, k]) => P[k] != null).map(([n, k]) => `${n} ${P[k]}`);
  const O = [];
  if (o.length) O.push(['n', o.join(', ')]);
  if (rf.length) O.push(['n', `Organ function: ${rf.join(', ')}`]);
  if (vit.length) O.push(['n', `Vitals: ${vit.join(', ')}`]);
  if (lab.length) O.push(['n', `Labs: ${lab.join(', ')}`]);
  L.push(sec('O:', O));
  const A = [];
  if (ord.length) {
    const ren = ord.filter((id) => (DMAP[id].adj ? DMAP[id].adj(P) : []).some(([l, t]) => l !== 'i' && /CrCl|腎|HD|CRRT|PD|透析|eGFR/.test(t))).map((id) => DMAP[id].g);
    const hep = ord.filter((id) => (DMAP[id].adj ? DMAP[id].adj(P) : []).some(([l, t]) => l !== 'i' && /肝|Child/.test(t))).map((id) => DMAP[id].g);
    /* 只列「此病人才出現」的禁忌：與無器官功能異常的基準病人比較 */
    const P0 = { ...P, scr: 0.8, crcl: 100, rrt: 'none', child: '', k: 4, na: 140, mg: 2, plt: 250, hf: false, age: 45, ecmo: false, mcs: false, mv: true };
    const ci = ord.filter((id) => { const d = DMAP[id]; if (!d.adj) return false; const base = new Set(d.adj(P0).map(([, t]) => t)); return d.adj(P).some(([l, t]) => l === 'd' && !base.has(t)); }).map((id) => DMAP[id].g);
    const iv = ord.filter((id) => DMAP[id].route !== 'sc'), bad = [];
    iv.forEach((a, i) => iv.slice(i + 1).forEach((b) => { if (compat(a, b) === 'I') bad.push(`${DMAP[a].g}/${DMAP[b].g}`); }));
    if (ci.length) A.push(['k', `Contraindicated/avoid in this patient: ${ci.join(', ')} — see dosing card.`]);
    if (bad.length) A.push(['k', `Y-site incompatible: ${bad.join('; ')} — separate lumens.`]);
    if (P.ecmo) { const e = ord.filter((id) => DMAP[id].ecmo && DMAP[id].ecmo[0] !== 'i').map((id) => DMAP[id].g); if (e.length) A.push(['i', `ECMO sequestration/Vd change: ${e.join(', ')} — titrate to effect/levels.`]); }
    if (ren.length) A.push(['n', `Renal dose consideration: ${ren.join(', ')}.`]);
    if (hep.length) A.push(['n', `Hepatic consideration: ${hep.join(', ')}.`]);
    const nc = ord.filter((id) => DMAP[id].line === 'C' || (DMAP[id].line === 'CP' && !P.cvc)).map((id) => DMAP[id].g);
    if (nc.length && !P.cvc) A.push(['i', `No CVC: ${nc.join(', ')} preferably via central line.`]);
  }
  L.push(sec('A:', A.length ? A : [['n', 'No major dose/compatibility issue identified.']]));
  const Pl = ord.map((id) => ['n', enPlan(DMAP[id], P), SUBEN[id] ? [SUBEN[id]] : []]);
  const ivs = ord.filter((id) => DMAP[id].route !== 'sc');
  if (ivs.length > 1) { const lp = lumenPlan(ivs); Pl.push(['n', 'IV access and compatibility', lp.map((g, i) => `Line ${i + 1}: ${g.map((id) => DMAP[id].g.split(' ')[0]).join('+')}`)]); }
  const mons = [...new Set(ord.map((id) => MONEN[DMAP[id].cls]).filter(Boolean))];
  if (mons.length) Pl.push(['g', `Monitor: ${mons.join('; ')}.`]);
  L.push(sec('P:', Pl));
  box.value = L.join('\n\n');
}
/* P 段各藥的追蹤子項 */
const SUBEN = { kcl: 'Recheck K.', mg: 'Recheck Mg after 6–12 h.', kphos: 'Recheck P and Ca.', naglyp: 'Recheck P, Ca and Na.', cagl: 'Recheck iCa.', nahco3: 'Recheck ABG, Na and K.', nacl3: 'Check Na q4–6h.', ins: 'Check BG hourly; keep K >3.3 mEq/L.', hc: 'Monitor blood glucose.', dexa: 'Monitor blood glucose.', mpred: 'Monitor blood glucose.', hep: 'Check aPTT/anti-Xa 6 h after each change.', enox: 'Anti-Xa if renal impairment or obesity.', pht: 'Check level (free level if low albumin).', vpa: 'Check level, ammonia, LFT and PLT.', pb: 'Check level.', prop: 'Check triglyceride.', mann: 'Check Na and osmolar gap.', amio: 'ECG (QTc) and LFT.', dig: 'Check digoxin level and K.', tiro: 'Watch for bleeding; check PLT.', tpa: 'Neuro check and bleeding watch.', uk: 'Watch for bleeding.', nicar: 'BP q15 min until target.', labe: 'BP and HR q15 min until target.', pcc: 'Recheck INR 30 min after.', vitk: 'Recheck INR in 6–12 h.', furo: 'I/O, K and Mg.', bume: 'I/O, K and Mg.', amino: 'Check theophylline level.', nac: 'APAP level, LFT and INR.', halo: 'ECG (QTc).', nalox: 'Watch for re-sedation.', rocu: 'Train-of-four 1–2/4; ensure deep sedation.', cisa: 'Train-of-four 1–2/4; ensure deep sedation.', atra: 'Train-of-four 1–2/4; ensure deep sedation.', nimo: 'Avoid hypotension.', terli: 'SpO2, Na and fluid status.', avp: 'Usually fixed at 0.03 units/min (add-on to norepinephrine).' };

/* ---------- persistence ---------- */
function save() {
  try {
    const o = { sel: S.sel, dx: S.dx, prep: S.prep, sex: S.sex, rrt: $('rrt').value, child: $('child').value };
    NUMF.forEach((k) => { o[k] = $(k).value; }); CHKF.forEach((k) => { o[k] = $(k).checked; });
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { o = null; }
  if (!o) return;
  NUMF.forEach((k) => { if (o[k] != null) $(k).value = o[k]; });
  CHKF.forEach((k) => { if (o[k] != null) $(k).checked = o[k]; });
  if (o.rrt) $('rrt').value = o.rrt; if (o.child != null) $('child').value = o.child;
  S.sex = o.sex || null; S.sel = (o.sel || []).filter((id) => DMAP[id]); S.dx = (o.dx || []).filter((k) => DXM[k]); S.prep = o.prep || {};
}
function setSex(v) { S.sex = v; document.querySelectorAll('#sexSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v)); }
const EX = { age: 68, ht: 170, wt: 92, scr: 1.9, k: 3.2, mg: 1.5, phos: 1.9, ca: 7.6, alb: 2.6, na: 131, glu: 246, hco3: 17, plt: 132, hr: 112, sbp: 88, map: 60 };
function example() {
  Object.entries(EX).forEach(([k, v]) => { $(k).value = v; });
  setSex('M'); $('rrt').value = 'none'; $('child').value = ''; $('cvc').checked = true; $('mv').checked = true;
  $('exPill').hidden = false; S.dx = []; S.sel = []; toggleDx('septic', true); renderPat();
}
function clearAll() {
  NUMF.forEach((k) => { $(k).value = ''; }); CHKF.forEach((k) => { $(k).checked = false; });
  setSex(null); $('rrt').value = 'none'; $('child').value = ''; S.sel = []; S.dx = []; renderDx(); S.target = {}; S.rate = {}; S.prot = {};
  $('exPill').hidden = true; renderPat(); renderList(); renderDetail();
}

/* ---------- init ---------- */
function init() {
  $('clsTabs').innerHTML = `<button data-v="all" aria-pressed="true">全部</button>` + CLS.map(([k, n]) => `<button data-v="${k}" aria-pressed="false">${n}</button>`).join('');
  $('clsTabs').querySelectorAll('button').forEach((b) => b.onclick = () => { S.cls = b.dataset.v; $('clsTabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderList(); });
  $('q').oninput = () => { S.q = $('q').value.trim(); renderList(); };
  document.querySelectorAll('#sexSeg button').forEach((b) => b.onclick = () => { setSex(b.dataset.v); renderPat(); renderDetail(); });
  [...NUMF, 'rrt', 'child'].forEach((k) => { $(k).oninput = () => { renderPat(); renderDetail(); }; });
  CHKF.forEach((k) => { $(k).onchange = () => { renderPat(); renderDetail(); }; });
  $('btnCopy').onclick = () => { const t = $('soap').value, ok = () => { $('copied').hidden = false; setTimeout(() => { $('copied').hidden = true; }, 1600); }; try { navigator.clipboard.writeText(t).then(ok, () => { $('soap').select(); ok(); }); } catch (e) { $('soap').select(); ok(); } };
  $('btnExample').onclick = example; $('btnClear').onclick = clearAll;
  $('btnNone').onclick = () => { S.sel = []; S.dx = []; renderDx(); renderList(); renderDetail(); save(); };
  load(); setSex(S.sex); renderDx(); renderPat(); renderList(); renderDetail();
}
init();
