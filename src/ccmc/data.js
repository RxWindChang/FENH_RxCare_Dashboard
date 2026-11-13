/* =====================================================================
   CCMC — Critical Care Medication Calculator｜藥物資料庫
   院內規格：亞東醫院總品項（批價代碼）；劑量體例：UpToDate (Lexicomp)
   utd:'2026-11-12' = 已於該日以 UpToDate 現行版逐段核對；utd:0 = 待核對
   ===================================================================== */
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const fx = (x, d = 1) => (x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: d }));
const rnd = (x, s) => Math.round(x / s) * s;
const has = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(v);
const B = (s) => `<b>${s}</b>`;

/* 劑量體重規則（肥胖＝BMI ≥30，依 UpToDate Dosing: Obesity）：TBW＝實際體重；ADJ＝肥胖用 AdjBW；IBWo＝肥胖用 IBW；B40＝BMI ≥40 用 AdjBW、30–39 用 TBW；IBW＝不論是否肥胖皆用 IBW（低於 IBW 用實際體重）；PHOS＝>130% IBW 且 BMI <40 用 IBW+0.25×超重 */
function dw(P, rule) {
  if (!P.wt) return { w: null, lab: '—' };
  if (rule === 'IBW') return P.ibw ? { w: Math.min(P.ibw, P.wt), lab: `${P.ibw < P.wt ? 'IBW' : 'TBW'} ${fx(Math.min(P.ibw, P.wt))} kg` } : { w: P.wt, lab: `TBW ${fx(P.wt)} kg（未算 IBW）` };
  if (rule === 'TBW' || !P.obese) return { w: P.wt, lab: `TBW ${fx(P.wt)} kg` };
  if (rule === 'ADJ') return { w: P.adj, lab: `AdjBW ${fx(P.adj)} kg（肥胖）` };
  if (rule === 'IBWo') return { w: Math.min(P.ibw, P.wt), lab: `IBW ${fx(Math.min(P.ibw, P.wt))} kg（肥胖）` };
  if (rule === 'B40') return P.bmi >= 40 ? { w: P.adj, lab: `AdjBW ${fx(P.adj)} kg（BMI ≥40）` } : { w: P.wt, lab: `TBW ${fx(P.wt)} kg（BMI 30–39）` };
  if (rule === 'PHOS') { if (P.wt > 1.3 * P.ibw && P.bmi < 40) { const w = P.ibw + 0.25 * (P.wt - P.ibw); return { w, lab: `IBW + 0.25×(TBW−IBW) = ${fx(w)} kg（肥胖）` }; } return { w: P.wt, lab: `TBW ${fx(P.wt)} kg` }; }
  return { w: P.wt, lab: `TBW ${fx(P.wt)} kg` };
}
const renal = (P) => P.rrt !== 'none' ? P.rrt : (P.crcl == null ? null : P.crcl);

/* 分類 */
const CLS = [
  ['vp', '升壓／強心'], ['bp', '降壓'], ['aa', '抗心律不整'], ['ac', '抗凝／抗血栓'],
  ['sed', '鎮靜／止痛'], ['nmb', '神經肌肉阻斷劑'], ['aed', '抗癲癇'], ['el', '電解質／胰島素'],
  ['rev', '反轉劑'], ['icp', '降腦壓'], ['hem', '止血／出血'], ['oth', '類固醇／PPI／利尿／其他'],
];

/* -------------------------------------------------------------------
   DRUGS
   route: ci 連續輸注｜int 間歇／單次｜sc 皮下
   line : C 須中央｜CP 中央為佳（周邊僅短期大靜脈）｜P 周邊可
   ves  : V vesicant｜I irritant
   ci   : { u 單位, w 體重規則, lo/hi 常用範圍, st 起始, steps[], mx 上限 }
   preps: [{ l 泡法, c 濃度（以劑量分子單位/mL）, cu 濃度單位, C 須中央 }]
------------------------------------------------------------------- */
const DRUGS = [
/* ============================ 升壓／強心 ============================ */
{ id: 'ne', g: 'Norepinephrine', b: 'Levophed', spec: '4 mg/4 mL/amp', code: 'INORE4', cls: 'vp', utd: '2026-11-12',
  route: 'ci', line: 'CP', ves: 'V', kw: 'levophed noradrenaline 升壓',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 0.025, hi: 1, st: 0.05, steps: [0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1] },
  preps: [{ l: '4 mg + D5W 至 250 mL', c: 16, cu: 'mcg/mL' }, { l: '8 mg + D5W 至 250 mL', c: 32, cu: 'mcg/mL' }, { l: '16 mg + D5W 至 250 mL', c: 64, cu: 'mcg/mL', C: 1 }],
  dose: (P) => {
    const { w } = dw(P, 'IBWo');
    return [
      ['休克（敗血性、分布性）', `起始 ${B('0.05–0.15 mcg/kg/min')}${w ? `（${fx(0.05 * w, 1)}–${fx(0.15 * w, 1)} mcg/min）` : ''}，依 MAP 與器官灌流滴定；常用 0.025–1 mcg/kg/min，頑固性休克少數可達 1–3 mcg/kg/min。非依體重：起始 5–15 mcg/min，常用 2–80 mcg/min。`],
      ['心因性休克', '起始 0.05 mcg/kg/min，依臨床終點滴定。'],
      ['合併用藥時機', 'NE 達 0.25–0.5 mcg/kg/min 仍不足：加 vasopressin 0.03 units/min；仍不足或心輸出低：加 epinephrine 或 dobutamine（SSC 2021）。'],
    ];
  },
  adj: (P) => {
    const a = [['i', '腎、肝功能不全：皆不需調整（少量原形經腎排除）。']];
    if (P.obese) a.push(['i', '肥胖（BMI ≥30）：若用 weight-based 劑量，以 IBW 計算起始劑量，再依血行動力滴定；院內若用非依體重（mcg/min）就維持該方式。治療期間不要更換體重基準。']);
    return a;
  },
  prep: 'D5W 為佳（葡萄糖減少氧化）；NS 亦可（仿單不建議，但已證實穩定性）。臨床濃度 4–64 mcg/mL。',
  admin: '輸注幫浦連續輸注。中央靜脈為佳；無中央導管時可經近端大靜脈（肘窩或以上）周邊短期使用（<72 h），須頻繁檢查注射部位。',
  ext: '外滲：立即停止輸注、保留導管回抽、局部注射 phentolamine 5–10 mg/10 mL NS（院內品項請確認）。',
  mon: ['血壓（建議動脈導管）、心跳、ECG', '器官灌流：乳酸、尿量、末梢循環', '注射部位（發白、外滲）'],
  notes: ['不可與鹼性溶液（NaHCO₃）同管路。'] },

{ id: 'epi', g: 'Epinephrine', b: 'Adrenalin／Bosmin', spec: '1 mg/mL/amp', code: 'IEPIN1', cls: 'vp', utd: '2026-11-12',
  route: 'ci', line: 'CP', ves: 'V', kw: 'adrenaline bosmin 腎上腺素 anaphylaxis',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 0.01, hi: 1, st: 0.05, steps: [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5] },
  preps: [{ l: '1 mg + D5W／NS 至 250 mL', c: 4, cu: 'mcg/mL' }, { l: '4 mg + D5W／NS 至 250 mL', c: 16, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'IBWo');
    return [
      ['休克（第二線／合併 NE）', `常用 ${B('0.01–0.5 mcg/kg/min')}${w ? `（約 ${fx(0.01 * w)}–${fx(0.5 * w)} mcg/min）` : ''}（非依體重 1–40 mcg/min）；部分休克適應症常用至 1、頑固性最高 2 mcg/kg/min。心因性休克不作首選。`],
      ['症狀性心搏過緩（pacing 前過渡）', '起始 0.03–0.1 mcg/kg/min，範圍 0.03–0.5（非依體重 2–40 mcg/min）。'],
      ['Anaphylaxis', `首選 ${B('IM 0.5 mg')}（1 mg/mL，大腿前外側；>50 kg），5–15 分鐘可重複。IM 數次無效之嚴重低血壓：連續輸注 0.1–0.2 mcg/kg/min 起始，每 2–3 分鐘調整 0.05 mcg/kg/min；常用 0.01–0.2 mcg/kg/min。`],
      ['心跳停止', '1 mg IV/IO 每 3–5 分鐘。'],
    ];
  },
  adj: (P) => [['i', '腎、肝功能不全：不需調整。'], ...(P.obese ? [['i', '肥胖（BMI ≥30）：若用 weight-based 劑量，以 IBW 計算起始劑量，再依血行動力滴定；院內若用非依體重（mcg/min）就維持該方式。治療期間不要更換體重基準。']] : [])],
  prep: 'D5W 或 NS；1 mg/250 mL（4 mcg/mL）、4 mg/250 mL（16 mcg/mL）；亦可 1 mg/1,000 mL（1 mcg/mL）。不可與鹼性溶液混合。',
  admin: '連續輸注須用輸注幫浦，中央靜脈為佳；周邊短期須選近端大靜脈並密切監測。',
  ext: '外滲處理同 norepinephrine（phentolamine）。',
  mon: ['連續 ECG、心跳、血壓（建議動脈導管）', '血糖、乳酸（β2 效應會使乳酸上升）', '注射部位'],
  notes: ['濃度標示已不使用 1:1,000／1:10,000；1 mg/mL＝1:1,000。'] },

{ id: 'avp', g: 'Vasopressin', b: 'Pitressin', spec: '20 IU/mL/amp', code: 'IVASO2', cls: 'vp', utd: '2026-11-12',
  route: 'ci', line: 'C', ves: 'V', kw: 'pitressin avp 血管加壓素',
  ci: { u: 'units/min', w: null, lo: 0.01, hi: 0.04, st: 0.03, steps: [0.01, 0.02, 0.03, 0.04] },
  preps: [{ l: '20 units（1 mL）+ D5W／NS 至 100 mL', c: 0.2, cu: 'units/mL' }, { l: '40 units（2 mL）+ D5W／NS 至 100 mL', c: 0.4, cu: 'units/mL' }],
  dose: () => [
    ['敗血性／血管擴張性休克（輔助）', `NE 需求升高（約 0.2–0.5 mcg/kg/min）時加入：${B('0.03 units/min 固定劑量，不滴定')}；常用 0.01–0.04 units/min。>0.04 units/min 僅作救援治療。`],
    ['停藥', '血壓穩定後多先調降 NE；停 vasopressin 宜逐步調降，避免低血壓反彈。'],
  ],
  adj: () => [['i', '腎功能不全、透析：不需調整。']],
  prep: '1 mL 與 10 mL 小瓶須稀釋：20 units/100 mL（0.2 units/mL）或 40 units/100 mL（0.4 units/mL）；限水病人可提高濃度。',
  admin: '建議經中央靜脈輸注（vesicant）。',
  ext: '外滲：停止輸注、勿沖管、回抽後移除，抬高肢體、乾熱敷。',
  mon: ['血壓、心跳', '血鈉、尿量與尿比重（低血鈉）', '指端／腸道缺血、注射部位'],
  notes: ['單位換算：0.03 units/min＝1.8 units/h。'] },

{ id: 'dopa', g: 'Dopamine', b: 'Easydopa premix／Dopamine HCl 安瓿', spec: '400 mg/D5W 250 mL/bag；200 mg/5 mL/amp', code: 'BDOPA1／IDOPA2', cls: 'vp', utd: '2026-11-12',
  route: 'ci', line: 'CP', ves: 'V', kw: 'easydopa 多巴胺',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 2, hi: 20, st: 5, steps: [2, 5, 7.5, 10, 15, 20] },
  prods: [{ l: 'Easydopa premix', s: '400 mg/D5W 250 mL/bag', code: 'BDOPA1' }, { l: 'Dopamine HCl 安瓿', s: '200 mg/5 mL/amp', code: 'IDOPA2' }],
  preps: [{ p: 0, l: 'Easydopa 400 mg/250 mL（原袋）', c: 1600, cu: 'mcg/mL' }, { p: 1, l: '400 mg（2 amp）+ D5W 至 250 mL', c: 1600, cu: 'mcg/mL' }, { p: 1, l: '800 mg（4 amp）+ D5W 至 250 mL', c: 3200, cu: 'mcg/mL', C: 1 }],
  dose: (P) => {
    const { w } = dw(P, 'IBWo');
    return [
      ['症狀性心搏過緩／房室傳導阻滯（atropine 無效）', `起始 ${B('5 mcg/kg/min')}，每 2 分鐘調升至效果；上限 20 mcg/kg/min。僅作 pacing 前之過渡。`],
      ['休克（替代藥物）', `敗血性休克不建議；僅心搏過緩且心搏過速風險低者可替代 NE：起始 2–5，上限 20 mcg/kg/min。心因性休克常用 2–20 mcg/kg/min${w ? `（${fx(2 * w * 60 / 1000, 2)}–${fx(20 * w * 60 / 1000, 1)} mg/h）` : ''}。心律不整風險較 NE 高，心因性休克不建議為首選；低劑量 dopamine 不用於腎臟保護。`],
      ['劑量效應（有重疊）', '<5：dopaminergic；5–10：β1 為主；>10：α 血管收縮為主。'],
    ];
  },
  adj: (P) => [['i', '腎功能不全：不需調整（非腎排除、依效果滴定）。'], ...(P.obese ? [['i', '肥胖（BMI ≥30）：以 IBW 計算起始劑量，再依血行動力滴定。']] : [])],
  prep: '院內 premix 400 mg/250 mL（1,600 mcg/mL）不需再稀釋，勿加入其他藥品。安瓿稀釋於 250–500 mL D5W／NS。溶液變色勿用。',
  admin: '中央靜脈為佳；周邊短期須近端大靜脈並頻繁觀察。',
  ext: '外滲處理同 norepinephrine（phentolamine）。',
  mon: ['ECG（心律不整）、血壓、心跳', 'CVP、CI、ScvO₂ 等血行動力學', '末梢灌流、注射部位'],
  notes: ['不可與 NaHCO₃ 同管路。'] },

{ id: 'dobu', g: 'Dobutamine', b: 'Gendobu', spec: '250 mg/20 mL/vial（12.5 mg/mL）', code: 'IDOBU0', cls: 'vp', utd: '2026-11-12',
  route: 'ci', line: 'P', ves: 'V', kw: 'gendobu 強心',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 2, hi: 20, st: 2.5, steps: [2, 2.5, 5, 7.5, 10, 15, 20] },
  preps: [{ l: '250 mg（1 vial）+ D5W／NS 至 250 mL', c: 1000, cu: 'mcg/mL' }, { l: '500 mg（2 vial）+ D5W／NS 至 250 mL', c: 2000, cu: 'mcg/mL' }, { l: '250 mg + 至 500 mL', c: 500, cu: 'mcg/mL' }],
  dose: () => [
    ['急性失代償心衰竭（低心輸出合併低血壓／灌流不足）', `起始 ${B('2–5 mcg/kg/min')}，依灌流滴定；常用 2–10，上限 20 mcg/kg/min。`],
    ['休克合併心功能不良（加於升壓劑）', '起始 2–5 mcg/kg/min；輕度可低至 0.5 mcg/kg/min；上限 20 mcg/kg/min。'],
  ],
  adj: (P) => {
    const a = [];
    const c = renal(P);
    if ((typeof c === 'number' && c < 20) || P.rrt !== 'none') a.push(['w', 'CrCl <20 mL/min 連續輸注曾報告 dobutamine 相關 myoclonus（罕見）；出現不自主抽動時考慮減量或停藥。']);
    if (P.hr && P.hr > 120) a.push(['w', `心跳 ${P.hr} bpm：dobutamine 會加重心搏過速與心律不整，評估劑量必要性。`]);
    a.push(['i', '肝功能不全：仿單無調整建議。']);
    if (P.obese) a.push(['i', '肥胖（BMI ≥30）：以 IBW 計算起始劑量，再依血行動力滴定。']);
    return a;
  },
  prep: '20 mL 小瓶稀釋於 ≥50 mL（40 mL 於 ≥100 mL）D5W 或 NS；最高濃度 5 mg/mL。溶液可能呈淡粉紅（氧化），效價不受影響。',
  admin: '一律以輸注幫浦；注入大靜脈。可能為 vesicant，須避免外滲（phentolamine 處理）。',
  ext: '',
  mon: ['血壓、心跳、ECG', 'CI、pulmonary capillary wedge pressure、systemic vascular resistance、ScvO₂（若有）', '容積狀態、腎功能、尿量', '血鉀（β2 效應降血鉀）'],
  notes: ['與 NaHCO₃、heparin、phosphate、alteplase 不相容。'] },

{ id: 'mil', g: 'Milrinone', b: 'Primacor', spec: '10 mg/10 mL/amp', code: 'IMILR1', cls: 'vp', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'primacor pde3 強心',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 0.125, hi: 0.75, st: 0.125, steps: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75] },
  preps: [{ l: '20 mg（2 amp）+ D5W／NS 至 100 mL', c: 200, cu: 'mcg/mL' }, { l: '40 mg（4 amp）+ 至 200 mL', c: 200, cu: 'mcg/mL' }],
  dose: () => [
    ['急性失代償心衰竭／低心輸出', `起始 ${B('0.125–0.25 mcg/kg/min')}，常用 0.125–0.75；不建議 IV bolus loading（低血壓）。`],
    ['休克合併低心輸出（加於升壓劑）', '常用 0.125–0.5 mcg/kg/min。'],
    ['SAH 血管痙攣（off-label）', '50–200 mcg/kg 一次，0.5–0.75 mcg/kg/min，可滴定至 1.25；無復發 72 h 後每 24–48 h 減 0.25。'],
  ],
  adj: (P) => {
    const c = renal(P), a = [];
    if (typeof c === 'number' && c < 10) a.push(['d', `CrCl ${r0(c)}（<10）：劑量未建立，考慮其他藥物（如 dobutamine）。`]);
    else if (typeof c === 'number' && c <= 50) a.push(['w', `CrCl ${r0(c)}（10–50）：起始 ${B('0.0625–0.125 mcg/kg/min')}，謹慎滴定；明顯腎功能不全不建議 >0.375 mcg/kg/min（累積）。`]);
    else if (P.rrt !== 'none') a.push(['d', `${P.rrt}：清除高度依賴腎功能，劑量未建立；考慮其他藥物，若使用以最低劑量起始並密切監測。`]);
    if (P.obese) a.push(['i', '肥胖（BMI ≥30）：以 IBW 計算起始劑量，治療期間不更換體重基準。']);
    if (P.sbp && P.sbp < 90) a.push(['d', `收縮壓 ${P.sbp} mmHg：milrinone 擴張血管，低血壓時避免或合併升壓劑。`]);
    return a;
  },
  prep: '20 mg（20 mL）+ 80 mL D5W、NS 或 0.45% NaCl＝100 mL（200 mcg/mL）。',
  admin: '輸注幫浦連續輸注；周邊可。',
  ext: '',
  mon: ['血壓（低血壓）、心律（心室性心律不整）', '腎功能、尿量', '電解質（特別是鉀、鎂）、血小板'],
  notes: ['與 furosemide、bumetanide 不相容（同管路沉澱）。'] },

{ id: 'levo', ecmo: ['w', 'ECMO：資料有限，依血行動力滴定。'], g: 'Levosimendan', b: 'Simdax', spec: '12.5 mg/5 mL/vial', code: 'ILEVO1', cls: 'vp', utd: '2026-11-13', src: 'UpToDate International（concise）＋仿單',
  route: 'ci', line: 'P', ves: '', kw: 'simdax calcium sensitizer 強心',
  ci: { u: 'mcg/kg/min', w: 'TBW', lo: 0.05, hi: 0.2, st: 0.1, steps: [0.05, 0.1, 0.15, 0.2] },
  preps: [{ l: '12.5 mg（5 mL）+ D5W 至 500 mL', c: 25, cu: 'mcg/mL' }, { l: '12.5 mg + D5W 至 250 mL', c: 50, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'TBW');
    return [
      ['急性失代償心衰竭', `Loading（選擇性）6–12 mcg/kg 10 分鐘${w ? `（${fx(6 * w, 0)}–${fx(12 * w, 0)} mcg）` : ''}，收縮壓偏低或併用血管擴張劑者常省略；維持 ${B('0.1 mcg/kg/min')}，依耐受調整 0.05–0.2，一般輸注 24 h。`],
    ];
  },
  adj: (P) => {
    const c = renal(P), a = [];
    if ((typeof c === 'number' && c < 30) || P.rrt !== 'none') a.push(['d', '嚴重腎功能不全（CrCl <30）或透析：仿單不建議使用（活性代謝物 OR-1896 累積）。']);
    if (P.child === 'C') a.push(['d', '嚴重肝功能不全：仿單不建議使用。']);
    if (P.k != null && P.k < 4) a.push(['w', `血鉀 ${P.k}：開始前先將血鉀矯正（低血鉀增加心律不整風險）。`]);
    if (P.sbp && P.sbp < 90) a.push(['d', `收縮壓 ${P.sbp} mmHg：低血壓時不建議（省略 loading）。`]);
    return a;
  },
  prep: '僅以 D5W 稀釋（25 或 50 mcg/mL）；稀釋後 24 h 內使用。',
  admin: '周邊或中央靜脈皆可；與 furosemide、digoxin、nitroglycerin 可經不同管線並行輸注（仿單）。',
  ext: '',
  mon: ['血壓、心跳、ECG（輸注後 3 天以上；活性代謝物作用持續 7–9 天）', '血鉀', '尿量'],
  notes: ['藥效於停藥後仍持續數天，避免短期內重複。'] },

{ id: 'iso', g: 'Isoproterenol', b: 'Isoproternol', spec: '0.2 mg/mL/amp', code: 'IISOP2', cls: 'vp', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'isoprenaline proterenol 心搏過緩 torsades',
  ci: { u: 'mcg/min', w: null, lo: 1, hi: 20, st: 1, steps: [1, 2, 4, 6, 10, 15, 20] },
  preps: [{ l: '1 mg（5 amp）+ D5W／NS 至 250 mL', c: 4, cu: 'mcg/mL' }],
  dose: () => [
    ['症狀性心搏過緩／房室傳導阻滯（pacing 前過渡）', `常用 ${B('1–20 mcg/min')}，自低劑量開始依心跳滴定；心搏過緩所致心因性休克 2–20 mcg/min。`],
    ['Torsades de pointes（pause-dependent）', '2–10 mcg/min 提高心跳以縮短 QT（先給 magnesium）。'],
  ],
  adj: () => [['i', '腎、肝功能不全：無特別調整。']],
  prep: 'D5W 或 NS：1 mg/250 mL（4 mcg/mL）；亦可 1 mg/500 mL（2）、1 mg/100 mL（10）、4 mg/250 mL（16 mcg/mL）。',
  admin: '輸注幫浦；周邊可。',
  ext: '',
  mon: ['連續 ECG、心跳、血壓', '胸痛（心肌耗氧上升）'],
  notes: ['缺血性心臟病慎用；β2 效應可致劑量相關低血壓。'] },

/* ============================ 降壓 ============================ */
{ id: 'nicar', ecmo: ['w', 'ECMO：高脂溶性、高蛋白結合，可能被迴路吸附，需求增加。'], g: 'Nicardipine', b: 'Holdipine／Perdipine', spec: '10 mg/10 mL/amp', code: 'INICA1', cls: 'bp', utd: '2026-11-13',
  route: 'ci', line: 'CP', ves: 'I', kw: 'perdipine holdipine ccb 降壓 sah ich',
  ci: { u: 'mg/h', w: null, lo: 2.5, hi: 15, st: 5, steps: [2.5, 5, 7.5, 10, 12.5, 15] },
  preps: [{ l: '20 mg（2 amp）+ NS／D5W 至 200 mL', c: 0.1, cu: 'mg/mL' }, { l: '40 mg（4 amp）+ 至 200 mL（限水，院內講義）', c: 0.2, cu: 'mg/mL', C: 1 }],
  dose: () => [
    ['高血壓急症、主動脈剝離（β-blocker 控制心跳後）、腦中風血壓控制', `起始 ${B('5 mg/h')}，每 5–15 分鐘調升 2.5 mg/h，上限 ${B('15 mg/h')}；建議動脈導管監測血壓。`],
    ['急性缺血性中風再灌流', '再灌流前 ≤185/110；溶栓期間與之後 24 h ≤180/105 mmHg。'],
    ['轉口服', '停 IV 前約 1 h 給第一劑口服降壓藥。'],
  ],
  adj: (P) => {
    const a = [];
    a.push(['i', '腎、肝功能不全（IV）：仿單無特定調整，緩慢滴定並密切監測。']);
    if (P.hf) a.push(['w', 'HFrEF：負性肌力作用輕微，但仍需注意心衰竭惡化。']);
    return a;
  },
  prep: 'UpToDate 標準濃度 0.1 mg/mL（25 mg/250 mL；院內 10 mg/amp → 20 mg/200 mL），以 NS 或 D5W 稀釋；不可用 LR 或含 bicarbonate 溶液。',
  admin: '經中央靜脈或周邊大靜脈緩慢連續輸注；周邊每 12 h 更換注射部位以減少靜脈炎。限水高濃度（>0.1 mg/mL）建議中央。',
  ext: '',
  mon: ['血壓（每 5–15 分鐘至穩定）、心跳（反射性心搏過速）', '注射部位靜脈炎'],
  notes: ['與 heparin、NaHCO₃、LR、pantoprazole 不相容。'] },

{ id: 'labe', g: 'Labetalol', b: 'Trandate', spec: '25 mg/5 mL/amp', code: 'ILABE2', cls: 'bp', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'trandate α β blocker 降壓 preeclampsia',
  ci: { u: 'mg/min', w: null, lo: 0.5, hi: 2, st: 0.5, steps: [0.5, 1, 1.5, 2, 4, 6, 8, 10] },
  preps: [{ l: '100 mg（4 amp, 20 mL）+ D5W／NS 80 mL＝100 mL', c: 1, cu: 'mg/mL' }, { l: '原液 5 mg/mL（限水，syringe pump）', c: 5, cu: 'mg/mL' }],
  dose: () => [
    ['高血壓急症（間歇）', `${B('10–20 mg IV')} 1–2 分鐘，之後每 10 分鐘 20–80 mg；第一小時 MAP 下降約 10–20%。`],
    ['連續輸注', `可先 20 mg loading，之後 ${B('0.5–2 mg/min')}，少數需滴定至 10 mg/min。`],
    ['急性缺血性中風再灌流', '再灌流前 10–20 mg 1–2 分鐘，可重複一次；再灌流中與後 10 mg 後 2–8 mg/min。'],
    ['累積劑量', '仿單建議累積 IV ≤300 mg，UpToDate 指出部分病人可超過，但須監測累積（高劑量連續輸注可致嚴重低血壓、心搏過緩）。'],
  ],
  adj: (P) => {
    const a = [];
    a.push(['i', '腎功能不全、HD：不需調整（不易透析）。']);
    if (P.child) a.push(['w', '肝功能不全：仿單無調整，但代謝下降，可能需減量並謹慎使用。']);
    if (P.hr && P.hr < 60) a.push(['d', `心跳 ${P.hr} bpm：心搏過緩時避免使用。`]);
    if (P.hf) a.push(['w', 'HFrEF 急性失代償：β 阻斷可能惡化心衰竭，避免或慎用。']);
    return a;
  },
  prep: '輸注稀釋於 D5W、NS 或 LR 至 1 mg/mL（最高 3.75 mg/mL 穩定）；限水可用原液 5 mg/mL。10 mg 可 10 mg/min 推注，≥20 mg 推 2 分鐘。',
  admin: '病人宜平躺（姿勢性低血壓）；周邊可。',
  ext: '',
  mon: ['血壓、心跳', '支氣管痙攣（氣喘、COPD 慎用）', '血糖（遮蔽低血糖症狀）'],
  notes: ['禁忌：氣喘、二度以上房室傳導阻滯、心因性休克、嚴重心搏過緩。'] },

{ id: 'ntg', g: 'Nitroglycerin', b: 'Millisrol／N.T.G. premix', spec: '5 mg/10 mL/amp；50 mg/250 mL/bot', code: 'INITR0／BNITR2', cls: 'bp', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'millisrol ntg nitrate 硝化甘油 acs 肺水腫',
  ci: { u: 'mcg/min', w: null, lo: 5, hi: 200, st: 5, steps: [5, 10, 20, 40, 60, 100, 150, 200] },
  prods: [{ l: 'N.T.G. premix', s: '50 mg/250 mL/bot', code: 'BNITR2' }, { l: 'Millisrol 安瓿', s: '5 mg/10 mL/amp', code: 'INITR0' }],
  preps: [{ p: 0, l: 'N.T.G. premix 50 mg/250 mL（原瓶）', c: 200, cu: 'mcg/mL' }, { p: 1, l: 'Millisrol 10 mg（2 amp, 20 mL）+ D5W 30 mL＝50 mL', c: 200, cu: 'mcg/mL' }, { p: 1, l: 'Millisrol 20 mg（4 amp）+ D5W 10 mL＝50 mL（上限濃度）', c: 400, cu: 'mcg/mL' }],
  dose: () => [
    ['急性失代償心衰竭', `起始 ${B('5–10 mcg/min')}，每 3–5 分鐘增加 5–10 mcg/min，上限 200 mcg/min；24–48 h 產生耐受，儘早轉口服心衰竭治療。`],
    ['ACS 持續胸痛', '起始 5–10 mcg/min（連續 ECG），每 5–10 分鐘增加 5 mcg/min 至 20，之後每 3–5 分鐘增加 10–20，上限 400 mcg/min。'],
    ['高血壓急症', `起始 ${B('5 mcg/min')}，每 3–5 分鐘增加 5 至 20 mcg/min，之後每 3–5 分鐘增加 10–20，上限 200 mcg/min；需求超過 24–48 h 改用其他藥。`],
  ],
  adj: (P) => {
    const a = [['i', '肝、腎功能不全：無需調整。']];
    if (P.sbp && P.sbp < 90) a.push(['d', `收縮壓 ${P.sbp} mmHg：低血壓時禁用。`]);
    a.push(['w', '禁用：48 h 內使用 PDE5 抑制劑（sildenafil 24 h、tadalafil 48 h）、右心室梗塞、嚴重主動脈瓣狹窄。']);
    return a;
  },
  prep: 'Premix 直接使用；安瓿須以 D5W 或 NS 稀釋，最高濃度 400 mcg/mL（Millisrol 原液 500 mcg/mL 不可直接輸注）。以玻璃或非 PVC 容器配製，倒置數次混勻。',
  admin: '使用 NTG 專用 non-PVC 輸注套（PVC 吸附 40–80%）；避免會吸附 NTG 的線上過濾器。輸注幫浦給藥。',
  ext: '',
  mon: ['血壓、心跳', '頭痛', '連續輸注 24–48 h 產生耐受性；長時間大劑量注意 methemoglobinemia'],
  notes: ['院內有 non-PVC NTG pump set。'] },

{ id: 'nimo', g: 'Nimodipine', b: 'Nimotop', spec: '10 mg/50 mL/vial（0.2 mg/mL）', code: 'INIMO1', cls: 'bp', utd: '2026-11-13', src: 'UpToDate（僅口服）＋仿單 IV',
  route: 'ci', line: 'C', ves: '', kw: 'nimotop sah vasospasm 血管痙攣',
  ci: { u: 'mg/h', w: null, lo: 0.5, hi: 2, st: 1, steps: [0.5, 1, 1.5, 2] },
  preps: [{ l: '原液 10 mg/50 mL（0.2 mg/mL）', c: 0.2, cu: 'mg/mL', C: 1 }],
  dose: (P) => [
    ['動脈瘤性 SAH 預防血管痙攣', `${B('1 mg/h')}（約 15 mcg/kg/h）2 h，耐受後增至 ${B('2 mg/h')}（約 30 mcg/kg/h）。${P.wt && P.wt < 70 ? `體重 ${P.wt} kg（<70 kg）或血壓不穩：以 ${B('0.5 mg/h')} 起始。` : '體重 <70 kg 或血壓不穩：0.5 mg/h 起始。'}`],
    ['療程與轉口服', `出血後 96 h 內開始，總療程 21 天；口服（UpToDate）${B(P.child ? '30 mg（1#）Q4H（肝硬化）' : '60 mg（2#）Q4H')}。血壓波動大可改 30 mg（1#）Q2H。IV 劑量依仿單（UpToDate 未收載 IV）。`],
  ],
  adj: (P) => {
    const a = [];
    if (P.child) a.push(['w', '肝功能不全：清除下降，以 0.5 mg/h 起始並密切監測血壓。']);
    if (P.sbp && P.sbp < 100) a.push(['d', `收縮壓 ${P.sbp} mmHg：低血壓會影響腦灌流，先減量或暫停。`]);
    return a;
  },
  prep: '原液使用，不另稀釋。',
  admin: '仿單：經中央靜脈，以三通與 NS、D5W 或 LR 並行輸注（藥液：並行液約 1:4）；使用 polyethylene 管路（PVC 會吸附）；避光（含輸注管）。',
  ext: '',
  mon: ['血壓（MAP 下降影響腦灌流）、心跳', '神經學檢查', '肝功能'],
  notes: ['含酒精（約 20%），注意酒精相關交互作用。', 'CYP3A4 強抑制劑／誘導劑交互作用。'] },

/* ============================ 抗心律不整 ============================ */
{ id: 'amio', ecmo: ['w', 'ECMO：高脂溶性、高蛋白結合，可能被迴路吸附，Vd 增加。'], g: 'Amiodarone', b: 'Cordarone', spec: '150 mg/3 mL/amp', code: 'IAMIO1', cls: 'aa', utd: '2026-11-13',
  route: 'ci', line: 'CP', ves: 'I', kw: 'cordarone af vt vf 心律不整',
  ci: { u: 'mg/min', w: null, lo: 0.5, hi: 1, st: 1, steps: [0.5, 1] },
  preps: [{ l: '450 mg（3 amp）+ D5W 至 250 mL', c: 1.8, cu: 'mg/mL' }, { l: '900 mg（6 amp）+ D5W 至 500 mL', c: 1.8, cu: 'mg/mL' }, { l: '900 mg + D5W 至 250 mL（>2 mg/mL）', c: 3.6, cu: 'mg/mL', C: 1 }],
  dose: () => [
    ['Afib 轉律／穩定型 VT', `${B('150 mg')} 10–30 分鐘（或 300 mg 60 分鐘）→ ${B('1 mg/min × 6 h')} → ${B('0.5 mg/min × 18 h')}；IV＋口服總 loading 約 6–10 g。`],
    ['Afib 急性心跳控制（重症／失代償心衰竭，β-blocker、CCB 無效或禁忌）', '150–300 mg 1 h，之後 10–50 mg/h × 24 h；或同上 150 mg → 1 → 0.5 mg/min。'],
    ['無脈搏 VT／VF', '300 mg IV/IO push，必要時再 150 mg。'],
    ['轉口服', '依累積 loading 量決定口服 loading 期長短（總量約 6–10 g）。'],
  ],
  adj: (P) => {
    const a = [['i', '腎功能不全、透析：不需調整（不被透析移除）。']];
    if (P.child) a.push(['w', '肝硬化：無特定劑量建議；藥物蓄積於肝臟，IV 劑型可致急性肝毒性，監測肝功能。']);
    if (P.hr && P.hr < 60) a.push(['d', `心跳 ${P.hr} bpm：心搏過緩、房室傳導阻滯風險。`]);
    if (P.sbp && P.sbp < 90) a.push(['w', `收縮壓 ${P.sbp}：IV 劑型（polysorbate 80）可致低血壓，減慢輸注速率。`]);
    return a;
  },
  prep: '連續輸注必須以 D5W 稀釋至 1–6 mg/mL（常用 1.5 或 1.8 mg/mL）。輸注 >2 h 須用非 PVC 容器（玻璃或 polyolefin）。',
  admin: '輸注 >1 h 且無中央導管時濃度須 ≤2 mg/mL；儘量選靠近中央的靜脈。周邊輸注建議加線上過濾器以減少靜脈炎。管路則不論時間長短建議用 PVC 管（UpToDate）。只用容積式輸注幫浦。無脈搏 VT/VF 可原液推注。',
  ext: '',
  mon: ['連續 ECG、心跳、QTc、血壓', '肝功能、甲狀腺功能（長期）', '注射部位'],
  notes: ['交互作用：warfarin（INR↑，減量 30–50%）、digoxin（↑，減半）、statins、DOAC。', '與 heparin、NaHCO₃ 不相容。'] },

{ id: 'dilt', g: 'Diltiazem', b: 'Herbesser', spec: '50 mg/vial（凍晶）', code: 'IDILT5', cls: 'aa', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'herbesser ccb af rvr 心跳控制',
  ci: { u: 'mg/h', w: null, lo: 5, hi: 15, st: 5, steps: [2.5, 5, 7.5, 10, 12.5, 15] },
  preps: [{ l: '100 mg（2 vial）+ NS／D5W 至 100 mL', c: 1, cu: 'mg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'TBW');
    const b1 = w ? r0(0.25 * w) : null, b2 = w ? r0(0.35 * w) : null;
    return [
      ['Afib／atrial flutter 急性心跳控制', `Bolus ${B('0.25 mg/kg（實際體重）')}${b1 ? `（≈ ${b1} mg）` : ''} 2 分鐘（平均 20 mg；擔心低血壓可 5–15 mg）；15 分鐘後不足可再 0.35 mg/kg${b2 ? `（≈ ${b2} mg）` : ''}（平均 25 mg）。`],
      ['連續輸注', `起始 ${B('5–10 mg/h')}，每次增加 5 mg/h，上限 15 mg/h；>24 h 或 >15 mg/h 有累積風險，不建議。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.hf) a.push(['d', 'HFrEF（EF <40%）或失代償心衰竭：避免使用（負性肌力），改用 amiodarone 或 digoxin。']);
    if (P.sbp && P.sbp < 90) a.push(['d', `收縮壓 ${P.sbp} mmHg：低血壓時避免。`]);
    a.push(['i', '腎功能不全、HD：不需調整。']);
    if (P.child) a.push(['w', '肝功能不全：仿單無調整；肝代謝為主、肝硬化半衰期延長，謹慎使用。']);
    a.push(['w', '禁忌：WPW 合併 Afib、病竇症候群／二至三度阻滯（無節律器）。CYP3A4 抑制劑：注意 tacrolimus、statin 等交互作用。']);
    return a;
  },
  prep: 'Bolus：凍晶以 5 mL 稀釋液溶解。輸注：NS 或 D5W 稀釋，最高 1 mg/mL（100 mg/100 mL）。',
  admin: '周邊可；輸注幫浦。',
  ext: '',
  mon: ['心跳、血壓、ECG（PR、房室阻滯）', '心衰竭症狀'],
  notes: [] },

{ id: 'vera', g: 'Verapamil', b: 'U-sodin', spec: '5 mg/2 mL/amp', code: 'IVERA5', cls: 'aa', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'u-sodin isoptin ccb psvt',
  dose: () => [
    ['Afib 急性心跳控制', `${B('5–10 mg IV')} ≥2 分鐘；15–30 分鐘後可重複；1–2 劑有效者可接連續輸注 ${B('5 mg/h')} 起始，上限 20 mg/h。低血壓較 diltiazem 多。`],
    ['PSVT（adenosine 無效）', '5–10 mg ≥2 分鐘；15–30 分鐘後不足再 10 mg；或 5 mg 每 2–3 分鐘，最多 3 劑（累計 15 mg）。'],
  ],
  adj: (P) => {
    const a = [];
    if (P.hf) a.push(['d', 'HFrEF 或失代償心衰竭：避免使用。']);
    if (P.sbp && P.sbp < 90) a.push(['d', `收縮壓 ${P.sbp} mmHg：避免使用；低血壓可預先給 calcium gluconate 1 g。`]);
    if (P.child) a.push(['w', '肝硬化：注射劑仿單無調整（口服減至 20%）；清除下降，謹慎並監測 ECG。']);
    a.push(['w', '禁忌：WPW 合併 Afib、寬 QRS 心搏過速（未確定為 SVT）、二至三度阻滯。']);
    return a;
  },
  prep: '可原液緩慢推注。',
  admin: '緩慢 IV push，連續 ECG 監測下給藥。',
  ext: '',
  mon: ['心跳、血壓、ECG'],
  notes: ['與 propofol、NaHCO₃ 不相容。', '併用 β-blocker IV 易致嚴重心搏過緩。'] },

{ id: 'lido', g: 'Lidocaine', b: 'Xylocaine', spec: '2% 5 mL/amp（100 mg）；2% 20 mL/vial（400 mg）', code: 'IXYL25／IXYL22', cls: 'aa', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'xylocaine vt 心室心律不整',
  ci: { u: 'mg/min', w: null, lo: 1, hi: 4, st: 1, steps: [1, 2, 3, 4] },
  preps: [{ l: '800 mg（2% 20 mL × 2）+ D5W 至 200 mL', c: 4, cu: 'mg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'ADJ');
    return [
      ['VF／無脈 VT、穩定單型 VT', `${B('1–1.5 mg/kg IV')}${w ? `（${r0(w)}–${r0(1.5 * w)} mg）` : ''}，每 5–10 分鐘可再 0.5–0.75 mg/kg（常用 50–100 mg）；累積上限 3 mg/kg${w ? `（${r0(3 * w)} mg）` : ''} 或 1 h 內 300 mg。`],
      ['維持輸注', `${B('1–4 mg/min')}；>24 h 清除變慢，可能需減量並監測濃度。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.child) a.push(['w', `肝功能不全（Child-Pugh ${P.child}）：維持輸注用較低速率，密切監測毒性。`]);
    if (P.obese) a.push(['i', '肥胖：以 lean body weight 或 AdjBW 計算（此處用 AdjBW）。']);
    if (P.hf) a.push(['w', '心衰竭：肝血流下降，維持劑量減量。']);
    if (P.age >= 70) a.push(['w', '高齡：中樞毒性風險較高，減量。']);
    a.push(['i', '腎功能不全：原形不需調整，但活性代謝物（MEGX、GX）可能累積。']);
    return a;
  },
  prep: '輸注稀釋於 D5W 至 4 mg/mL。勿使用含 epinephrine 之局部麻醉劑型。',
  admin: '周邊可；輸注幫浦。',
  ext: '',
  mon: ['ECG、血壓', '中樞毒性：口周麻木、耳鳴、意識改變、抽搐', '血中濃度 1.5–5 mcg/mL（如可測）'],
  notes: [] },

/* ============================ 抗凝／抗血栓 ============================ */
{ id: 'hep', ecmo: ['d', 'ECMO：迴路消耗 antithrombin 與 heparin；依 anti-Xa（0.3–0.7）或 aPTT 調整，監測 antithrombin III、溶血與出血。'], g: 'Heparin', b: 'Heparin Sodium', spec: '25,000 IU/5 mL/vial', code: 'IHEPA2', cls: 'ac', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'ufh 肝素 抗凝 ecmo',
  ci: { u: 'units/kg/h', w: 'B40', lo: 10, hi: 25, st: 18, steps: [8, 10, 12, 15, 18, 20, 25] },
  preps: [{ l: '25,000 IU（5 mL）+ NS 至 250 mL', c: 100, cu: 'units/mL' }, { l: '25,000 IU + NS 至 500 mL', c: 50, cu: 'units/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'B40');
    const o = [];
    o.push(['VTE 治療', `Bolus ${B('80 units/kg')}${w ? `（${fx(rnd(80 * w, 100), 0)} units）` : ''} → ${B('18 units/kg/h')}${w ? `（${fx(rnd(18 * w, 10), 0)} units/h）` : ''}；或固定 5,000 units → 1,333 units/h；依院內 aPTT／anti-Xa nomogram 調整。`]);
    o.push(['STEMI 合併溶栓', `Bolus ${B('60 units/kg')}（上限 4,000 units）${w ? `→ ${fx(Math.min(rnd(60 * w, 100), 4000), 0)} units` : ''}；維持 ${B('12 units/kg/h')}（上限 1,000 units/h）${w ? `→ ${fx(Math.min(rnd(12 * w, 10), 1000), 0)} units/h` : ''}。未再灌流：50–70 units/kg（上限 5,000）→ 12 units/kg/h。`]);
    o.push(['NSTE-ACS（非侵入性、缺血導向策略）', `Bolus ${B('60 units/kg')}（上限 5,000 units）${w ? `→ ${fx(Math.min(rnd(60 * w, 100), 5000), 0)} units` : ''}；維持 ${B('12 units/kg/h')}（上限 1,000 units/h）${w ? `→ ${fx(Math.min(rnd(12 * w, 10), 1000), 0)} units/h` : ''}；持續 ≥48 h、至出院或改侵入性策略。`]);
    o.push(['PCI 術中（未曾抗凝）', `未計畫用 GP IIb/IIIa：${B('70–100 units/kg')}（上限 10,000）${w ? `→ ${fx(Math.min(rnd(70 * w, 100), 10000), 0)}–${fx(Math.min(rnd(100 * w, 100), 10000), 0)} units` : ''}，目標 ACT 250–300 秒；計畫用 GP IIb/IIIa：50–70 units/kg（上限 7,000）。依 ACT 追加。`]);
    if (P.ecmo) o.push(['ECMO', '依 ELSO 與院內 protocol：通常不給 bolus，7.5–20 units/kg/h 起始，目標 anti-Xa 0.3–0.7 IU/mL（或 aPTT 1.5–2 倍）；出血風險高時可降低目標或暫停。']);
    if (P.mcs) o.push(['IABP／Impella', '依裝置與院內 protocol；Impella purge 液含 heparin 者計入總量。']);
    o.push(['神經重症（低強度）', '腦出血、SAH 術後等出血風險高者：不給 bolus，低強度目標，與神經外科討論。']);
    return o;
  },
  adj: (P) => {
    const a = [['i', '腎、肝功能不全：不需調整，依 aPTT／anti-Xa 滴定（腎衰竭時 heparin 為 LMWH 之替代首選）。']];
    if (P.obese) a.push(['i', `肥胖（BMI ${fx(P.bmi)}）：BMI 30–39 以實際體重、BMI ≥40 以 AdjBW 計算治療劑量（UpToDate），之後依 aPTT／anti-Xa 調整。`]);
    if (P.plt != null && P.plt < 100) a.push(['w', `血小板 ${P.plt}×10³/µL：評估出血風險；若較基礎值下降 >50% 且在 5–10 天，考慮 HIT（4Ts）。`]);
    return a;
  },
  prep: '25,000 units/250 mL（100 units/mL），可用 NS、0.45% NaCl 或 D5W；須充分混勻（倒置數次）。',
  admin: '輸注幫浦；周邊可。High-alert：雙人核對 bolus 與速率。',
  ext: '',
  mon: ['aPTT 或 anti-Xa：開始或調整後 6 h', 'CBC（Hb、血小板；HIT）', '出血徵象'],
  notes: ['反轉：protamine。'] },

{ id: 'enox', g: 'Enoxaparin', b: 'Clexane', spec: '6,000 anti-Xa IU（60 mg）/0.6 mL/syringe', code: 'IENOX6', cls: 'ac', utd: '2026-11-13',
  route: 'sc', line: '', ves: '', kw: 'clexane lmwh 低分子量肝素',
  dose: (P) => {
    const { w } = dw(P, 'TBW'); const c = renal(P);
    const low = typeof c === 'number' && c < 30;
    const o = [];
    if (w) {
      const tx = r0(w * (P.bmi >= 50 ? 0.8 : 1));
      o.push(['治療劑量（VTE、NSTE-ACS）', `${B(low ? '1 mg/kg QD' : '1 mg/kg Q12H')}${low ? '（CrCl <30）' : ''}（實際體重）→ ${B(tx + ' mg')}（${fx(tx / 100, 2)} mL）${P.obese ? `；肥胖常用 0.7–1 mg/kg Q12H${P.bmi >= 50 ? '，BMI ≥50 取低端（此處 0.8 mg/kg）' : ''}；≥150 kg 或高出血風險監測 anti-Xa；NSTE-ACS >150 kg 可設上限 150 mg Q12H` : ''}。`]);
    } else o.push(['治療劑量（VTE、ACS）', '1 mg/kg Q12H（CrCl <30：1 mg/kg QD）。']);
    o.push(['預防劑量', low ? `${B('30 mg QD')}（CrCl <30）；院內僅 60 mg 針，打 0.3 mL 後丟棄其餘。` : P.bmi > 50 ? `${B('60 mg BID')} 或 0.5 mg/kg BID（BMI >50）。` : P.bmi >= 40 ? `${B('40 mg BID')} 或 0.5 mg/kg BID（BMI ≥40）。` : `${B('40 mg QD')}（院內 60 mg 針，打 0.4 mL）。`]);
    return o;
  },
  adj: (P) => {
    const a = [];
    if (P.rrt !== 'none') a.push(['d', `${P.rrt}：避免使用（累積；anti-Xa 測不到的活性代謝物；嚴重出血報告），改用 heparin。`]);
    else if (P.crcl != null && P.crcl < 30) a.push(['w', `CrCl ${r0(P.crcl)}：治療劑量改 1 mg/kg QD、預防 30 mg QD；建議監測 anti-Xa。`]);
    else if (P.crcl != null && P.crcl < 50) a.push(['w', `CrCl ${r0(P.crcl)}（30–50）：不需調整，但治療劑量出血風險增加，密切監測。`]);
    if (P.plt != null && P.plt < 50) a.push(['d', `血小板 ${P.plt}×10³/µL：治療劑量多暫停或改用可快速中止之 heparin。`]);
    if (P.wt && P.wt < 45) a.push(['w', '體重 <45 kg：出血風險增加，監測 anti-Xa。']);
    return a;
  },
  prep: '預充針，不需稀釋。',
  admin: '腹部皮下，不排出氣泡；ECMO、近期將手術或侵入性處置者，優先 heparin。',
  ext: '',
  mon: ['anti-Xa（第 3–4 劑後 4 h；Q12H 目標 0.5–1，QD 目標 1–2 IU/mL）：腎功能不全、肥胖、懷孕、低體重', 'CBC、血小板', '出血'],
  notes: ['反轉：protamine 僅部分中和（約 60%）。'] },

{ id: 'fonda', g: 'Fondaparinux', b: 'Arixtra', spec: '2.5 mg/0.5 mL/syringe', code: 'IFOND2', cls: 'ac', utd: '2026-11-13',
  route: 'sc', line: '', ves: '', kw: 'arixtra 抗凝 hit',
  dose: (P) => {
    const w = P.wt; let tx = '';
    if (w) tx = w < 50 ? '5 mg' : w <= 100 ? '7.5 mg' : '10 mg';
    return [
      ['VTE 預防', `${B('2.5 mg SC QD')}（體重 <50 kg 仿單列為禁忌）。`],
      ['VTE 治療', `<50 kg：5 mg；50–100 kg：7.5 mg；>100 kg：10 mg SC QD${tx ? ` → 此病人 ${B(tx)}（院內僅 2.5 mg 針，需 ${tx === '5 mg' ? 2 : tx === '7.5 mg' ? 3 : 4} 支）` : ''}。`],
      ['HIT（off-label）', '可作為 HIT 治療選項，劑量同 VTE 治療。'],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if (P.rrt !== 'none' || (typeof c === 'number' && c < 30)) a.push(['d', `${P.rrt !== 'none' ? P.rrt : 'CrCl ' + r0(c)}：仿單禁用（CrCl <30，清除下降約 55%，無反轉劑）。`]);
    else if (typeof c === 'number' && c < 50) a.push(['w', `CrCl ${r0(c)}（30–50）：不需調整但會累積（清除下降約 40%），密切監測出血；部分專家改用其他抗凝劑，預防劑量可減 50% 或 1.5 mg QD。`]);
    if (P.plt != null && P.plt < 100) a.push(['w', `血小板 ${P.plt}×10³/µL：監測出血。`]);
    return a;
  },
  prep: '預充針，不需稀釋。', admin: '腹部皮下。', ext: '',
  mon: ['CBC、Scr', '出血；可測 fondaparinux 專屬 anti-Xa（若院內可測）'],
  notes: ['無專一反轉劑；半衰期 17–21 h。'] },

{ id: 'tiro', g: 'Tirofiban', b: 'Aggrastat', spec: '12.5 mg/50 mL/vial（0.25 mg/mL 濃縮液）', code: 'ITIRO1', cls: 'ac', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'aggrastat gp iib/iiia acs pci',
  ci: { u: 'mcg/kg/min', w: 'TBW', lo: 0.075, hi: 0.15, st: 0.15, steps: [0.075, 0.1, 0.15] },
  preps: [{ l: '12.5 mg（50 mL）加入 NS 200 mL＝250 mL', c: 50, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'TBW'), c = renal(P);
    const low = (typeof c === 'number' && c <= 60) || P.rrt !== 'none';
    return [
      ['NSTE-ACS／STEMI（PCI 前，診斷性血管攝影後）', `${B('25 mcg/kg')} IV ≤5 分鐘${w ? `（${r0(25 * w)} mcg＝${fx(25 * w / 50, 1)} mL of 50 mcg/mL）` : ''} → 維持 ${B(low ? '0.075 mcg/kg/min' : '0.15 mcg/kg/min')}${low ? '（CrCl ≤60）' : ''}，最長 18 h。CABG 前 ≥4 h 停藥。GP IIb/IIIa 不常規使用，限血栓負荷大之高風險 PCI。`],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if ((typeof c === 'number' && c <= 60) || P.rrt !== 'none') a.push(['w', `${P.rrt !== 'none' ? P.rrt : 'CrCl ' + r0(c)}：bolus 不變，維持劑量減半為 0.075 mcg/kg/min。`]);
    if (P.plt != null && P.plt < 100) a.push(['d', `血小板 ${P.plt}×10³/µL：<100 慎用；曾因 tirofiban 血小板低下者禁用。`]);
    return a;
  },
  prep: '院內 Aggrastat 12.5 mg/50 mL 為濃縮輸注液（250 mcg/mL）：依台灣仿單不可原液推注，須先稀釋成 50 mcg/mL——自 250 mL NS 或 D5W 抽出 50 mL，加入整瓶 50 mL 濃縮液混勻。Bolus 與維持輸注皆由此稀釋袋給予。',
  admin: '周邊可；bolus 自同一稀釋袋給予。', ext: '',
  mon: ['血小板：開始後 2–6 h、之後每日（急性血小板低下）', 'Hb、出血、穿刺部位', 'aPTT（併用 heparin）'],
  notes: ['禁忌：30 天內中風、活動性出血、顱內出血病史、嚴重未控制高血壓。'] },

{ id: 'tpa', g: 'Alteplase (rt-PA)', b: 'Actilyse', spec: '50 mg/vial', code: 'ITPA50', cls: 'ac', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'actilyse rtpa tpa 血栓溶解 stroke pe',
  dose: (P) => {
    const w = P.wt; const t = w ? Math.min(0.9 * w, 90) : null;
    return [
      ['急性缺血性中風（發病 3 h 內；3–4.5 h off-label）', `${B('0.9 mg/kg')}（上限 90 mg）${t ? `→ 總量 ${fx(t, 1)} mg：${B(fx(t * 0.1, 1) + ' mg')} 1 分鐘 bolus，餘 ${B(fx(t * 0.9, 1) + ' mg')} 60 分鐘（${fx(t * 0.9, 1)} mL/h）` : '：10% 1 分鐘 bolus，90% 60 分鐘'}。給藥前 BP <185/110，之後 24 h <180/105。`],
      ['肺栓塞（高風險；或中高風險惡化者）', `${B('100 mg')} 2 h 輸注（院內 2 vial）；輸注期間暫停 heparin，結束後恢復。心跳停止疑肺栓塞：50 mg bolus，必要時 15 分鐘後再 50 mg。`],
    ];
  },
  adj: (P) => {
    const a = [['i', '腎、肝功能：不需調整。體重以實際（或估計）體重計算。']];
    if (P.plt != null && P.plt < 100) a.push(['d', `血小板 ${P.plt}×10³/µL：中風溶栓禁忌（<100）。`]);
    if (P.glu != null && (P.glu < 50 || P.glu > 400)) a.push(['w', `血糖 ${P.glu}：中風溶栓前須排除／矯正（<50 或 >400）。`]);
    return a;
  },
  prep: '以附帶 50 mL 無菌水溶解成 1 mg/mL，沿瓶壁注入、輕旋勿搖。可再以 NS 稀釋至 ≥0.5 mg/mL（不可用 D5W）。',
  admin: '獨立管路；輸注完以 NS 推完管內殘餘藥量。', ext: '',
  mon: ['神經學評估與血壓：每 15 分鐘 × 2 h → 每 30 分鐘 × 6 h → 每小時至 24 h', '出血、血管性水腫（併用 ACEi 者風險↑）'],
  notes: ['中風：24 h 後追蹤 CT／MRI 確認無出血，才開始抗凝或抗血小板。', '與 dobutamine、dopamine、heparin、nitroglycerin 不相容。'] },

/* ============================ 鎮靜／止痛 ============================ */
{ id: 'prop', ecmo: ['d', 'ECMO：高脂溶性，迴路吸附；脂質可能影響氧合器膜功能。'], g: 'Propofol', b: 'Fresofol 1%', spec: '200 mg/20 mL/amp（10 mg/mL）', code: 'IPROPL', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'fresofol diprivan 鎮靜 rass',
  ci: { u: 'mcg/kg/min', w: 'ADJ', lo: 5, hi: 50, st: 5, steps: [5, 10, 20, 30, 40, 50, 66.7] },
  preps: [{ l: '原液 10 mg/mL', c: 10000, cu: 'mcg/mL' }],
  dose: (P) => [
    ['ICU 鎮靜（插管）', `起始 ${B('5 mcg/kg/min')}，每 5–10 分鐘增加 5–10 至目標（RASS 0 至 −2）；常用 ${B('5–50 mcg/kg/min')}；上限未明確（院內常 60–80）。優於苯二氮平類；每日喚醒。`],
    ['頑固性癲癇重積', 'Loading 1–2 mg/kg，每 3–5 分鐘再 0.5–2 mg/kg 至抑制（總量上限 10 mg/kg）；連續 20 mcg/kg/min 起始，常用 30–60，上限約 200（>80 須謹慎），依 EEG 滴定。'],
    ['熱量', `脂肪乳劑 1.1 kcal/mL${P.wt ? `；以 20 mcg/kg/min 計約 ${r0(20 * P.wt * 60 / 10000 * 24 * 1.1)} kcal/day，需扣除營養處方` : ''}。`],
  ],
  adj: (P) => {
    const a = [['i', '腎、肝功能不全：不需調整，依 RASS 滴定。']];
    if (P.obese) a.push(['i', '肥胖（BMI ≥30）：以 AdjBW 計算起始劑量再依 RASS 滴定，治療期間不更換體重基準。']);
    if (P.sbp && P.sbp < 90) a.push(['w', `收縮壓 ${P.sbp}：propofol 降血壓、心輸出，低血壓時減量或改 dexmedetomidine／ketamine。`]);
    if (P.ecmo) a.push(['w', 'ECMO：迴路吸附，需求可能增加；脂肪可能影響氧合器。']);
    if (P.ttm) a.push(['w', '低溫治療：清除下降，劑量需求降低。']);
    return a;
  },
  prep: '原液使用，不稀釋；搖勻。',
  admin: '可周邊（前臂或肘窩大靜脈減少注射痛）。嚴格無菌；管路與未用完藥品 12 h 丟棄。不可與血品同一導管。',
  ext: '',
  mon: ['RASS／Critical-Care Pain Observation Tool（目標 RASS −2 至 0，淺鎮靜）', '血壓、心跳', '三酸甘油酯：開始前及每 3–7 天（特別 >48 h 或 ≥50 mcg/kg/min）', 'Propofol-related infusion syndrome：>4 mg/kg/h（66.7 mcg/kg/min）且 >48 h 風險↑；監測乳酸、CK、K、代謝性酸中毒、心律不整', '胰臟炎、尿色變綠'],
  notes: ['與 atracurium、cisatracurium、verapamil、phenytoin 不相容；與 midazolam 資料不一。'] },

{ id: 'mida', ecmo: ['d', 'ECMO：高脂溶性，迴路吸附，需求增加；停用後可能延遲釋放。'], g: 'Midazolam', b: 'Midatin', spec: '5 mg/mL/amp；15 mg/3 mL/amp', code: 'IMIDA5／IMIDA1', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'midatin dormicum 苯二氮平 bzd 鎮靜 se',
  ci: { u: 'mg/h', w: null, lo: 1, hi: 8, st: 1, steps: [0.5, 1, 2, 4, 6, 8, 10] },
  preps: [{ l: '50 mg + NS 至 50 mL', c: 1, cu: 'mg/mL' }, { l: '100 mg + NS 至 100 mL', c: 1, cu: 'mg/mL' }, { l: '原液 5 mg/mL（syringe pump）', c: 5, cu: 'mg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'ADJ');
    return [
      ['ICU 鎮靜（替代藥物）', `間歇優先：0.5–5 mg 或 0.01–0.05 mg/kg ≥2 分鐘，每 10–15 分鐘可重複。連續：${B('1–8 mg/h')} 或 0.01–0.1 mg/kg/h${w ? `（${fx(0.01 * w)}–${fx(0.1 * w)} mg/h）` : ''}；以追加 bolus 取代提高基礎速率。非苯二氮平類優先。`],
      ['頑固性癲癇重積', `${B('0.2 mg/kg')}${w ? `（${fx(0.2 * w)} mg）` : ''} 緩慢給予，每 3–5 分鐘可重複（總量 ≤2 mg/kg）；連續 0.05–2 mg/kg/h${w ? `（${fx(0.05 * w)}–${fx(2 * w, 0)} mg/h）` : ''}；突破發作再 0.1–0.2 mg/kg Q3–5 min，並每 3–4 h 調升 0.05–0.1 mg/kg/h。${B('部分專家用至 3 mg/kg/h')}（UpToDate）。EEG 抑制 ≥24 h 後每 3 h 減 50% 或 4–6 h 內停。`],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if ((typeof c === 'number' && c < 30) || P.rrt !== 'none') a.push(['w', '嚴重腎功能不全：起始不需調整，但活性代謝物累積易過度鎮靜；延長間歇給藥間隔、放慢輸注滴定。']);
    if (P.child) a.push(['w', `肝硬化（Child-Pugh ${P.child}）：優先 propofol 等無活性代謝物之短效藥；如需使用以最低有效劑量、避免重複給藥。`]);
    if (P.obese) a.push(['i', '肥胖：優先非依體重劑量；若用 weight-based 以 AdjBW 計算。']);
    if (P.age >= 65) a.push(['w', '高齡：減量（譫妄風險↑）。']);
    if (P.ecmo) a.push(['w', 'ECMO：迴路吸附，需求增加。']);
    if (P.ttm) a.push(['w', '低溫治療：CYP3A4 代謝下降，累積延長。']);
    a.push(['i', 'CYP3A4 抑制劑（azole、macrolide、diltiazem）使濃度上升。']);
    return a;
  },
  prep: '稀釋於 NS 或 D5W 至 0.5–1 mg/mL，或原液 syringe pump。',
  admin: '周邊可。', ext: '',
  mon: ['RASS、每日鎮靜中斷', '呼吸、血壓', '譫妄（CAM-ICU）'],
  notes: ['反轉：flumazenil（長期使用者小心誘發癲癇／戒斷）。'] },

{ id: 'loraz', ecmo: ['w', 'ECMO：中度脂溶性，部分吸附。'], g: 'Lorazepam', b: 'Anxicam', spec: '2 mg/mL/amp', code: 'ILORA2', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'anxicam ativan bzd se 癲癇重積',
  dose: (P) => {
    return [
      ['痙攣性癲癇重積（第一線）', `${B('4 mg IV')}，速率 ≤2 mg/min；3–5 分鐘後仍發作可重複；之後須接非苯二氮平類抗癲癇藥。`],
      ['非痙攣性癲癇重積', '2–4 mg IV（≤2 mg/min），2–5 分鐘後可重複，併用非苯二氮平類抗癲癇藥。'],
      ['ICU 鎮靜（替代藥物）', '間歇優先：1–4 mg，之後 1–4 mg Q2–6H PRN（或 0.02–0.04 mg/kg，單劑 ≤4 mg）。連續輸注多數不建議（propylene glycol 累積：osmol gap 代謝性酸中毒、腎衰竭）。'],
      ['酒精戒斷', '依 CIWA-Ar symptom-triggered 給藥。'],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.child) a.push(['i', '肝功能不全：葡萄糖醛酸化代謝，影響較 midazolam 小；嚴重者減量。']);
    if ((P.crcl != null && P.crcl < 30) || P.rrt !== 'none') a.push(['w', '腎功能不全：propylene glycol 累積風險，避免大劑量或長時間使用。']);
    return a;
  },
  prep: 'IV push 前以等量 NS 或 D5W 稀釋。冷藏避光。', admin: '緩慢 IV push（≤2 mg/min）；避免動脈內注射。', ext: '',
  mon: ['呼吸、血壓、意識', '大劑量長時間：osmolar gap、乳酸（propylene glycol）'], notes: [] },

{ id: 'dex', ecmo: ['d', 'ECMO：高脂溶性、高蛋白結合，迴路吸附，需求增加。'], g: 'Dexmedetomidine', b: 'Precedex', spec: '200 mcg/2 mL/vial', code: 'IDEXM2', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'precedex α2 鎮靜 譫妄',
  ci: { u: 'mcg/kg/h', w: 'ADJ', lo: 0.2, hi: 1.5, st: 0.2, steps: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.5] },
  preps: [{ l: '400 mcg（2 vial）+ NS 至 100 mL', c: 4, cu: 'mcg/mL' }, { l: '200 mcg + NS 至 50 mL', c: 4, cu: 'mcg/mL' }],
  dose: () => [
    ['ICU 鎮靜', `${B('0.2–1.5 mcg/kg/h')}，每 30 分鐘調 0.2 至 RASS 0 至 −2；>1.5 無額外效益。不建議 loading（血行動力不穩）。單用無法達深度鎮靜。試驗使用可達約 14 天。`],
    ['譫妄相關躁動（非插管）', '0.2–0.7 mcg/kg/h（夜間使用可改善睡眠）。'],
  ],
  adj: (P) => {
    const a = [];
    if (P.child === 'C') a.push(['w', '肝功能不全 Child-Pugh C：使用建議範圍最低端並滴定。']);
    else if (P.child) a.push(['i', `Child-Pugh ${P.child}：不需調整。`]);
    if (P.obese) a.push(['i', '肥胖（BMI ≥30）：以 AdjBW 計算起始劑量。']);
    if (P.hr && P.hr < 55) a.push(['d', `心跳 ${P.hr} bpm：心搏過緩時避免或減量。`]);
    if (P.sbp && P.sbp < 90) a.push(['w', `收縮壓 ${P.sbp}：可致低血壓。`]);
    if (P.ecmo) a.push(['w', 'ECMO：迴路吸附，需求可能增加。']);
    a.push(['i', '腎功能不全：原形不需調整，但鎮靜作用可能延長。']);
    return a;
  },
  prep: '200 mcg（2 mL）+ NS 48 mL＝50 mL（4 mcg/mL）。', admin: '周邊可。', ext: '',
  mon: ['心跳（心搏過緩）、血壓', 'RASS', '戒斷（高血壓、心搏過速、躁動）：累積 >12 mcg/kg/day 或高峰 >0.8 mcg/kg/h、使用較久或有高血壓病史者，須緩慢減量'], notes: [] },

{ id: 'ket', ecmo: ['w', 'ECMO：中度脂溶性，部分吸附。'], g: 'Ketamine', b: 'Ketalar', spec: '500 mg/10 mL/vial；50 mg/mL/vial', code: 'IKETA5／IMLKE5', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'ketalar nmda 止痛 鎮靜 se',
  ci: { u: 'mg/kg/h', w: 'B40', lo: 0.05, hi: 1, st: 0.1, steps: [0.05, 0.1, 0.2, 0.5, 1, 2] },
  preps: [{ l: '500 mg（10 mL）+ NS 至 250 mL', c: 2, cu: 'mg/mL' }, { l: '500 mg + NS 至 50 mL', c: 10, cu: 'mg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'B40');
    return [
      ['亞麻醉劑量止痛（off-label）', `間歇 0.1–0.5 mg/kg（常 10–30 mg）。連續：0.25–0.5 mg/kg bolus（≤35 mg）後 ${B('0.05–0.25 mg/kg/h')}${w ? `（${fx(0.05 * w)}–${fx(0.25 * w)} mg/h）` : ''}，常用 0.05–1 mg/kg/h。`],
      ['頑固性癲癇重積（off-label）', 'Loading 1.5 mg/kg（0.5–3），每 3–5 分鐘可再 0.5 mg/kg；連續 0.1–4 mg/kg/h 起始，上限 15 mg/kg/h，EEG 抑制至少 24 h。'],
      ['ICU 清醒插管', '10–20 mg 每 5–10 分鐘。'],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.child) a.push(['w', '肝功能不全：清除下降，減量。']);
    if (P.obese) a.push(['i', 'BMI 30–39 用實際體重；BMI ≥40 用 AdjBW 或 IBW（需快速起效用 AdjBW）。']);
    a.push(['i', '升高血壓、心跳（交感作用）；兒茶酚胺耗竭者可能抑制心肌。']);
    return a;
  },
  prep: '稀釋於 NS 或 D5W 至 1–10 mg/mL。', admin: '周邊可。', ext: '',
  mon: ['血壓、心跳', '譫妄、幻覺；分泌物增加', '長期使用：肝功能（膽管病變）'], notes: ['管制藥品。'] },

{ id: 'fent', ecmo: ['d', 'ECMO：高脂溶性（logP 高）、高蛋白結合，迴路吸附明顯，需求常大幅增加；以臨床效果滴定。'], g: 'Fentanyl', b: 'Fentanyl Citrate', spec: '100 mcg/2 mL/amp；500 mcg/10 mL/amp', code: 'IFENT2／IFENT5', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'opioid 鴉片 止痛 analgosedation',
  ci: { u: 'mcg/h', w: null, lo: 25, hi: 300, st: 25, steps: [25, 50, 100, 150, 200, 300] },
  preps: [{ l: '1,000 mcg（2 × 500 mcg）+ NS 至 100 mL', c: 10, cu: 'mcg/mL' }, { l: '原液 50 mcg/mL（syringe pump）', c: 50, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'ADJ');
    return [
      ['ICU 止痛／analgosedation', `Loading 25–100 mcg（或 1–2 mcg/kg）；間歇 25–50 mcg Q30–60 min PRN。連續：${B('25–50 mcg/h')} 起始，每 30–60 分鐘依 Critical-Care Pain Observation Tool／BPS 調整（調高前可先 25 mcg bolus）；常用 ${B('50–300 mcg/h')}（0.7–10 mcg/kg/h${w ? `，${r0(0.7 * w)}–${r0(10 * w)} mcg/h` : ''}）。長期使用蓄積於脂肪，延長鎮靜與脫離呼吸器。`],
      ['轉貼片', '穩定劑量時 IV mcg/h ≈ 貼片 mcg/h（1:1），貼片 12–24 h 後才達作用，期間逐步調降 IV。'],
    ];
  },
  adj: (P) => {
    const a = [['i', '嚴重腎或肝功能不全首選之鴉片類（無活性代謝物）；CrCl <50 頻繁給藥時以小劑量滴定，可能需減量。']];
    if (P.obese) a.push(['i', '肥胖：多數用非依體重劑量；若 weight-based 以 AdjBW 計算。']);
    if (P.child) a.push(['w', '肝功能不全：長時間輸注累積（context-sensitive half-time 延長），減量。']);
    if (P.ecmo) a.push(['w', 'ECMO：高脂溶性，迴路吸附明顯，需求增加。']);
    if (P.ttm) a.push(['w', '低溫治療：清除下降。']);
    a.push(['i', 'CYP3A4 抑制劑使濃度上升；快速大劑量推注可致胸壁僵直。']);
    return a;
  },
  prep: '原液或稀釋於 NS／D5W。', admin: '周邊可。', ext: '',
  mon: ['Critical-Care Pain Observation Tool／BPS、RASS', '呼吸速率、血壓', '腸蠕動（便秘）'], notes: ['反轉：naloxone 0.4 mg/mL（院內）。'] },

{ id: 'morph', ecmo: ['w', 'ECMO：Vd 增加，初期需求可能上升。'], g: 'Morphine', b: 'Morphine HCl', spec: '10 mg/mL/amp', code: 'IMORP1', cls: 'sed', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'opioid 嗎啡 止痛',
  ci: { u: 'mg/h', w: null, lo: 2, hi: 30, st: 2, steps: [1, 2, 4, 6, 10, 20, 30] },
  preps: [{ l: '100 mg（10 amp）+ NS 至 100 mL', c: 1, cu: 'mg/mL' }],
  dose: () => [
    ['ICU 止痛（UpToDate）', `Loading ${B('2–10 mg IV')}（高齡、低血容減量或省略）；維持 ${B('2–4 mg Q1–2H')} 或 4–8 mg Q3–4H。`],
    ['連續輸注（UpToDate 未列 ICU 劑量）', '2–30 mg/h 為 PADIS 2013 表列範圍，下方換算僅供參考。'],
  ],
  adj: (P) => {
    const a = [], c = renal(P);
    if (P.rrt !== 'none') a.push(['d', `${P.rrt}：避免使用；HD 可移除 morphine 與 M6G，但中樞抑制可能延長。改 fentanyl。`]);
    else if (typeof c === 'number' && c < 15) a.push(['d', `CrCl ${r0(c)}（<15）：避免使用。`]);
    else if (typeof c === 'number' && c < 30) a.push(['d', `CrCl ${r0(c)}（15–30）：避免；若必須，起始劑量 25–50% 並延長間隔。`]);
    else if (typeof c === 'number' && c < 60) a.push(['w', `CrCl ${r0(c)}（30–60）：考慮其他鴉片類；若使用，起始 50–75% 並可延長間隔。`]);
    if (P.child) a.push(['w', '肝硬化：給藥間隔延長 1.5–2 倍。']);
    if (P.sbp && P.sbp < 90) a.push(['w', '組織胺釋放可致低血壓。']);
    return a;
  },
  prep: '稀釋於 NS 或 D5W。', admin: '周邊可。', ext: '',
  mon: ['Critical-Care Pain Observation Tool、RASS、呼吸', '血壓', '肌躍（myoclonus，腎衰竭）'], notes: [] },

/* ============================ 神經肌肉阻斷劑 ============================ */
{ id: 'cisa', ecmo: ['w', 'ECMO：Vd 增加，依 train-of-four 滴定。'], g: 'Cisatracurium', b: 'Cisatral', spec: '10 mg/5 mL/amp（2 mg/mL）', code: 'ICISA1', cls: 'nmb', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'nimbex cisatral nmba ards 肌肉鬆弛',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 0.5, hi: 10, st: 1, steps: [0.5, 1, 2, 3, 5, 10] },
  preps: [{ l: '原液 2 mg/mL（syringe pump）', c: 2000, cu: 'mcg/mL' }, { l: '20 mg（2 amp）+ NS／D5W 至 200 mL', c: 100, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'IBWo');
    return [
      ['ICU 持續肌肉鬆弛', `Bolus ${B('0.1–0.2 mg/kg')}${w ? `（${fx(0.1 * w)}–${fx(0.2 * w)} mg）` : ''}；連續 ${B('1–3 mcg/kg/min')} 起始，依 train-of-four（目標 1–2/4）與臨床滴定，常用 0.5–10。適應：頑固性中重度 ARDS、致命性氣喘、低溫治療顫抖。`],
      ['ARDS（ACURASYS 方案）', '15 mg bolus → 37.5 mg/h 固定 48 h（ROSE 試驗未證實常規使用效益，限嚴重低氧與人機不同步）。'],
    ];
  },
  adj: (P) => {
    const a = [['i', 'Hofmann elimination：腎、肝功能不全皆不需調整。']];
    if (P.obese) a.push(['i', `肥胖：以 IBW 計算${P.bmi >= 50 ? '；BMI ≥50 或擔心劑量不足可改 AdjBW' : '（BMI ≥50 或擔心不足時改 AdjBW）'}。`]);
    if (P.ttm) a.push(['w', '低溫：Hofmann 降解變慢，作用延長，降低劑量。']);
    return a;
  },
  prep: '原液或稀釋於 D5W、NS 至 0.1 mg/mL；不可用 LR 或鹼性溶液。冷藏。', admin: '周邊可。', ext: '',
  mon: ['先確保深度鎮靜止痛（RASS −4 至 −5、BIS 若有）', 'Train-of-four 1–2/4', '眼睛保護、DVT 預防、皮膚', '併用類固醇：ICU-acquired weakness'],
  notes: ['與 propofol、NaHCO₃ 不相容。'] },

{ id: 'rocu', g: 'Rocuronium', b: 'Rocuronium Kabi', spec: '50 mg/5 mL/vial（10 mg/mL）', code: 'IROCU5', cls: 'nmb', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'esmeron nmba rsi 插管',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 3, hi: 16, st: 3, steps: [3, 5, 8, 10, 12, 16] },
  preps: [{ l: '原液 10 mg/mL（syringe pump）', c: 10000, cu: 'mcg/mL' }, { l: '500 mg + NS 至 100 mL', c: 5000, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w, lab } = dw(P, 'IBWo');
    return [
      ['快速插管（rapid sequence intubation）', `${B('1–1.2 mg/kg')}${w ? `（${lab}：${r0(w)}–${r0(1.2 * w)} mg）` : ''}；部分專家用 1.5 mg/kg（作用延長）。肥胖以 IBW；緊急且無法即時算 AdjBW 時可考慮實際體重，但很少需要 >250 mg。`],
      ['ICU 持續肌肉鬆弛', `Loading 0.6–1 mg/kg；連續 ${B('3–8 mcg/kg/min')} 起始${w ? `（${fx(3 * w * 60 / 1000)}–${fx(8 * w * 60 / 1000)} mg/h）` : ''}，每 60 分鐘調 0.5–1，常用 3–16。間歇：0.6–1 mg/kg（50 mg）後 0.3–1 mg/kg（25 mg）Q30–60 min。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.child) a.push(['w', `肝病（Child-Pugh ${P.child}）：Vd 增加使作用延長，可能需減量；腹水者 rapid sequence intubation 取劑量高端。`]);
    if ((P.crcl != null && P.crcl < 30) || P.rrt !== 'none') a.push(['w', '腎功能不全：清除下降，作用可能延長。']);
    a.push(['i', '院內總品項未見 sugammadex；殘餘阻斷以 neostigmine + glycopyrrolate 拮抗（院內皆有）。']);
    return a;
  },
  prep: '原液或稀釋於 NS／D5W。冷藏；室溫 60 天。', admin: '周邊可。', ext: '',
  mon: ['Train-of-four', '深度鎮靜', '眼睛保護'], notes: ['與 hydrocortisone、insulin、vancomycin、dexamethasone 不相容。'] },

{ id: 'atra', g: 'Atracurium', b: 'Genso', spec: '25 mg/2.5 mL/amp（10 mg/mL）', code: 'IATRI2', cls: 'nmb', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'tracrium nmba',
  ci: { u: 'mcg/kg/min', w: 'IBWo', lo: 2, hi: 20, st: 4, steps: [2, 4, 8, 12, 16, 20] },
  preps: [{ l: '100 mg（4 amp）+ NS 至 100 mL', c: 1000, cu: 'mcg/mL' }, { l: '原液 10 mg/mL', c: 10000, cu: 'mcg/mL' }],
  dose: (P) => {
    const { w } = dw(P, 'IBWo');
    return [
      ['ICU 肌肉鬆弛', `Loading ${B('0.4–0.6 mg/kg')}${w ? `（${r0(0.4 * w)}–${r0(0.6 * w)} mg）` : ''}；連續 ${B('4–12 mcg/kg/min')} 起始，每 5–10 分鐘依 train-of-four 調整，常用 2–20。間歇：0.08–0.1 mg/kg Q15–25 min。肥胖以 IBW。`],
    ];
  },
  adj: () => [['i', 'Hofmann 降解與酯解：腎、肝不需調整；代謝物 laudanosine 於腎、肝衰竭累積（高濃度可致癲癇）。'], ['w', '組織胺釋放：低血壓、支氣管痙攣；慢推。']],
  prep: '稀釋於 NS、D5W 至 0.2、0.5、1 或 5 mg/mL；不可與鹼性溶液混合。冷藏。', admin: '周邊可。', ext: '',
  mon: ['Train-of-four', '血壓', '深度鎮靜'], notes: ['與 propofol、phenobarbital、鹼性溶液不相容。'] },

/* ============================ 抗癲癇 ============================ */
{ id: 'pht', ecmo: ['w', 'ECMO：高蛋白結合，迴路吸附與 Vd 改變，濃度不可預測，監測濃度。'], g: 'Phenytoin', b: 'Aleviatin', spec: '250 mg/5 mL/amp', code: 'IPHEN2', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'CP', ves: 'V', kw: 'aleviatin dilantin 癲癇 se',
  dose: (P) => {
    const b40 = P.bmi >= 40, mgk = b40 ? 15 : 20, ld = P.wt ? rnd(mgk * P.wt, 50) : null;
    const rate = P.age >= 65 || P.hf ? 20 : 50;
    const mw = P.obese ? Math.min(P.ibw, P.wt) : P.wt;
    return [
      ['癲癇重積（替代藥物；fosphenytoin 院內無）', `Loading ${B(mgk + ' mg/kg')}${b40 ? '（BMI ≥40，實際體重、不設上限，曾報告至 2.3 g）' : ''}${ld ? ` × 實際體重 ${P.wt} kg → ${B(fx(ld, 0) + ' mg')}` : ''}，速率 ${B('≤' + rate + ' mg/min')}${rate === 20 ? '（高齡／心血管疾病）' : '（一般 25–50）'}${ld ? `，至少 ${r0(ld / rate)} 分鐘` : ''}；併用 BZD。10 分鐘後仍發作可追加 5–10 mg/kg，總 loading ≤30 mg/kg。`],
      ['維持', `Loading 後 ${B('8–12 h')} 開始：4–7 mg/kg/day${mw ? `（${P.obese ? 'IBW ' : ''}${fx(mw)} kg → ${r0(4 * mw)}–${r0(7 * mw)} mg/day）` : ''}（常用 300–400 mg/day）分 2–4 次。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.alb != null && P.alb < 3.5) {
      const den = (P.crcl != null && P.crcl < 10) || P.rrt !== 'none' ? 0.1 : 0.2;
      a.push(['w', `白蛋白 ${P.alb} g/dL：游離比例上升，總濃度低估效果。校正濃度 = 測得值 ÷ (${den} × ${P.alb} + 0.1)${den === 0.1 ? '（CrCl <10 或透析）' : ''}；目標總濃度 10–20（游離 1–2 mcg/mL）。`]);
    }
    if (P.child) a.push(['w', '肝功能不全：清除下降，減量並監測濃度。']);
    if ((P.crcl != null && P.crcl < 10) || P.rrt !== 'none') a.push(['w', '腎衰竭：蛋白結合下降，以游離濃度評估。']);
    a.push(['i', '強效 CYP 誘導劑，交互作用多（DOAC、azole、tacrolimus 等）。']);
    return a;
  },
  prep: '僅以 NS 稀釋至 ≥5 mg/mL（或原液以幫浦給藥），稀釋後 4 h 內輸注完畢；IV piggyback 建議 0.22–0.55 µm 線上過濾器。勿冷藏。',
  admin: '以大口徑導管注入周邊大靜脈或中央靜脈，建議輸注幫浦；給藥前後以 NS 沖管。避免 IM（組織壞死）。外滲可致 purple glove syndrome。',
  ext: '',
  mon: ['輸注中連續 ECG、血壓（心律不整、低血壓）', '濃度：loading 後 1–2 h；維持期 trough', '注射部位'],
  notes: ['與幾乎所有藥物、D5W 不相容 → 一律獨立管路。'] },

{ id: 'lev', g: 'Levetiracetam', b: 'Keppra', spec: '500 mg/5 mL/vial', code: 'ILEVE5', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'keppra lev 癲癇 se',
  dose: (P) => {
    const w = P.wt, ld = w ? Math.min(rnd(60 * w, 250), 4500) : null, ld40 = w ? Math.min(rnd(40 * w, 250), 4500) : null;
    const c = renal(P); let m = '500–1,500 mg Q12H';
    if (P.rrt === 'HD') m = '500–1,000 mg Q24H，每次透析後補 250–500 mg（AD）';
    else if (P.rrt === 'CRRT') m = '750–1,250 mg Q12H（CVVH/HD/HDF；effluent 4–5 L/h 可能需更高）';
    else if (P.rrt === 'PD') m = '250–500 mg Q24H';
    else if (typeof c === 'number') m = c >= 80 ? '500–1,500 mg Q12H' : c >= 50 ? '500–1,000 mg Q12H' : c >= 30 ? '250–750 mg Q12H' : c >= 15 ? '250–500 mg Q12H' : '250–500 mg Q24H';
    return [
      ['癲癇重積（off-label）', `${B('40–60 mg/kg')}（上限 4,500 mg）${ld ? `→ ${B(fx(ld40, 0) + '–' + fx(ld, 0) + ' mg')}` : ''}，5–15 分鐘輸注；或 1–3 g 以 2–5 mg/kg/min。併用 BZD。肥胖用實際體重。`],
      ['癲癇預防（ICH、TBI、aSAH；院內常用）', `${B((() => { if (P.rrt === 'HD') return '500–1,000 mg Q24H，透析後補 250–500 mg（AD）'; if (P.rrt === 'CRRT') return '1,000 mg Q12H'; if (P.rrt === 'PD') return '500 mg Q24H'; if (typeof c !== 'number' || c >= 50) return '1,000 mg IV Q12H'; return c >= 30 ? '750 mg Q12H' : c >= 15 ? '500 mg Q12H' : '500 mg Q24H'; })())}${typeof c === 'number' && P.rrt === 'none' ? `（CrCl ${r0(c)}）` : ''}；不需 loading dose。TBI 早期預防常用 7 天；aSAH 院內預設給予；ICH 依臨床判斷。`],
      ['ARC（實測 CrCl >130）', '1.5–2 g Q12H。'],
      ['維持（依腎功能，仿單以 mL/min/1.73 m²）', `${B(m)}${typeof c === 'number' ? `（CrCl ${r0(c)}）` : ''}。`],
    ];
  },
  adj: (P) => [['i', '肝功能不全：不需調整。'], ...(P.rrt === 'HD' ? [['w', 'HD 可清除約 50%：透析日於透析後補充。']] : [])],
  prep: '稀釋於 100 mL NS、LR 或 D5W，15 分鐘輸注；亦可原液緩慢推注（off-label）。', admin: '周邊可。', ext: '',
  mon: ['癲癇控制、EEG', '行為改變、躁動', '腎功能'], notes: [] },

{ id: 'vpa', ecmo: ['w', 'ECMO：高蛋白結合，濃度變化大，監測濃度（低白蛋白推估游離濃度）。'], g: 'Valproate', b: 'Valproate Sodium', spec: '400 mg/4 mL/vial', code: 'IVALP1', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'depakine vpa valproic 癲癇',
  dose: (P) => {
    const { w, lab } = dw(P, 'ADJ'), ld = w ? Math.min(rnd(40 * w, 100), 3000) : null, ld2 = w ? Math.min(rnd(20 * w, 100), 3000) : null;
    return [
      ['癲癇重積（off-label，併用 BZD）', `${B('20–40 mg/kg')}（上限 3,000 mg）${ld ? `（${lab}）→ ${B(fx(ld2, 0) + '–' + fx(ld, 0) + ' mg')}` : ''}，速率最快 10 mg/kg/min（非痙攣性癲癇重積部分建議 ≤5 mg/kg/min）。`],
      ['維持', `10–15 mg/kg/day 起始，上限 60 mg/kg/day，IV 分 Q6H${w ? `（${r0(10 * w)}–${r0(15 * w)} mg/day）` : ''}；非癲癇重積時 IV 60 分鐘、≤20 mg/min。依濃度調整（總濃度 50–100 mcg/mL）。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.child === 'B' || P.child === 'C') a.push(['d', `Child-Pugh ${P.child}：禁用。`]);
    else if (P.child === 'A') a.push(['w', 'Child-Pugh A：仿單禁用；若無替代藥物且利大於弊，以最低劑量起始。']);
    if (P.alb != null && P.alb < 3.5) a.push(['w', `白蛋白 ${P.alb} g/dL：游離 VPA 上升，總濃度低估。院內無法測游離濃度，請用藥事照護組 <a href="../tdm/valproic-acid.html" target="_blank" rel="noopener">Valproic acid TDM 計算器</a> 推估。`]);
    if (P.plt != null && P.plt < 100) a.push(['w', `血小板 ${P.plt}×10³/µL：VPA 劑量相關血小板低下。`]);
    a.push(['d', '併用 carbapenem：VPA 濃度在 24 h 內大幅下降（不可靠調高劑量補償），避免併用。']);
    return a;
  },
  prep: '稀釋於 ≥50 mL NS、D5W 或 LR。', admin: '周邊可。', ext: '',
  mon: ['VPA 濃度（總量；低白蛋白時推估游離）', '血氨（意識改變時）、肝功能、血小板、澱粉酶'], notes: ['懷孕禁用（本院立場）；粒線體疾病（POLG）禁用。'] },

{ id: 'lcm', g: 'Lacosamide', b: 'Vimpat', spec: '200 mg/20 mL/vial', code: 'ILACO2', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'vimpat 癲癇',
  dose: (P) => {
    const c = renal(P), lim = (typeof c === 'number' && c < 30) || P.rrt === 'HD' || P.rrt === 'PD' || P.child === 'B';
    return [
      ['癲癇重積（off-label）', `Loading ${B('200–400 mg IV')}（NCS：200 mg 15 分鐘；部分專家 400 mg 以 ≤80 mg/min 給予）；維持 ${B('200–400 mg/day 分兩次')}，少數需 600 mg/day。`],
      ['局部癲癇維持', `100–200 mg Q12H${lim ? '；此病人維持劑量上限為適應症最高劑量的 75%' : ''}${P.child === 'B' ? '，且每日 ≤300 mg' : ''}。`],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if (typeof c === 'number' && c < 30) a.push(['w', `CrCl ${r0(c)}：起始不調整；維持至多為適應症最高劑量的 75%。`]);
    if (P.rrt === 'HD') a.push(['w', 'HD（4 h 移除約 50%）：維持至多 75% 最高劑量，每次透析後補充至多 50%。']);
    if (P.rrt === 'PD') a.push(['w', 'PD：維持至多 75% 最高劑量。']);
    if (P.rrt === 'CRRT') a.push(['i', 'CRRT：顯著清除，多不需調整；effluent >4 L/h 可能需較高劑量。']);
    if (P.child === 'C') a.push(['d', 'Child-Pugh C：避免使用。']);
    else if (P.child === 'B') a.push(['w', 'Child-Pugh B：可滴定至一般維持劑量的 75%，每日 ≤300 mg。']);
    else if (P.child === 'A') a.push(['i', 'Child-Pugh A：不需調整。']);
    if (P.hr && P.hr < 55) a.push(['w', 'PR 延長、房室傳導阻滯：心搏過緩者監測 ECG。']);
    return a;
  },
  prep: '原液或稀釋於 NS、D5W、LR。', admin: '維持劑量 30–60 分鐘輸注（loading 可 15 分鐘）；周邊可。', ext: '',
  mon: ['ECG（PR、房室阻滯），特別 loading 時', '頭暈、複視'], notes: [] },

{ id: 'pb', g: 'Phenobarbital', b: 'Phenobital', spec: '100 mg/mL/amp', code: 'IPHEN1', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'CP', ves: 'I', kw: 'luminal 巴比妥 癲癇 se 酒精戒斷',
  dose: (P) => {
    const { w, lab } = dw(P, 'ADJ'), ld = w ? rnd(20 * w, 50) : null;
    return [
      ['癲癇重積', `AES：15 mg/kg；NCS：${B('20 mg/kg')}${ld ? `（${lab}）→ ${B(fx(ld, 0) + ' mg')}` : ''}，速率 50–100 mg/min；必要時 10 分鐘後再 5–10 mg/kg。`],
      ['維持', `約 ${B('2 mg/kg/day')} 分次${P.wt ? `（${r0(2 * (P.obese ? Math.min(P.ibw, P.wt) : P.wt))} mg/day）` : ''}（穩定濃度約 20 mg/L），依濃度與反應調整。`],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if (typeof c === 'number' && c < 10) a.push(['w', `eGFR/CrCl ${r0(c)}（<10）：給一般劑量的 50–66%，依濃度調整。`]);
    if (P.rrt === 'HD') a.push(['w', 'HD（可移除約 40%）：給 50–66%；癲癇風險中高者透析後補約 50%。']);
    if (P.rrt === 'CRRT') a.push(['w', 'CRRT 可清除：依濃度調整。']);
    if (P.obese) a.push(['i', '肥胖：loading 用 AdjBW 或 TBW（極重者 TBW 易過量）；維持以非依體重或 IBW。']);
    if (P.child) a.push(['w', '肝功能不全：減量（肝性腦病變風險）。']);
    a.push(['w', '併用 BZD：呼吸抑制、低血壓加劇，備妥插管。強效 CYP 誘導劑。']);
    return a;
  },
  prep: '可原液或稀釋於 NS、D5W。', admin: '高鹼性（pH ~10），避免外滲與動脈內注射；大靜脈為佳。', ext: '',
  mon: ['呼吸、血壓、意識', '濃度 15–40 mcg/mL'], notes: ['與 midazolam、ketamine、atracurium 不相容。'] },

{ id: 'brv', g: 'Brivaracetam', b: 'Briviact', spec: '50 mg/5 mL/vial', code: 'IBRIV5', cls: 'aed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'briviact 癲癇',
  dose: (P) => [
    ['局部癲癇（成人）', `${B('50 mg BID')}（25–100 mg BID）IV push 2 分鐘或 15 分鐘輸注。`],
    ['頑固性癲癇重積（off-label）', 'Loading 50–400 mg IV（≥約 2 mg/kg 似較易終止）；維持 100–400 mg/day 分兩次。'],
    ...(P.child ? [['肝功能不全', `${B('25 mg BID')} 起始，上限 75 mg BID（所有 Child-Pugh 等級）。`]] : []),
  ],
  adj: (P) => {
    const a = [['i', '腎功能不全：不需調整。']];
    if (P.rrt === 'HD' || P.rrt === 'PD') a.push(['d', `${P.rrt}：末期腎病透析者無資料，不建議。`]);
    if (P.child) a.push(['w', '肝功能不全：25 mg BID 起始，上限 75 mg BID。']);
    a.push(['i', '與 levetiracetam 併用無額外效益。Rifampin 降低濃度（需加倍）。']);
    return a;
  },
  prep: '原液或稀釋於 NS、D5W、LR。', admin: '周邊可。', ext: '',
  mon: ['嗜睡、頭暈', '精神行為副作用（較 levetiracetam 少）'], notes: [] },

/* ============================ 電解質／胰島素 ============================ */
{ id: 'kcl', g: 'Potassium chloride', b: 'KCl 15%；KCl 0.298% in NS', spec: '10 mEq/5 mL/amp；20 mEq/500 mL/bot', code: 'IKCL05／BKCLNS', cls: 'el', utd: '2026-11-13',
  route: 'int', line: 'P', ves: 'I', kw: 'kcl 鉀 低血鉀 hypokalemia',
  dose: (P) => {
    const k = P.k; let amt = '';
    if (k != null) amt = k >= 3.5 ? '血鉀 ≥3.5：一般不需 IV 補充（DKA 時 3.5–5 每公升點滴加 10–20 mEq）' : k >= 3 ? 'IV 20–60 mEq 一次，速率 10–20 mEq/h' : k >= 2.5 ? '10–20 mEq/h 起始，最高 20 mEq/h（連續 ECG），每 2–4 h 複檢' : '10–40 mEq/h 起始（40 mEq/h 限中央＋連續 ECG），24 h 可能需達 400 mEq';
    const ren = typeof renal(P) === 'number' && renal(P) < 30;
    return [
      ['低血鉀（UpToDate）', `${k != null ? `血鉀 ${k} → ${B(amt)}` : '3.0–3.4：IV 20–60 mEq（10–20 mEq/h）；2.5–2.9：10–20 mEq/h（≤20）；<2.5 或危及生命：10–40 mEq/h（中央＋ECG）'}${ren ? '；CrCl <30：起始劑量至少減 50%' : ''}。先矯正低血鎂。`],
      ['輸注速率與濃度', `周邊：${B('≤10 mEq/h')}、≤10 mEq/100 mL（院內 0.298% premix 為 4 mEq/100 mL）。中央：20–40 mEq/100 mL，最高 ${B('40 mEq/h')}；>10 mEq/h 建議中央＋連續 ECG。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.mg != null && P.mg < 1.8) a.push(['w', `血鎂 ${P.mg}：低血鎂使低血鉀難以矯正，先補鎂。`]);
    if (P.crcl != null && P.crcl >= 30 && P.crcl < 60) a.push(['i', `CrCl ${r0(P.crcl)}：不需調整，但頻繁監測避免矯正過度。`]);
    if (P.rrt === 'CRRT') a.push(['i', 'CRRT：置換液／透析液鉀濃度決定平衡，補充前確認 Prismasol 等溶液成分。']);
    if (P.hco3 != null && P.hco3 < 18) a.push(['i', '代謝性酸中毒：矯正酸中毒時鉀會移入細胞，補充後再追蹤。']);
    if (!P.cvc) a.push(['w', '未勾選中央導管：只能用周邊速率（≤10 mEq/h、≤10 mEq/100 mL）。']);
    return a;
  },
  prep: '15% KCl（2 mEq/mL）為高警訊藥品：必須稀釋，絕對禁止 IV push。中央：20 mEq/100 mL NS；周邊：使用院內 20 mEq/500 mL premix 或 ≤10 mEq/100 mL。',
  admin: '輸注幫浦；周邊高濃度刺激疼痛、靜脈炎。', ext: '',
  mon: ['血鉀：每補 40–60 mEq 或 2–4 h 後複檢', '>10 mEq/h 時連續 ECG', '腎功能、尿量'], notes: [] },

{ id: 'mg', g: 'Magnesium sulfate', b: 'MgSO₄ 10%', spec: '2 g/20 mL/amp（16.2 mEq）', code: 'IMGSO1', cls: 'el', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'mgso4 鎂 低血鎂 torsades',
  dose: (P) => {
    const m = P.mg; let amt = '';
    if (m != null) amt = m >= 1.8 ? '一般不需補充' : m >= 1.5 ? '1–2 g，1–2 h' : m >= 1 ? '2–4 g，2–12 h' : '4–8 g，4–24 h（有症狀：先 1–2 g 5–60 分鐘）';
    const c = renal(P);
    return [
      ['低血鎂（UpToDate，血行動力穩定）', `${m != null ? `血鎂 ${m} → ${B(amt)}` : '輕度 1.5–1.7：1–2 g／1–2 h；中度 1–1.4：2–4 g／2–12 h；重度 <1：4–8 g／4–24 h'}${typeof c === 'number' && c < 30 ? (c < 10 ? '；CrCl <10：極易高血鎂，非必要不給' : '；CrCl 10–30：給 50%') : ''}。給藥後至少 6–12 h 再測。`],
      ['血行動力不穩', `${B('1–2 g IV')} 2–15 分鐘，必要時重複。`],
      ['Torsades de pointes', '1–2 g（50–100 mL D5W）15 分鐘；無效或復發可重複，1 h 內總量 4 g；之後可 0.5–1 g/h。'],
      ['子癲前症（參考）', '4–6 g loading 15–20 分鐘，1–2 g/h 維持。'],
    ];
  },
  adj: (P) => P.rrt === 'CRRT' ? [['i', 'CRRT（特別 citrate 抗凝）：鎂流失增加，需定期監測。']] : [],
  prep: '2 g 稀釋於 50–100 mL NS 或 D5W；院內 10% 20 mL＝2 g。', admin: '周邊可。', ext: '',
  mon: ['血鎂（6–12 h 後；分布慢，太早測會高估）', '深部肌腱反射、呼吸、血壓（高鎂毒性）'], notes: [] },

{ id: 'kphos', g: 'Potassium phosphate', b: 'K₃PO₄', spec: '20 mL/amp（每 mL：P 3 mmol、K⁺ 4.4 mEq；每 amp P 60 mmol、K⁺ 88 mEq）', code: 'IK2PO4', cls: 'el', utd: '2026-11-13',
  route: 'int', line: 'CP', ves: 'I', kw: 'kphos 磷 低血磷 refeeding',
  dose: (P) => phosDose(P, 'K'),
  adj: (P) => phosAdj(P, 'K'),
  prep: '每 mL 含 dibasic potassium phosphate 236 mg＋monobasic 224 mg（P 3 mmol、K⁺ 4.4 mEq）。稀釋於 NS 或 D5W；周邊 ≤6.8 mmol P／100 mL。',
  admin: '每 mmol 磷約含 1.5 mEq 鉀。周邊：≤6.8 mmol P/100 mL、≤6.8 mmol/h（鉀 10 mEq/h）；中央：≤18 mmol/100 mL、≤15 mmol/h。不可 IV push。', ext: '',
  mon: ['血磷、鉀、鈣：輸注後 2–6 h', '腎功能'], notes: ['與 calcium 不相容（沉澱）。'] },

{ id: 'naglyp', g: 'Sodium glycerophosphate', b: 'Glycophos', spec: '20 mL/amp（P 1 mmol/mL、Na 2 mmol/mL）', code: 'INAGP2', cls: 'el', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'glycophos 磷 低血磷',
  dose: (P) => phosDose(P, 'Na'),
  adj: (P) => phosAdj(P, 'Na'),
  prep: '每 amp 含 P 20 mmol、Na 40 mmol；稀釋於 NS 或 D5W 後輸注。', admin: '周邊可。', ext: '',
  mon: ['血磷、鈉、鈣'], notes: ['血鉀 ≥4 或高血鉀、腎功能不全時，優先選鈉鹽。'] },

{ id: 'cagl', g: 'Calcium gluconate', b: 'Calglon 10%', spec: '1 g/10 mL/amp（元素鈣 93 mg、4.65 mEq）', code: 'ICAGL1', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: 'V', kw: 'calglon 鈣 低血鈣 高血鉀 calcium',
  dose: (P) => {
    const o = [];
    let ca = '';
    if (P.ica != null) ca = `iCa ${P.ica} mmol/L`;
    else if (P.ca != null && P.alb != null) ca = `校正 Ca ${fx(P.ca + 0.8 * (4 - P.alb))} mg/dL（Ca + 0.8×(4 − Alb)）`;
    else if (P.ca != null) ca = `Ca ${P.ca} mg/dL`;
    o.push(['高血鉀（ECG 變化或 K >6.5）', `${B('1–2 g IV')} 2–5 分鐘（常用 1–3 g）；5 分鐘後 ECG 仍異常可重複，之後必要時每 30–60 分鐘。不降鉀，須併用 insulin＋dextrose。`]);
    o.push(['急性症狀性低血鈣', `${ca ? ca + '；' : ''}嚴重症狀、ECG 異常或校正 Ca <7–7.5：${B('1–2 g')} 加入 50 mL D5W／NS，10–20 分鐘；10–60 分鐘後可重複。持續者接連續輸注：11 g + 890 mL（約 1 mg 元素鈣/mL）以 50–100 mL/h 起始。無症狀 CKD 不以 IV 鈣為起始治療。`]);
    o.push(['大量輸血', '依 iCa 補充（citrate 結合）。']);
    return o;
  },
  adj: (P) => {
    const a = [];
    if (P.phos != null && P.phos > 6) a.push(['w', `血磷 ${P.phos}：高血磷時補鈣增加異位鈣化，非緊急不補。`]);
    if (P.mg != null && P.mg < 1.6) a.push(['w', '低血鎂：先補鎂，否則低血鈣難以矯正。']);
    a.push(['w', '服用 digoxin 者：快速補鈣可能誘發心律不整，緩慢給予並監測。']);
    return a;
  },
  prep: '稀釋於 50 mL NS／D5W（bolus），連續輸注見劑量欄。', admin: 'Bolus ≤200 mg/min（緊急除外）；不可 IM。UpToDate 列為 vesicant，確認導管位置並避免外滲。', ext: '',
  mon: ['iCa、ECG', '注射部位'], notes: ['與 NaHCO₃、phosphate、ceftriaxone 不相容。'] },

{ id: 'nahco3', g: 'Sodium bicarbonate', b: 'NaHCO₃ 7%', spec: '7% 20 mL/amp（0.83 mEq/mL，約 16.7 mEq）；Rolikan 7% 250 mL/bot（0.83 mEq/mL，約 208 mEq；藥庫撥補領用）', code: 'INAHC7／BROLI2', cls: 'el', utd: '2026-11-13',
  route: 'int', line: 'CP', ves: 'V', kw: 'bicarbonate 酸中毒 alkalinization',
  dose: (P) => {
    const o = []; const w = P.wt;
    o.push(['急性嚴重代謝性酸中毒', `考慮於 pH <7.1，或嚴重 AKI 且 pH ≤7.2；目標 pH >7.2（AKI >7.3）。間歇：${B('約 90–100 mEq')}（7% 20 mL amp 約 5.5–6 支，或 Rolikan 約 110–120 mL）1–2 分鐘，每 2 h 評估，不足再 45–100 mEq 或改連續輸注。`]);
    if (w && P.hco3 != null && P.hco3 < 22) { const def = 0.5 * w * (22 - P.hco3); o.push(['缺額粗估', `0.5 × ${w} kg × (22 − ${P.hco3}) ≈ ${r0(def)} mEq（僅作連續輸注起始參考）。`]); }
    o.push(['高血鉀', '合併心跳停止：50 mEq 5 分鐘；合併代謝性酸中毒且鈣等治療後仍嚴重時可考慮。']);
    o.push(['Na-channel 阻斷劑中毒（如 TCA，QRS >100–120 ms）', '50–150 mEq 或 1–2 mEq/kg 1–2 分鐘，每 3–5 分鐘可重複至 QRS 變窄；建議會診毒物中心。']);
    return o;
  },
  adj: (P) => {
    const a = [];
    if (P.na != null && P.na > 150) a.push(['w', `血鈉 ${P.na}：高鈉，7% 為高張含鈉溶液。`]);
    if (P.ica != null && P.ica < 1) a.push(['w', '低游離鈣：鹼化使 iCa 再下降，先補鈣。']);
    a.push(['i', '需有足夠通氣排出 CO₂，否則細胞內酸中毒惡化。']);
    return a;
  },
  prep: 'IV push 可不稀釋。輸注：以葡萄糖液稀釋至 ≤0.5 mEq/mL，至少 2 h，速率 ≤1 mEq/kg/h。兩品項皆為 7%（0.83 mEq/mL）。', admin: '高濃度（≥8.4% 為 vesicant；院內 7% 亦高張）中央為佳；外滲組織壞死。', ext: '',
  mon: ['動脈血液氣體、電解質（K、iCa、Na）'], notes: ['與 catecholamines、calcium、midazolam 等多數藥品不相容。'] },

{ id: 'nacl3', g: '3% NaCl', b: 'Sodium Chloride 3%', spec: '500 mL/bot（Na 513 mEq/L）', code: 'BNACL3', cls: 'el', cls2: 'icp', utd: '2026-11-13',
  route: 'int', line: 'CP', ves: 'V', kw: 'hypertonic saline 高張 低血鈉 顱內壓 icp',
  dose: (P) => {
    const o = [];
    const f = P.sex === 'F' ? (P.age >= 65 ? 0.45 : 0.5) : (P.age >= 65 ? 0.5 : 0.6);
    if (P.wt && P.na != null) {
      const tbw = f * P.wt, perL = (513 - P.na) / (tbw + 1);
      const v6 = 6 / perL * 1000, v8 = 8 / perL * 1000;
      o.push(['Na 矯正計算（Adrogue-Madias）', `TBW ＝ ${f} × ${P.wt} kg ＝ ${fx(tbw)} L；每 1 L 3% NaCl 預估升 Na ＝ (513 − ${P.na}) ÷ (${fx(tbw)} + 1) ＝ ${B(fx(perL, 1) + ' mEq/L')}（每 100 mL ≈ ${fx(perL / 10, 1)}）。<br>24 h 目標 +4–6 mEq/L：約 ${B(r0(v6 * 4 / 6) + '–' + r0(v6) + ' mL')}；<span class="lim">理論上限 +8 mEq/L：${B(r0(v8) + ' mL / 24 h')}（平均 ${fx(v8 / 24, 0)} mL/h）</span>。未計入尿量與其他輸液，實際以每 2–6 h 血鈉為準；有症狀者前 6 h 內先升 4–6，之後維持不升。`]);
    } else o.push(['Na 矯正計算', '輸入體重、性別、年齡與血鈉後，自動計算每公升預估升幅與 24 h 理論上限量（Adrogue-Madias）。']);
    o.push(['急性低血鈉（<48 h，Na <130）', `無症狀：${B('50 mL')} 10 分鐘，每 1–2 h 測 Na。有症狀：${B('100 mL')} 10 分鐘，症狀持續可重複，30 分鐘內共 3 劑（或 150 mL 20 分鐘 × 2，劑間測 Na）。`]);
    o.push(['慢性嚴重低血鈉（Na <120，輕中度或無症狀）', `${B('15–30 mL/h')} 起始，每 2–6 h 測 Na；或 1 mL/kg（≤100 mL）10 分鐘 Q6H PRN。滲透性脫髓鞘症候群（osmotic demyelination syndrome）高風險者可併用 desmopressin 預防過度矯正。Na 120–129 一般不需 3%。`]);
    o.push(['嚴重症狀（抽搐、昏迷、呼吸停止）或顱內病灶', `${B('100 mL')} 10 分鐘，可重複至 3 劑（30 分鐘內）；或 150 mL 20 分鐘 × 2。`]);
    o.push(['顱內壓升高（TBI 等，off-label）', `連續輸注 ${B('約 30–50 mL/h')} 起始，滴定使血鈉維持 ${B('145–155 mEq/L')}。BTF 指引因證據不足未明確建議。急性 ICP 上升院內多以 bolus 處理（依院內 protocol）。`]);
    o.push(['矯正上限', `任何 24 h 內 Na 上升 ${B('≤8 mEq/L')}；滲透性脫髓鞘症候群（osmotic demyelination syndrome）高風險（酒癮、營養不良、低血鉀、嚴重肝病）更保守。過快以 D5W ± desmopressin 回調。`]);
    return o;
  },
  adj: (P) => [...(P.na != null && P.na >= 145 ? [['i', `血鈉 ${P.na}：非低血鈉；用於 ICP 時目標 145–155。`]] : []), ...(P.hf ? [['w', '心衰竭：容積與鈉負荷。']] : [])],
  prep: '原液使用。', admin: '中央靜脈為佳；無中央導管時 3% 可安全經周邊給予（UpToDate），確認導管位置、避免外滲。', ext: '',
  mon: ['血鈉：bolus 後 1 h 內、之後每 2–6 h', '尿量（自發性水利尿可致過快矯正）', '神經學、容積狀態'], notes: [] },

{ id: 'ins', ecmo: ['i', 'ECMO：可能被 PVC 管路吸附，依血糖滴定。'], g: 'Insulin regular', b: 'Actrapid', spec: '1,000 IU/10 mL/vial', code: 'IHRI10', cls: 'el', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'actrapid ri insulin pump 胰島素 dka 高血糖',
  ci: { u: 'units/h', w: null, lo: 0.5, hi: 15, st: 2, steps: [0.5, 1, 2, 3, 4, 6, 8, 10] },
  preps: [{ l: '100 units + NS 至 100 mL', c: 1, cu: 'units/mL' }],
  dose: (P) => {
    const o = [], g = P.glu, k = P.k, w = P.wt;
    if (g != null) {
      o.push(['ICU 持續高血糖（≥180 mg/dL 兩次）', g >= 180 ? `血糖 ${g}：連續輸注 ${B('1–4 units/h')} 起始，依院內 protocol 滴定（目標多為 140–180）。` : `血糖 ${g}：未達開始條件；避免 <110。`]);
    } else o.push(['ICU 持續高血糖（≥180 mg/dL 兩次）', `連續輸注 ${B('1–4 units/h')} 起始，依院內 protocol 滴定。`]);
    o.push(['DKA', `${k != null && k < 3.5 ? `${B('血鉀 ' + k + ' <3.5：先補鉀，至 ≥3.5 才開始 insulin')}；` : ''}${B('0.1 units/kg/h')}${w ? `（${fx(0.1 * w)} units/h）` : ''}；延遲開始時可先 0.1 units/kg bolus。第一小時血糖降幅 <50–70 mg/dL 則速率加倍。血糖 <250：降至 0.02–0.05 units/kg/h 並加含糖點滴，直到 DKA 緩解。`]);
    o.push(['高血鉀', `${B('10 units IV')} + dextrose（血糖 ≥250 可省略）；低血糖風險（血糖 <140、腎功能不全、低體重）改 ${B('5 units')}${(P.glu != null && P.glu < 140) || (typeof renal(P) === 'number' && renal(P) < 30) || P.rrt !== 'none' || (P.wt && P.wt < 60) ? '（此病人建議 5 units）' : ''}。可每 2–4 h 重複；之後 6 h 每小時測血糖與血鉀。院內 50% glucose 20 mL/amp。`]);
    return o;
  },
  adj: (P) => {
    const a = [];
    if ((P.crcl != null && P.crcl < 30) || P.rrt !== 'none') a.push(['w', '腎功能不全：insulin 清除下降，低血糖風險↑，保守滴定。']);
    if (P.k != null && P.k < 3.5) a.push(['w', `血鉀 ${P.k}：insulin 使鉀移入細胞；DKA 須先補至 ≥3.5。`]);
    a.push(['i', '使用類固醇、腸道或靜脈營養中斷時，須同步調整速率。']);
    return a;
  },
  prep: '以 NS 稀釋至 0.1–1 unit/mL，常用 100 units/100 mL（1 unit/mL）；管路先以藥液 prime（吸附）。', admin: '輸注幫浦；high-alert，雙人核對。', ext: '',
  mon: ['血糖 Q1H（穩定後 Q2H）', '血鉀', '低血糖處置流程'], notes: [] },

/* ============================ 反轉劑 ============================ */
{ id: 'prot', g: 'Protamine sulfate', b: 'Protamine', spec: '50 mg/5 mL/amp', code: 'IPROT5', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'heparin reversal 反轉',
  calc: 'prot',
  dose: () => [
    ['反轉 heparin', `${B('1 mg 中和約 100 units heparin')}；連續輸注者以前 2–3 h 的量計算（例：1,250 units/h → 約 30 mg）；bolus 已過 2 h 給一半。單次上限 50 mg。aPTT 仍高可再 0.5 mg/100 units。未出血者可考慮不給。心臟手術可用較低比例。`],
    ['反轉 enoxaparin', '≤8 h：1 mg／每 1 mg；8–12 h：0.5 mg／每 1 mg；≥12 h 多不需要。必要時再 0.5 mg/mg。'],
  ],
  adj: () => [['w', '過敏／類過敏高風險：魚類過敏、曾用含 protamine 之 insulin（NPH）、輸精管結紮。可致低血壓、肺高壓、支氣管痙攣。'], ['i', '過量本身具抗凝作用，勿超量。']],
  prep: '原液或稀釋於 NS／D5W。', admin: `慢推 ${'≤5 mg/min'}（50 mg 至少 10 分鐘）。`, ext: '',
  mon: ['aPTT（給藥後 5–15 分鐘）、anti-Xa', '血壓、SpO₂'], notes: [] },

{ id: 'flum', g: 'Flumazenil', b: 'Anexate', spec: '0.5 mg/5 mL/amp', code: 'IFLUM5', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'anexate bzd reversal 反轉',
  dose: () => [
    ['反轉程序鎮靜', `${B('0.2 mg IV')} 2 分鐘；1 分鐘後未達目標每分鐘再 0.2 mg（最多 4 次），常用累計 0.6–1 mg，上限 1 mg。再鎮靜：0.2–1 mg（0.1 mg/min）每 20 分鐘，1 h 內上限 3 mg。`],
    ['BZD 過量', '常規使用有爭議（多數支持療法即可）；0.2 mg 2 分鐘 → 0.3 mg 3 分鐘 → 0.5 mg 5 分鐘。建議諮詢毒物中心。'],
  ],
  adj: (P) => {
    const a = [['d', '避免：長期使用 BZD（誘發戒斷與癲癇）、癲癇控制依賴 BZD、TCA 或不明混合中毒。'], ['w', '半衰期約 1 h，短於多數 BZD → 可能再鎮靜，觀察至少 2 h。']];
    if (P.child) a.push(['w', '肝功能不全：首劑不調整；重複給藥減量或拉長間隔。']);
    return a;
  },
  prep: '原液。', admin: '大靜脈推注以減少注射痛。', ext: '',
  mon: ['意識、呼吸', '癲癇、戒斷症狀'], notes: [] },

/* ============================ 新增（2026-11-13） ============================ */
{ id: 'aden', g: 'Adenosine', b: 'Adenocor', spec: '6 mg/2 mL/vial', code: 'IADEN3', cls: 'aa', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'adenocor psvt 腺苷',
  dose: (P) => [
    ['PSVT（迷走神經刺激無效或血行動力不穩）', `${B('6 mg')} 1–2 秒快速推注，立即以 NS 20 mL 沖管；1–2 分鐘無效給 ${B('12 mg')}；仍無效可再 12 或 18 mg。復發可重複最後有效劑量（共 3 劑）。${P.cvc ? '經中央導管給藥：起始減為 3 mg，之後 6 mg。' : ''}`],
  ],
  adj: () => [['d', '禁忌：具逆向傳導副傳導路徑（WPW 合併 Afib）、二至三度阻滯／病竇（無節律器）。'], ['w', 'Dipyridamole 增強作用；theophylline、caffeine 減弱作用。備妥同步整流電擊。'], ['i', '腎、肝功能：不需調整。']],
  prep: '原液，不稀釋。', admin: '周邊靠近軀幹之靜脈（避免手、前臂遠端、下肢）；以三通連接藥物與 20 mL NS 兩支針筒，推藥後立即沖管。', ext: '',
  mon: ['連續 ECG（記錄轉律過程）、血壓', '短暫胸悶、潮紅、支氣管痙攣'], notes: [] },

{ id: 'dig', g: 'Digoxin', b: 'Lanoxin', spec: '0.5 mg/2 mL/amp', code: 'IDIGO5', cls: 'aa', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'lanoxin 毛地黃 af 心跳控制',
  dose: (P) => {
    const c = renal(P), low = (typeof c === 'number' && c <= 15) || P.rrt !== 'none';
    return [
      ['Afib／atrial flutter 心跳控制（替代藥物）', `Loading（total digitalizing dose）：${B('0.25–0.5 mg IV')} 一次，之後 0.25 mg Q6H，24 h 上限 1.5 mg；或 8–12 mcg/kg（lean body weight），先給 50%，餘 25% × 2 間隔 4–8 h。${low ? `${B('CrCl ≤15／透析：total digitalizing dose 給 50%')}。` : ''}高腎上腺素狀態效果差。`],
      ['維持', `0.0625–0.25 mg QD${typeof c === 'number' ? (c >= 60 ? '' : c >= 45 ? '（CrCl 45–60：0.0625–0.125 mg QD）' : c >= 30 ? '（CrCl 30–45：0.0625 mg QD）' : '（CrCl <30：0.0625 mg QOD 或考慮他藥）') : ''}。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.rrt === 'HD' || P.rrt === 'PD') a.push(['d', `${P.rrt}：不可透析；末期腎病使用與死亡率上升相關，儘量避免。`]);
    if (P.k != null && P.k < 3.5) a.push(['w', `血鉀 ${P.k}：低血鉀增加毛地黃毒性，先矯正。`]);
    if (P.mg != null && P.mg < 1.6) a.push(['w', '低血鎂增加毒性。']);
    a.push(['d', '禁忌：副傳導路徑合併 Afib（預激症候群）。'], ['w', '交互作用：amiodarone（digoxin 減半）、verapamil、diltiazem、macrolide。']);
    return a;
  },
  prep: '原液或稀釋。', admin: 'IV 推注 ≥5 分鐘；避免 IM（劇痛）。', ext: '',
  mon: ['心跳、ECG', 'Digoxin 濃度（給藥後 ≥6 h）', 'SCr、K、Mg、Ca'], notes: ['院內有 0.25 mg 錠劑與 0.05 mg/mL 口服液。'] },

{ id: 'uk', g: 'Urokinase', b: 'Urokinase', spec: '60,000 IU/vial', code: 'IUROK6', cls: 'ac', utd: 'NA', src: '仿單（UpToDate 未收載）',
  route: 'int', line: 'P', ves: '', kw: 'uk 血栓溶解 胸管 empyema 導管阻塞',
  dose: (P) => [
    ['肺栓塞（美國舊仿單 Kinlytic）', `Loading ${B('4,400 IU/kg')} 10 分鐘${P.wt ? `（${fx(rnd(4400 * P.wt, 1000), 0)} IU）` : ''}，之後 4,400 IU/kg/h × 12 h${P.wt ? `（${fx(rnd(4400 * P.wt, 1000), 0)} IU/h）` : ''}；院內 60,000 IU/vial，需多瓶。現多以 alteplase 取代。`],
    ['導管阻塞', '5,000 IU/mL 注入導管腔，停留後回抽（依院內流程）。'],
    ['胸腔內（膿胸／複雜性肋膜積液，off-label）', '依院內流程（文獻常見 100,000 IU 稀釋於 NS 後胸管注入、夾管 2–4 h，每日一次 × 3 天）。'],
  ],
  adj: (P) => [['w', '全身性溶栓禁忌同 alteplase（近期出血、中風、手術、未控制高血壓）。'], ...(P.plt != null && P.plt < 100 ? [['w', `血小板 ${P.plt}×10³/µL：出血風險。`]] : [])],
  prep: '以 NS 或 SWFI 溶解後再稀釋；溶解後儘速使用，勿劇烈搖晃。', admin: '全身性給藥建議獨立管路。', ext: '',
  mon: ['出血、穿刺部位', 'Fibrinogen、aPTT、CBC'], notes: ['院內品項規格與適應症請依仿單確認。'] },

{ id: 'mann', g: 'Mannitol 20%', b: 'Mannitol', spec: '20% 100 mL/bag（20 g）', code: 'BMANN1', cls: 'icp', utd: '2026-11-13',
  route: 'int', line: 'P', ves: 'V', kw: '甘露醇 降腦壓 icp 顱內壓',
  dose: (P) => {
    const w = P.wt;
    return [
      ['顱內壓升高（腦水腫、TBI、ICH、AIS、肝性腦病、腦疝）', `20% 溶液 ${B('0.5–2 g/kg')} 一次${w ? `（${r0(0.5 * w)}–${r0(2 * w)} g ＝ ${r0(2.5 * w)}–${r0(10 * w)} mL）` : ''}，10–30 分鐘（腦疝高風險約 10 分鐘）；之後依反應 0.25–1 g/kg Q4–6H${w ? `（${r0(0.25 * w)}–${r0(w)} g）` : ''}。`],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if ((typeof c === 'number' && c < 30) || P.rrt === 'HD' || P.rrt === 'PD') a.push(['d', '嚴重腎功能不全：禁用（無尿者無法排出，致容積過量與高滲）。']);
    else if (typeof c === 'number' && c < 60) a.push(['w', '腎功能不全：謹慎使用，監測 osmolar gap 與腎功能。']);
    if (P.hf) a.push(['w', '心衰竭／肺水腫：初期擴張血管內容積，可能誘發肺水腫。']);
    if (P.na != null && P.na > 155) a.push(['w', `血鈉 ${P.na}：高滲狀態，評估是否繼續。`]);
    return a;
  },
  prep: '原液使用；檢查有無結晶（有則加溫溶解）。25% 不可放 PVC 袋。', admin: '建議使用 ≤5 µm 線上過濾器；不可與血品同時輸注。>5% 為 vesicant，注意外滲。', ext: '',
  mon: ['腎功能、尿量、容積狀態', '電解質、實測血清滲透壓與 osmolar gap（NCS 以 osmolar gap 評估累積；部分建議 Osm <320）', '血糖、酸鹼'], notes: ['停藥需逐步減量，避免反彈性顱內壓上升（院內講義）。'] },

{ id: 'glyc', g: 'Glycerol 10%（Glycetose）', b: 'Glycetose', spec: '300 mL/bot', code: 'BGLYC3', cls: 'icp', utd: 'NA', src: '仿單（美國無此劑型）',
  route: 'int', line: 'P', ves: '', kw: 'glycerin glyceol 甘油 降腦壓',
  dose: () => [
    ['顱內壓升高、腦水腫', `常用 ${B('200–500 mL')}，每次 2–3 h 輸注，每日 1–2 次（依仿單；院內品項 300 mL/bot）。降腦壓作用較 mannitol 溫和、反彈較少。`],
  ],
  adj: (P) => [['w', '輸注過快可致溶血、血紅素尿。'], ['d', '遺傳性果糖不耐症禁用（含果糖者）。'], ['i', '含鈉，注意鈉負荷與心衰竭；血糖上升。'], ...(P.hf ? [['w', '心衰竭：容積負荷。']] : [])],
  prep: '原液使用。', admin: '周邊可；控制速率。', ext: '',
  mon: ['血鈉、血糖、血清滲透壓', '尿色（溶血）', '神經學評估'], notes: ['院內品項成分請依仿單確認。'] },

{ id: 'dexa', g: 'Dexamethasone', b: 'Dexamethasone', spec: '5 mg/mL/amp', code: 'IDEXA5', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: '類固醇 腦水腫 meningitis',
  dose: (P) => [
    ['腦瘤相關血管性水腫', `即將腦疝或中重度症狀：${B('10 mg IV')} → ${B('16–40 mg/day')} 分 2–4 次。對 TBI、ICH 之細胞毒性水腫無效，不建議。`],
    ['腫瘤性硬脊膜外脊髓壓迫', '10–16 mg IV → 16 mg/day 分次；確定治療開始後 1–2 週減量。'],
    ['細菌性腦膜炎（輔助）', `${B('0.4 mg/kg Q12H × 4 天')}${P.wt ? `（${fx(0.4 * P.wt)} mg）` : ''}，於第一劑抗生素前或同時。`],
    ['COVID-19 需氧氣', '6 mg QD 最多 10 天。'],
  ],
  adj: () => [['i', '腎、肝功能：不需調整。'], ['w', '強效 CYP3A4 誘導；高血糖、消化道出血、感染、譫妄。']],
  prep: '原液推注或稀釋於 NS／D5W。', admin: '周邊可；大劑量緩慢給予。', ext: '',
  mon: ['血糖', '血壓', '感染、消化道出血', '神經學'], notes: ['與 midazolam、rocuronium 不相容。'] },

{ id: 'mpred', g: 'Methylprednisolone', b: 'Medason／Solu-Medrol', spec: '40 mg/vial；500 mg/vial', code: 'IMETH4／IMETY5', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'solu-medrol medason 類固醇 ards pulse',
  dose: (P) => {
    const w = P.wt;
    return [
      ['早期 ARDS（發病 72 h 內）', `Loading ${B('1 mg/kg')} 30 分鐘${w ? `（${r0(w)} mg）` : ''} → 1 mg/kg/day（第 1–14 天）→ 0.5（15–21）→ 0.25（22–25）→ 0.125 mg/kg/day（26–28）；拔管則跳至第 15 天。發病 >2 週才開始可能有害。`],
      ['未緩解 ARDS（發病第 7 天）', `Loading 2 mg/kg${w ? `（${r0(2 * w)} mg）` : ''} → 2 mg/kg/day（1–14）→ 1（15–21）→ 0.5（22–28）→ 0.25（29–30）→ 0.125（31–32）。`],
      ['氣喘急性惡化', '40–60 mg/day 分 1–2 次，5–7 天。'],
      ['Pulse therapy', '500 mg–1 g（7–15 mg/kg）QD × 3–5 天（自體免疫等）。'],
    ];
  },
  adj: () => [['i', '腎、肝功能：不需調整。'], ['w', '高血糖、感染、ICU-acquired weakness（尤其併用 NMBA）。']],
  prep: '以附帶稀釋液溶解；大劑量稀釋於 NS／D5W。', admin: '≤250 mg 推注 ≥5 分鐘；>250 mg 輸注 30–60 分鐘（快速大劑量曾致低血壓、心律不整、心跳停止）。', ext: '',
  mon: ['血糖', '血壓、心律（大劑量）', '感染、消化道出血'], notes: ['與 propofol 不相容。'] },

{ id: 'bume', g: 'Bumetanide', b: 'Busix', spec: '2 mg/4 mL/amp（0.5 mg/mL）', code: 'IBUME2', cls: 'oth', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'busix burinex loop 利尿 adhf',
  ci: { u: 'mg/h', w: null, lo: 0.5, hi: 2, st: 0.5, steps: [0.5, 1, 1.5, 2] },
  preps: [{ l: '原液 0.5 mg/mL（syringe pump）', c: 0.5, cu: 'mg/mL' }],
  dose: () => [
    ['水腫／容積過量（未用過 loop）', `${B('0.5–1 mg IV')}，無效則劑量加倍（不是更頻繁），直到利尿。IV 與口服等劑量。`],
    ['急性失代償（已服口服 loop）', `IV 給予每日口服總量的 ${B('1–2.5 倍')}；單次最大有效劑量 3–10 mg（依腎功能）。1 mg bumetanide ≈ 40 mg furosemide。`],
    ['連續輸注', `有效 bolus 後立即 ${B('0.5 mg/h')}；反應不足再 bolus 並增至 1 mg/h，最高 2 mg/h（更高不建議）。`],
  ],
  adj: (P) => [['i', '腎功能不全：需較高單次劑量才達利尿閾值（最大有效 3–10 mg）。'], ...(P.k != null && P.k < 3.5 ? [['w', `血鉀 ${P.k}：利尿會加重低血鉀。`]] : []), ['w', '耳毒性（高劑量、快速）；磺胺過敏交叉反應低。']],
  prep: '原液。', admin: 'IV 推注 0.5–1 mg 於 1–2 分鐘。', ext: '',
  mon: ['尿量、體重、I/O', '電解質（K、Mg、Na）', '腎功能'], notes: ['與 milrinone 不相容。'] },

{ id: 'txa', g: 'Tranexamic acid', b: 'Transamin', spec: '250 mg/5 mL/amp', code: 'ITRAN2', cls: 'hem', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'transamin txa 止血 trauma',
  dose: (P) => {
    const c = P.scr, rrt = P.rrt !== 'none';
    let rf = '';
    if (rrt) rf = '透析／CRRT：依 SCr ≥5.7 原則 Q48H 或 50% QD';
    else if (c != null) rf = c < 1.4 ? '' : c < 2.8 ? `SCr ${c}：改 BID` : c < 5.7 ? `SCr ${c}：改 QD` : `SCr ${c}：Q48H 或 50% QD`;
    return [
      ['外傷出血／中度 TBI（GCS 9–12）', `受傷 3 h 內 ${B('1 g IV')} 10 分鐘，之後 ${B('1 g 於 8 h')} 連續輸注（院內 250 mg/amp × 4）。嚴重 TBI（GCS 3–8）可能無效益。`],
      ['間歇給藥（其他出血）', `10 mg/kg 或 1 g TID–QID${rf ? `；${B(rf)}` : ''}。`],
    ];
  },
  adj: () => [['w', '血栓風險（近期血栓、DIC 血栓期慎用）；高劑量可致癲癇。']],
  prep: 'Loading 1 g 加入 100 mL NS；維持 1 g 加入 NS 250–500 mL 8 h。', admin: '推注速率 ≤100 mg/min（仿單）；周邊可。', ext: '',
  mon: ['出血', '血栓徵象', '癲癇'], notes: [] },

{ id: 'ddavp', g: 'Desmopressin', b: 'Minirin (DDAVP)', spec: '4 mcg/mL/amp', code: 'IDESM4', cls: 'hem', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'minirin ddavp 尿崩 avp-d 尿毒出血',
  dose: (P) => {
    const w = P.wt, d = w ? Math.min(r1(0.3 * w), 40) : null, d2 = w ? Math.min(r1(0.4 * w), 40) : null;
    return [
      ['中樞性尿崩（arginine vasopressin deficiency）', `${B('1 mcg IV/SC Q12H')}，依尿量、血鈉調整（可 Q6–8H、增至 2 mcg）；用最低有效劑量避免低血鈉。經蝶竇術後可能自行緩解或轉 SIADH。`],
      ['尿毒性出血／侵入性處置前', `${B('0.3–0.4 mcg/kg')}${d ? `（${d}–${d2} mcg）` : ''} IV 一次（處置前 30–60 分鐘），未見 >40 mcg；第二劑後易耐受性下降。`],
      ['抗血小板藥相關顱內出血（替代）', '0.4 mcg/kg 30 分鐘（上限約 40 mcg）。'],
      ['預防低血鈉矯正過快（併 3% NaCl）', '1–2 mcg Q6–8H，上限 4 mcg Q6–8H，同時限水；需有經驗者處置。'],
    ];
  },
  adj: (P) => {
    const a = [], c = renal(P);
    if ((typeof c === 'number' && c < 50) || P.rrt !== 'none') a.push(['w', '腎功能不全（CrCl <50）：部分仿單禁用（半衰期延長、低血鈉）；出血適應症短期使用不需調整。']);
    if (P.na != null && P.na < 135) a.push(['w', `血鈉 ${P.na}：低血鈉風險，限水並密切監測。`]);
    return a;
  },
  prep: '出血適應症：稀釋於 50 mL NS，30 分鐘輸注。', admin: '周邊可。', ext: '',
  mon: ['血鈉（每 4–6 h 起）、尿量、尿比重', '血壓、心跳'], notes: [] },

{ id: 'soma', g: 'Somatostatin', b: 'Stilamin', spec: '3 mg/amp', code: 'ISOMA3', cls: 'hem', utd: '2026-11-13', src: 'UpToDate 主題文章（無藥物專論）＋仿單',
  route: 'ci', line: 'P', ves: '', kw: 'stilamin 食道靜脈曲張 variceal ugib',
  ci: { u: 'mcg/h', w: null, lo: 250, hi: 500, st: 250, steps: [250, 350, 500] },
  preps: [{ l: '3 mg + NS 至 48 mL（syringe pump，12 h）', c: 62.5, cu: 'mcg/mL' }],
  dose: () => [
    ['急性食道靜脈曲張出血', `${B('250 mcg IV bolus')} 3–5 分鐘，之後 ${B('250 mcg/h')}（約 3.5 mcg/kg/h）連續輸注 2–5 天；持續出血可再 bolus 或提高至 500 mcg/h（依仿單與院內流程）。合併內視鏡治療與預防性抗生素。`],
    ['消化性潰瘍出血（輔助，內視鏡前或內視鏡無法施行時）', `${B('250 mcg bolus → 250 mcg/h')} × 3–7 天（UpToDate 主題文章）。`],
    ['參考（UpToDate）', 'UpToDate 以 octreotide 50 mcg bolus → 50 mcg/h 為例；院內 IV octreotide 短效劑型未見，以 somatostatin 為主。'],
  ],
  adj: () => [['i', '半衰期 1–3 分鐘：輸注中斷超過數分鐘需重給 bolus。'], ['w', '高血糖或低血糖、心搏過緩、噁心腹痛。']],
  prep: '以 NS 溶解稀釋；24 h 內使用。', admin: '周邊可；連續輸注勿中斷。', ext: '',
  mon: ['血糖', '心跳', '出血（Hb、血便）'], notes: ['院內品項規格請依仿單確認。'] },

/* ============================ 類固醇／PPI／PGE1 ============================ */
/* ============================ 新增（2026-11-13 第二批，待核對） ============================ */
{ id: 'etom', g: 'Etomidate', b: 'Etomidate', spec: '20 mg/10 mL/amp', code: 'IETOM2', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'amidate 插管 誘導 rapid sequence intubation',
  dose: (P) => { const { w, lab } = dw(P, 'B40'); return [
    ['快速插管誘導（rapid sequence intubation，手術室外）', `${B('0.3 mg/kg IV')}${w ? `（${lab}：${fx(0.3 * w, 0)} mg）` : ''}；常用範圍 0.2–0.3 mg/kg。無止痛作用。`],
  ]; },
  adj: (P) => [['w', '單劑即可短暫抑制腎上腺皮質（11β-hydroxylase）；敗血症病人須權衡，不用於連續輸注。'], ['i', '腎功能不全：仿單無調整，但毒性風險較高，謹慎使用。肝功能不全：無調整。'], ['i', '常見注射痛、肌躍（myoclonus）。'], ...(P.obese ? [['i', 'BMI 30–39 以實際體重、BMI ≥40 以 AdjBW 計算。']] : [])],
  prep: '原液。', admin: '大靜脈推注 30–60 秒。', ext: '',
  mon: ['血壓、SpO₂', '插管後鎮靜銜接'], notes: [] },

{ id: 'sux', g: 'Succinylcholine', b: 'Relaxin', spec: '500 mg/vial', code: 'ISUCC5', cls: 'nmb', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'suxamethonium 去極化 nmba 插管',
  dose: (P) => { const w = P.wt; return [
    ['快速插管（rapid sequence intubation，off-label 劑量）', `${B('1–1.5 mg/kg IV')}${w ? `（實際體重：${r0(w)}–${r0(1.5 * w)} mg）` : ''}；30–60 秒起效，作用 5–10 分鐘。`],
    ['一般插管', '0.6 mg/kg IV（0.3–1.1）。IM 最多 3–4 mg/kg，總量 ≤150 mg。'],
  ]; },
  adj: (P) => { const a = [['d', '禁忌：高血鉀風險（燒傷、擠壓傷、去神經病變、長期臥床／ICU 獲得性肌無力 >48–72 h、神經肌肉疾病）、惡性高熱病史或家族史。']];
    if (P.k != null && P.k >= 5) a.push(['d', `血鉀 ${P.k}：可再升高約 0.5 mmol/L，避免使用，改 rocuronium。`]);
    a.push(['w', '心搏過緩（重複給藥；可先給 atropine）、眼壓／顱內壓暫時上升；假性膽鹼酯酶缺乏者作用延長。'], ['i', '腎、肝功能不全：不需調整。']);
    if (P.obese) a.push(['i', '肥胖：以實際體重計算；BMI >60 可考慮 AdjBW（插管條件可能較差）。']); return a; },
  prep: '以 NS 或 SWFI 溶解（依仿單濃度）。', admin: 'IV 快速推注。', ext: '',
  mon: ['血鉀、心律', '體溫（惡性高熱）', '自主呼吸恢復'], notes: ['惡性高熱需 dantrolene（院內品項與存放位置請確認）。'] },

{ id: 'diaz', g: 'Diazepam', b: 'Dupin', spec: '10 mg/2 mL/amp', code: 'IDIAZ1', cls: 'sed', cls2: 'aed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: 'I', kw: 'valium bzd 癲癇 酒精戒斷',
  dose: () => [
    ['癲癇重積（替代藥物）', `${B('5–10 mg IV')} 單劑，速率 ≤5 mg/min；癲癇持續可每 3–5 分鐘重複。之後須接非 benzodiazepine 抗癲癇藥。`],
    ['急性發作（非癲癇重積）', '5–10 mg IV（≤5 mg/min），3–5 分鐘可重複，總量上限 30 mg。'],
    ['酒精戒斷', 'Symptom-triggered：5–10 mg IV PRN（依 CIWA-Ar）；嚴重戒斷 5–10 mg IV 每 5–10 分鐘至血行動力穩定、適當鎮靜。'],
  ],
  adj: (P) => [['i', '腎功能不全（含 HD、PD、CRRT）：不需調整；長療程謹慎。低白蛋白者中樞副作用增加。'], ...(P.child ? [['w', `肝功能不全（Child-Pugh ${P.child}）：分布體積與半衰期增加、清除顯著下降，謹慎使用。`]] : []), ['w', '含 propylene glycol；活性代謝物長效累積，高齡易過度鎮靜。']],
  prep: '不要稀釋，也不要與其他溶液或藥物混合（易沉澱），原液緩慢推注。', admin: 'IV 緩慢推注 ≤5 mg/min；避開手背、手腕小靜脈；推注過快可致呼吸抑制、低血壓。', ext: '',
  mon: ['呼吸、血壓、意識'], notes: ['與多數藥物不相容，獨立管路推注後沖管。'] },

{ id: 'halo', g: 'Haloperidol', b: 'Haldol', spec: '5 mg/mL/amp（lactate）', code: 'IHALO5', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'haldol 譫妄 躁動 delirium agitation',
  dose: (P) => { const f = P.child === 'C' ? '（Child-Pugh C：起始 ≤25%）' : P.child ? '（Child-Pugh A/B：起始 ≤50%）' : ''; return [
    ['ICU 過動型譫妄（off-label；IV 為 off-label 途徑）', `依躁動程度：輕 ${B('0.5–2.5 mg')}、中 2–5 mg、重 10–20 mg IV/IM；效果不足每 15–30 分鐘重複或加量至安靜，之後以達安靜總量約 25% 每 6–12 小時 PRN 維持${f}。先處理非藥物措施與病因，每日評估是否停藥。`],
    ['頑固性症狀連續輸注', '可選 loading 2.5 mg，之後 0.5–2 mg/h。'],
    ['非 ICU', '0.5–1 mg，必要時每 30 分鐘重複，每日上限 5 mg。'],
  ]; },
  adj: (P) => [['w', 'QTc：IV 單劑 >2 mg 呈劑量相關延長。基準 QTc >450 ms 或有 QT 風險因子時避免 IV 單劑 ≥2 mg；給藥中與給藥後 2–3 h 心電監測。QTc >500 ms 或上升 ≥60 ms：改途徑、換藥或降劑量。'], ['i', '腎功能不全（含 HD、PD）：不需調整。'], ...(P.child ? [['w', `肝硬化 Child-Pugh ${P.child}：起始給 ${P.child === 'C' ? '≤25%' : '≤50%'} 建議劑量，再依反應調整。`]] : []), ['d', '避免：Parkinson disease、Lewy body dementia、抗膽鹼藥物中毒。'], ['w', '錐體外症候群、neuroleptic malignant syndrome。']],
  prep: '原液。', admin: 'IV 緩慢推注（僅 lactate 劑型可 IV；decanoate 不可 IV）。', ext: '',
  mon: ['QTc、ECG（心電監測）', 'RASS、CAM-ICU', 'EPS'], notes: [] },

{ id: 'pare', g: 'Parecoxib', b: 'Dynastat', spec: '40 mg/vial', code: 'IPARE4', cls: 'sed', utd: '2026-11-13', src: 'UpToDate International（concise）＋仿單',
  route: 'int', line: 'P', ves: '', kw: 'dynastat cox-2 nsaid 止痛',
  dose: (P) => { const low = P.age >= 65 || (P.wt && P.wt < 50); return [
    ['術後疼痛', `${B(low ? '20 mg IV' : '40 mg IV')}，之後 ${low ? '20 mg Q12H' : '20–40 mg Q6–12H'} PRN，每日上限 ${B(low ? '40 mg' : '80 mg')}${low ? '（≥65 歲或 <50 kg，依仿單）' : ''}；短期使用。`],
  ]; },
  adj: (P) => { const a = [['d', '禁忌：CABG 術後疼痛、缺血性心臟病／腦血管疾病、中重度心衰竭、活動性消化性潰瘍或出血、磺胺過敏。']]; const c = renal(P);
    if ((typeof c === 'number' && c < 30) || P.rrt !== 'none') a.push(['d', '嚴重腎功能不全或透析：避免（NSAID 腎毒性）。']);
    if (P.child === 'B') a.push(['w', 'Child-Pugh B：劑量減半，每日上限 40 mg。']); if (P.child === 'C') a.push(['d', 'Child-Pugh C：禁用。']);
    if (P.hf) a.push(['d', '心衰竭：禁用。']); a.push(['i', 'UpToDate 僅有國際版簡要資料；腎、肝與高齡調整依仿單。']); return a; },
  prep: '以 2 mL NS 溶解。', admin: 'IV 推注或 IM。', ext: '',
  mon: ['腎功能、尿量', '血壓、心血管事件', '消化道出血'], notes: [] },

{ id: 'apap', g: 'Paracetamol (IV)', b: 'Paracetamol Kabi', spec: '1,000 mg/100 mL/vial', code: 'IPARA0', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'acetaminophen 普拿疼 止痛 退燒',
  dose: (P) => { const w = P.wt; const cap = P.child === 'C' ? 2 : P.child === 'B' ? 3 : 4; return [
    ['止痛／退燒', w && w < 50 ? `${B('15 mg/kg IV Q6H')}（${r0(Math.min(15 * w, 750))} mg ＝ ${fx(Math.min(15 * w, 750) / 10, 1)} mL；單劑 ≤750 mg）或 12.5 mg/kg Q4H；每日上限 75 mg/kg（${r0(Math.min(75 * w, 3750))} mg）。` : `${B('1,000 mg IV Q6H')}（或 650 mg Q4H），單劑 ≤1 g，每日上限 ${B(cap + ' g')}${P.child ? `（Child-Pugh ${P.child}）` : ''}。`],
    ['較低劑量族群', '慢性酒癮、營養不良、脫水：不論體重皆用 <50 kg 劑量。'],
  ]; },
  adj: (P) => { const a = [], c = renal(P);
    if ((typeof c === 'number' && c <= 30) || P.rrt !== 'none') a.push(['i', '腎功能不全（含 HD、PD、CRRT）：多不需調整；仿單提及 CrCl ≤30 可延長間隔、降低每日總量。']);
    if (P.child === 'A') a.push(['i', 'Child-Pugh A：未飲酒者短期（≤14 天）上限 4 g、長期 3 g；仍在飲酒者 2 g。']);
    if (P.child === 'B') a.push(['w', 'Child-Pugh B：未飲酒者短期上限 3 g、長期 2 g；仍在飲酒者 2 g；用最低有效劑量。']);
    if (P.child === 'C') a.push(['d', 'Child-Pugh C：一般不建議 IV；必要時以 PRN（非定時）給予，每日 ≤2 g。']);
    a.push(['i', '注意含 acetaminophen 之口服複方重複（每日上限為所有來源合計）。']); return a; },
  prep: '原液使用。', admin: '15 分鐘輸注。', ext: '',
  mon: ['肝功能（高劑量、長期）', '體溫、疼痛評估'], notes: [] },

{ id: 'keto', g: 'Ketorolac', b: 'Keto', spec: '30 mg/mL/amp', code: 'IKETO3', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'toradol nsaid 止痛',
  dose: (P) => { const c = renal(P), low = P.age >= 65 || (P.wt && P.wt < 50), mid = typeof c === 'number' && c > 30 && c < 60; return [
    ['中重度急性疼痛', mid ? `腎功能 30–60：優先改用非 NSAID；必要時 ${B('7.5–15 mg IV Q6H')}，最低有效劑量、最短療程。` : `${B(low ? '15 mg IV Q6H PRN' : '15–30 mg IV Q6H PRN')}（或單劑 ${low ? '15' : '30'} mg），每日上限 ${B(low ? '60 mg' : '120 mg')}${low ? '（≥65 歲或 <50 kg）' : ''}；IV／IM／口服合計 ≤5 天。`],
  ]; },
  adj: (P) => { const a = [['d', '禁忌：活動性消化道出血或潰瘍、出血風險高、CABG 圍術期、晚期腎病或腎衰竭風險、同時使用其他 NSAID。']]; const c = renal(P);
    if ((typeof c === 'number' && c <= 30) || P.rrt !== 'none') a.push(['d', '腎功能 ≤30 或透析：避免。']);
    else if (typeof c === 'number' && c < 60) a.push(['w', `CrCl ${r0(c)}：AKI 高風險（容積不足、低血壓、高齡、併用腎毒性藥）者避免。`]);
    if (P.plt != null && P.plt < 100) a.push(['w', `血小板 ${P.plt}×10³/µL：出血風險。`]);
    a.push(['i', '消化道出血風險者（雙重抗血小板、抗凝、≥60 歲）考慮併用 PPI。']); return a; },
  prep: '原液。', admin: 'IV 推注 ≥15 秒。', ext: '',
  mon: ['腎功能、尿量', '消化道出血', '出血'], notes: [] },

{ id: 'tram', g: 'Tramadol', b: 'Tramadol', spec: '100 mg/2 mL/amp', code: 'ITRAM1', cls: 'sed', utd: '2026-11-13', src: 'UpToDate（美國僅口服）＋仿單 IV 劑量',
  route: 'int', line: 'P', ves: '', kw: 'tramal 止痛 opioid',
  dose: (P) => { const c = renal(P), ren = (typeof c === 'number' && c < 30) || P.rrt !== 'none'; return [
    ['中重度疼痛', P.child === 'C' ? `${B('Child-Pugh C：不建議使用')}。` : ren ? `${B('50–100 mg IV Q12H')}，每日上限 200 mg（CrCl <30）${P.rrt === 'HD' ? '；HD 由較低劑量起始（例如 25 mg BID）' : ''}。` : P.child === 'B' ? `${B('25 mg Q8–12H')} 起始，每日上限 100 mg（Child-Pugh B）。` : P.child === 'A' ? `${B('50 mg Q8H')} 起始，可至 Q6H，每日上限 200 mg（Child-Pugh A）。` : `${B('50–100 mg IV Q4–6H')}，每日上限 400 mg（仿單）。`],
  ]; },
  adj: () => [['w', '降低癲癇閾值；serotonin syndrome（SSRI、SNRI、linezolid）；CYP2D6 抑制劑降低療效。'], ['i', 'UpToDate 美國版僅有口服劑型，IV 劑量依仿單；腎、肝調整依 UpToDate 口服建議。Naloxone 只能部分反轉。']],
  prep: '稀釋於 NS 或 D5W 100 mL。', admin: '緩慢 IV（≥2–3 分鐘）或 15–30 分鐘輸注。', ext: '',
  mon: ['疼痛、意識、呼吸', '癲癇'], notes: [] },

{ id: 'nalb', g: 'Nalbuphine', b: 'Bain', spec: '10 mg/mL/amp', code: 'INALB1', cls: 'sed', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'nubain κ agonist 止痛 搔癢',
  dose: (P) => [
    ['疼痛', `${B('10 mg IV/IM/SC Q3–6H PRN')}（以 70 kg 計${P.wt ? `，此病人約 ${fx(10 * P.wt / 70, 1)} mg` : ''}）；opioid-naive 單劑上限 20 mg、每日 160 mg；具天花板效應。`],
    ['Opioid 引起之搔癢（off-label）', '2–5 mg IV 單劑。'],
  ],
  adj: (P) => [['d', '長期使用 μ-opioid 者（或正在輸注 fentanyl／morphine）：會誘發戒斷、降低止痛效果。'], ...(P.child || (typeof renal(P) === 'number' && renal(P) < 30) || P.rrt !== 'none' ? [['w', '肝、腎功能不全：仿單建議減量，謹慎使用。']] : [])],
  prep: '原液。', admin: 'IV 推注 2–3 分鐘。', ext: '',
  mon: ['疼痛、鎮靜、呼吸'], notes: [] },

{ id: 'nalox', g: 'Naloxone', b: 'Narcan', spec: '0.4 mg/mL/amp', code: 'INALO4', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'narcan opioid reversal 反轉 呼吸抑制',
  dose: () => [
    ['Opioid 過量（危及生命）', `IV 為首選：${B('0.04–2 mg')}，每 2–3 分鐘逐次加量至呼吸恢復；重度（呼吸或心跳停止）用高端，opioid 依賴或疑合併興奮劑用低端以免急性戒斷。之後依 opioid 長短可能需每 20–60 分鐘再給。累計 10 mg 無效應考慮其他原因。`],
    ['連續輸注（長效 opioid、緩釋劑型、體內藏毒）', `每小時給「有效 bolus」的 ${B('2/3')}（常用 0.25–6.25 mg/h）；例：有效 bolus 1.5 mg → 1 mg/h。`],
    ['治療中 opioid 致呼吸抑制（如術後，部分反轉）', `${B('0.05–0.2 mg IV')}，每 2–3 分鐘至通氣與清醒度足夠、又不致劇痛；1–2 小時內可能需重複。`],
  ],
  adj: () => [['w', '半衰期 30–90 分鐘，短於多數 opioid：觀察再鎮靜。'], ['w', '急性戒斷：高血壓、肺水腫、心律不整、躁動。']],
  prep: '原液，或 0.4 mg 稀釋至 10 mL（0.04 mg/mL）便於滴定。', admin: 'IV（亦可 IM、IN）。', ext: '',
  mon: ['呼吸速率、SpO₂、意識', '戒斷症狀、疼痛'], notes: [] },

{ id: 'atro', g: 'Atropine', b: 'Atropine Sulfate', spec: '1 mg/mL/amp', code: 'IATRO1', cls: 'aa', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: '心搏過緩 bradycardia 有機磷',
  dose: (P) => [
    ['症狀性或血行動力不穩之心搏過緩', `${B('1 mg IV')}，每 3–5 分鐘至症狀緩解或心跳穩定，總量上限 3 mg；無效改 dopamine／epinephrine 輸注或 pacing。`],
    ['有機磷／carbamate 中毒（併用 pralidoxime）', `起始：輕度 1–2 mg、中重度 ${B('2–5 mg IV')}；每 3–5 分鐘劑量加倍至肺部症狀改善（分泌物清除、支氣管痙攣解除）。中重度者之後以累計 bolus 總量的 ${B('10–20%／h')} 連續輸注。`],
    ['配合 neostigmine 拮抗肌鬆', `${B('15–20 mcg/kg IV')}${P.wt ? `（${fx(0.015 * P.wt, 1)}–${fx(0.02 * P.wt, 1)} mg）` : ''}，於 neostigmine 之前（心搏過緩時）或同時給予。`],
  ],
  adj: () => [['i', '對二度 II 型、三度房室阻滯常無效；心臟移植（去神經）病人可能無效，甚至矛盾性阻滯或竇停。'], ['w', '缺血性心臟病增加耗氧；抗膽鹼副作用（譫妄、尿滯留、高熱）。']],
  prep: '原液。', admin: 'IV 推注後沖管（亦可 IM、IO）。', ext: '',
  mon: ['心跳、ECG', '有機磷：肺部分泌物、支氣管痙攣', '抗膽鹼副作用（瞳孔、尿滯留、譫妄）'], notes: [] },

{ id: 'neo', g: 'Neostigmine', b: 'Neostigmine methylsulfate', spec: '0.5 mg/mL/amp', code: 'INEOS5', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'nmb reversal 拮抗 腸阻塞 ogilvie',
  dose: (P) => { const w = P.wt, c = renal(P), f = P.rrt !== 'none' || (typeof c === 'number' && c < 10) ? 0.25 : typeof c === 'number' && c <= 50 ? 0.5 : 1; const mg = (k) => w ? `（${fx(Math.min(k * w, 5), 1)} mg）` : ''; return [
    ['拮抗非去極化 NMBA（依手術結束時 train-of-four 個數）', `0 或 1 個：延後至 ≥2 個；2–3 個：${B('0.07 mg/kg')}${mg(0.07)}，拔管前至少等 15–30 分鐘；4 個但有 fade：0.04–0.05 mg/kg${mg(0.05)}；4 個無 fade：0.02 mg/kg${mg(0.02)}。上限 0.07 mg/kg 或 5 mg（取低者）。同時（或先）給 glycopyrrolate 或 atropine。${f < 1 ? ` ${B(`腎功能不全：給一般劑量的 ${f * 100}%`)}。` : ''}`],
    ['急性結腸假性阻塞（Ogilvie，off-label）', `${B('2 mg IV')} 3–5 分鐘；或 2.5 mg 輸注 60 分鐘；或 0.4 mg/h 連續輸注最多 8 h，無效增至 0.8 mg/h 最多 24 h。全程心電監測，床邊備 atropine。`],
  ]; },
  adj: (P) => { const c = renal(P), a = [['w', '心搏過緩、支氣管痙攣、分泌物增加。'], ['d', '機械性腸阻塞或尿路阻塞禁用。'], ['i', '重症肌無力、肌肉失養症等：避免或謹慎（院內總品項未見 sugammadex）。']];
    if (P.rrt !== 'none' || (typeof c === 'number' && c <= 50)) a.push(['w', `腎功能不全：CrCl 10–50 給 50%、<10 給 25%（非仿單建議）。`]); return a; },
  prep: '原液。', admin: 'IV 緩慢推注。', ext: '',
  mon: ['Train-of-four', '心跳、呼吸'], notes: [] },

{ id: 'pcc', g: '4F-PCC (Factor II, VII, IX, X)', b: 'Beriplex P/N', spec: '500 IU/vial', code: 'IBERI5', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'beriplex kcentra 凝血因子 warfarin reversal 抗凝反轉 心臟手術',
  dose: (P) => { const w = P.wt, u = (k, mx) => w ? `（${fx(Math.min(k * w, mx), 0)} IU）` : ''; return [
    ['Warfarin（VKA）相關重大出血或緊急手術（依治療前 INR；劑量以 factor IX 計）', `INR 2–<4：${B('25 IU/kg')}${u(25, 2500)}，上限 2,500；4–6：${B('35 IU/kg')}${u(35, 3500)}，上限 3,500；>6：${B('50 IU/kg')}${u(50, 5000)}，上限 5,000。或固定劑量 1,000–2,000 IU（顱內出血 1,500–2,000）。同時給 vitamin K1 IV；併用時通常不需重複。四捨五入至整瓶 500 IU。`],
    ['直接 factor Xa 抑制劑相關危及生命出血（無 andexanet 時，off-label）', `${B('2,000 IU')} 單次，或 25–50 IU/kg（上限 2,500 或 5,000）。`],
    ['直接凝血酶抑制劑（dabigatran 等）相關出血（無 idarucizumab 時）', `50 IU/kg${u(50, 1e9)}。`],
    ['心臟手術體外循環後凝血異常（off-label）', `${B('15–25 IU/kg')} 單次${u(15, 1e9).replace('）', '')}${w ? `–${fx(25 * w, 0)} IU）` : ''}；或固定 >60 kg 2,000 IU、≤60 kg 1,500 IU，必要時重複一次。外傷凝血異常：25 IU/kg（合併 FFP）。`],
  ]; },
  adj: () => [['w', '血栓風險（近 3 個月血栓、DIC）；含 heparin，HIT 病史禁用。']],
  prep: '以附帶稀釋液溶解（500 IU／20 mL），回室溫，勿搖晃。', admin: `IV 0.12 mL/kg/min（約 3 IU/kg/min），不超過 8.4 mL/min。`, ext: '',
  mon: ['INR（給藥後 30 分鐘）', '出血、血栓'], notes: [] },

{ id: 'vitk', g: 'Vitamin K1 (phytonadione)', b: 'Katimin 1', spec: '10 mg/mL/amp', code: 'IVITK1', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'phytonadione warfarin 反轉 inr',
  dose: () => [
    ['Warfarin 相關重大出血／緊急反轉', `${B('2.5–10 mg IV')} 單劑（依 INR 與出血嚴重度；危及生命者用高端並合併 4F-PCC），10–20 分鐘輸注；6–12 h 後測 INR，必要時再給。IV 約 2 h 開始、24 h 內完全反轉。`],
    ['INR >10、無出血', '停 warfarin，可考慮口服 2.5–5 mg（機械瓣 1–2.5 mg），12–24 h 後複測 INR。非緊急以口服為優先。'],
  ],
  adj: () => [['w', 'IV 可能致類過敏反應：稀釋後以輸注幫浦給予，≤1 mg/min。'], ['i', '>10–15 mg 可造成 warfarin 阻抗 ≥1 週；需持續抗凝者可能須換藥。'], ['i', '避免 SC（吸收不穩）與 IM（血腫）。']],
  prep: '稀釋於至少 50 mL NS 或 D5W。', admin: '輸注幫浦 10–20 分鐘，≤1 mg/min。', ext: '',
  mon: ['INR', '過敏反應'], notes: [] },

{ id: 'famo', g: 'Famotidine', b: 'Famodine', spec: '20 mg/amp', code: 'IFAMO2', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'h2 blocker 壓力性潰瘍 sup',
  dose: (P) => { const c = renal(P), ren = (typeof c === 'number' && c < 50) || P.rrt !== 'none'; return [
    ['重症壓力性潰瘍預防（off-label）', `${B(ren ? '10 mg IV Q12H 或 20 mg QD' : '20 mg IV Q12H')}${ren ? '（CrCl <50：給 50%，或維持 20 mg 但間隔延至 Q36–48H）' : ''}；部分專家偏好 PPI；危險因子解除即停用。`],
  ]; },
  adj: (P) => ((typeof renal(P) === 'number' && renal(P) < 50) || P.rrt !== 'none' ? [['w', '腎功能不全：減量或延長間隔；高齡或腎衰竭易致意識混亂、譫妄、QT 延長。']] : []),
  prep: '稀釋於 NS 或 D5W 至 5–20 mL 推注，或 100 mL 輸注。', admin: 'IV 推注 ≥2 分鐘或 15–30 分鐘輸注。', ext: '',
  mon: ['意識（譫妄）', '腎功能'], notes: [] },

{ id: 'meto', g: 'Metoclopramide', b: 'Imperan', spec: '10 mg/2 mL/amp', code: 'IMETO1', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'primperan prokinetic 胃排空 噁心',
  dose: (P) => { const c = renal(P), f = P.rrt !== 'none' || (typeof c === 'number' && c <= 10) ? '33%' : typeof c === 'number' && c <= 60 ? '50%' : ''; return [
    ['胃排空延遲／管灌不耐（比照 gastroparesis）', `${B('5–10 mg IV')} 每日 3–4 次（餐前），用最低有效劑量；每日上限 40 mg（靜脈給予部分專家 ≤30 mg）${f ? `；${B(`腎功能不全：每日總量約 ${f}`)}` : ''}。`],
    ['放置幽門後餵食管', '10–20 mg IV 單劑，置管前 10–15 分鐘。'],
  ]; },
  adj: () => [['w', '錐體外症候群、遲發性運動障礙（累積劑量；美國仿單限 ≤12 週，EMA 建議 ≤5 天）、QT 延長、癲癇閾值下降。'], ['d', '禁用：機械性腸阻塞、消化道出血或穿孔、pheochromocytoma、癲癇控制不佳。']],
  prep: '≤10 mg 原液推注；>10 mg 稀釋於 50 mL。', admin: 'IV 推注 1–2 分鐘；>10 mg 不可快速推注（易焦躁不安）。', ext: '',
  mon: ['EPS、躁動', 'QTc'], notes: [] },

{ id: 'furo', g: 'Furosemide', b: 'Furosemide', spec: '20 mg/2 mL/amp', code: 'IFURO2', cls: 'oth', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'lasix loop 利尿 adhf',
  ci: { u: 'mg/h', w: null, lo: 5, hi: 40, st: 10, steps: [5, 10, 20, 30, 40] },
  preps: [{ l: '原液 10 mg/mL（syringe pump）', c: 10, cu: 'mg/mL' }, { l: '200 mg（10 amp）+ NS 至 100 mL', c: 2, cu: 'mg/mL' }],
  dose: (P) => { const c = renal(P), low = typeof c === 'number' && c < 30; return [
    ['水腫（未用過 loop）', `${B('20–40 mg IV')}，無效則劑量加倍（不是更頻繁），可每 ≥2 h 調整至利尿。口服生體可用率約 50%；1 mg bumetanide ≈ 40 mg furosemide。`],
    ['急性失代償／頑固水腫（已服口服 loop）', `IV 給予每日口服總量的 ${B('1–2.5 倍')}；單次最大有效劑量 80–200 mg（依腎功能）。`],
    ['連續輸注（bolus 有效後立即接上）', low ? `${B('20 mg/h')} 起始（eGFR <30），反應不足再 bolus 並增至 40 mg/h。` : `${B('5 mg/h')} 起始；反應不足再 bolus 並增至 10 mg/h，依需要最高 40 mg/h。`],
  ]; },
  adj: (P) => [['i', 'eGFR <30：需較高劑量；但單次 >160–200 mg IV 通常不再增加效果。'], ...(P.k != null && P.k < 3.5 ? [['w', `血鉀 ${P.k}：利尿會加重低血鉀。`]] : []), ['w', '耳毒性：推注 20–40 mg/min；≥160 mg 改短時間輸注 ≤4 mg/min。']],
  prep: '原液或以 NS 稀釋（避免酸性溶液）。', admin: 'IV 推注 20–40 mg/min；≥160 mg 輸注 ≤4 mg/min。', ext: '',
  mon: ['尿量、體重、I/O', '電解質（K、Mg、Na）、腎功能', '聽力'], notes: ['與 milrinone、dobutamine、nicardipine 等不相容。'] },

{ id: 'terli', g: 'Terlipressin', b: 'Terlissin', spec: '1 mg/vial（terlipressin acetate）', code: 'ITERL1', cls: 'hem', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'glypressin 肝腎症候群 hrs 靜脈曲張出血',
  dose: (P) => [
    ['急性食道胃靜脈曲張出血（替代療法，off-label）', `${B('2 mg IV Q4H')}，最多 48 h（或止血即止）；止血後 1 mg Q4H 持續 2–5 天。`],
    ['肝腎症候群（合併 albumin）', `${B('1 mg IV Q6H')} × 3 天；第 4 天起：SCr 較基準下降 ≥30% 維持 1 mg Q6H；下降 <30% 增至 2 mg Q6H；SCr ≥ 基準則停藥。持續至連續兩次 SCr ≤1.5 mg/dL 後 24 h，最長 14 天。連續輸注（off-label）2 mg/24 h 起，每 24–48 h 評估，SCr 下降 <25% 可逐步增至上限 12 mg/24 h。${P.scr != null && P.scr > 5 ? B('SCr >5：效益不大') + '。' : ''}`],
  ],
  adj: (P) => [['i', '以上劑量以 terlipressin acetate 表示（美國仿單 terlipressin 0.85 mg ＝ acetate 1 mg）。'], ['d', '避免：SpO₂ <90%、容積過量、嚴重缺血性疾病（冠心症、周邊動脈、腸系膜）。ACLF grade 3 呼吸衰竭風險高。'], ['w', '低血鈉、腹痛、指端缺血、心搏過緩。'], ...(P.hf ? [['w', '心衰竭：容積與後負荷增加。']] : [])],
  prep: '以附帶稀釋液溶解；連續輸注稀釋於 NS。', admin: 'IV 推注或連續輸注（連續輸注副作用較少）。', ext: '',
  mon: ['SpO₂、肺水腫', '血鈉、尿量、SCr', '缺血徵象'], notes: [] },

{ id: 'amino', g: 'Aminophylline', b: 'Aminophylline', spec: '250 mg/10 mL/amp', code: 'IAMIN2', cls: 'oth', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'theophylline 支氣管擴張 copd 氣喘',
  ci: { u: 'mg/kg/h', w: 'IBW', lo: 0.25, hi: 0.5, st: 0.5, steps: [0.25, 0.38, 0.5] },
  preps: [{ l: '500 mg（2 amp）+ D5W／NS 至 500 mL', c: 1, cu: 'mg/mL' }],
  dose: (P) => { const { w, lab } = dw(P, 'IBW'); const m = P.child || P.hf ? 0.25 : P.age > 60 ? 0.38 : 0.5, cap = m === 0.5 ? 1125 : 500; return [
    ['急性頑固性可逆氣道阻塞（不建議常規用於氣喘或 COPD 急性惡化）', `Loading（24 h 內未用 aminophylline／theophylline）${B('5.7 mg/kg')}${w ? `（${lab}：${r0(5.7 * w)} mg）` : ''}；24 h 內用過者先測濃度，loading（theophylline）＝（目標 − 實測）× 0.5 L/kg，再 ÷0.8 換算 aminophylline。`],
    ['維持（目標 theophylline 約 10 mcg/mL）', `${B(m + ' mg/kg/h')}${w ? `（${fx(m * w, 1)} mg/h）` : ''}，每日上限 ${cap} mg（濃度需要時可更高）。≤60 歲 0.5；>60 歲 0.38；心衰竭失代償、肺心症、敗血症多重器官衰竭、休克或肝功能不全 0.25。調整後 24 h 複測濃度。`],
  ]; },
  adj: (P) => [...(P.child ? [['w', '肝功能不全：0.25 mg/kg/h 起始，每日 ≤500 mg，頻繁監測濃度。']] : []), ['i', '以 IBW 計算（theophylline 不分布於脂肪）；theophylline ≈ aminophylline × 0.8。'], ['w', '交互作用：ciprofloxacin、macrolide、fluvoxamine 升高濃度；phenytoin、吸菸降低。']],
  prep: '稀釋於 D5W 或 NS。', admin: 'Loading 30 分鐘輸注（≤25 mg/min）。', ext: '',
  mon: ['Theophylline 濃度（目標約 10 mcg/mL）', '心律（心搏過速）、癲癇、噁心'], notes: [] },

{ id: 'nac', g: 'Acetylcysteine (IV)', b: 'Kotan', spec: '300 mg/3 mL/amp', code: 'IACET3', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'nac acetaminophen overdose 普拿疼中毒 解毒',
  dose: (P) => { const w = P.wt, d = (k, mx) => w ? `（${r0(Math.min(k * w, mx * 1000))} mg）` : ''; return [
    ['Acetaminophen 中毒：三袋法（21 h）', `${B('150 mg/kg')} 1 h（上限 15 g）${d(150, 15)} → ${B('50 mg/kg')} 4 h（上限 5 g）${d(50, 5)} → ${B('100 mg/kg')} 16 h（上限 10 g）${d(100, 10)}；早期嚴重肝損傷或大量攝入時優先。${w ? `約 ${Math.ceil(Math.min(300 * w, 30000) / 300)} amp。` : ''}`],
    ['兩袋法（20 h）', `200 mg/kg 4 h（上限 20 g）→ 100 mg/kg 16 h（上限 10 g）。`],
  ]; },
  adj: (P) => [['w', '類過敏反應（皮疹、支氣管痙攣）多於第一袋：暫停、處置後放慢速率再續。'], ...(P.wt && P.wt <= 40 ? [['w', '體重 ≤40 kg：減少稀釋液體積。']] : []), ['i', '院內品項為黏液溶解用途規格，IV 解毒用量大；是否核准 IV、限水病人稀釋量請依仿單與院內流程確認。']],
  prep: '稀釋於 D5W（或 0.45% NaCl）：第一袋 200 mL、第二袋 500 mL、第三袋 1,000 mL（限水者減量）。', admin: '周邊可。', ext: '',
  mon: ['APAP 濃度、AST／ALT、INR', '過敏反應'], notes: [] },

{ id: 'thia', g: 'Thiamine', b: 'Vitamin B1', spec: '100 mg/2 mL/amp', code: 'IVITB1', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'vitamin b1 wernicke 酒精 refeeding',
  dose: () => [
    ['Wernicke encephalopathy 治療（疑似或確診）', `${B('200–500 mg IV TID')} × 2–7 天，之後 250 mg QD 再 3–5 天，接著口服 100 mg QD 至不再有缺乏風險；初始治療不用口服。`],
    ['預防 Wernicke（酒癮、戒斷、營養不良等高風險）', `${B('100–200 mg IV QD')} × 3–5 天；盡可能在給葡萄糖之前。`],
    ['靜脈營養且有 refeeding 或 Wernicke 風險', '開始 PN 前及期間另給 100–200 mg/day。'],
  ],
  adj: () => [['i', 'IV 極少過敏反應；腎、肝不需調整。']],
  prep: '稀釋於 50–100 mL NS。', admin: '30 分鐘輸注。', ext: '',
  mon: ['神經學（眼肌麻痺、運動失調、意識）', '磷、鉀、鎂（refeeding）'], notes: [] },

{ id: 'hes', g: 'Voluven 6%（HES 130/0.4）', b: 'Voluven', spec: '500 mL/bag', code: 'BVOLU6', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'hydroxyethyl starch 膠體 colloid',
  dose: (P) => [
    ['急性失血致低血容（晶體液不足時）', `嚴重脫水先給晶體液；以最低有效量 250–1,000 mL，${B('每日上限 30 mL/kg')}${P.wt ? `（${r0(30 * P.wt)} mL）` : ''}（台灣、歐盟仿單；美國上限 50 mL/kg），僅限復甦初期（≤24 h）。`],
  ],
  adj: (P) => { const a = [['d', '禁用：重症病人（含敗血症、敗血性休克）、燒傷、原有腎功能不全或 RRT、嚴重肝病、出血疾患、顱內出血、容積過量。出現明顯腎損傷立即停用。']]; if (P.rrt !== 'none' || (typeof renal(P) === 'number' && renal(P) < 60)) a.push(['d', '腎功能不全／RRT：禁用。']); return a; },
  prep: '原液。', admin: '周邊可。', ext: '',
  mon: ['腎功能（至 90 天）', '凝血、出血', '容積狀態'], notes: ['TFDA、EMA、FDA 皆已限縮使用範圍。'] },

{ id: 'idar', g: 'Idarucizumab', b: 'Praxbind', spec: '2.5 g/50 mL/vial', code: 'IIDAR2', cls: 'rev', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'praxbind dabigatran reversal 反轉',
  dose: () => [
    ['Dabigatran 相關危及生命出血或緊急手術', `${B('5 g IV')}（2 vial × 2.5 g，兩劑間隔 ≤15 分鐘），輸注或直接推注。用於危及生命或重要器官出血、緊急手術前，且支持性處置（活性碳、抗纖溶劑、血液透析）不足時。通常不需重複；持續出血且檢驗顯示 dabigatran 仍有作用時可考慮再給。`],
  ],
  adj: () => [['w', '含 sorbitol：遺傳性果糖不耐症注意。'], ['i', '反轉後 24 h 可恢復抗凝（臨床許可時）。']],
  prep: '原液，勿稀釋或與他藥混合。', admin: '獨立管路，給藥前後以 NS 沖管。', ext: '',
  mon: ['aPTT、dTT／ECT', '出血、血栓'], notes: [] },

{ id: 'alb', g: 'Albumin 25%', b: 'Flexbumin 25%', spec: '50 mL/bag（12.5 g）', code: 'IALBU5', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'flexbumin 白蛋白 colloid 膠體 hrs sbp paracentesis',
  dose: (P) => {
    const w = P.wt;
    return [
      ['大量腹水穿刺（>5 L）', `每移除 1 L 給 ${B('6–8 g')}，或 >5 L 共 50 g（4 袋）；於穿刺時或之後立即給。`],
      ['肝腎症候群（HRS-AKI，合併 NE／terlipressin）', `${B('1 g/kg/day × 2 天')}（上限 100 g/day）${w ? `→ ${r0(Math.min(w, 100))} g/day` : ''}，之後 20–50 g/day 至達臨床結果。`],
      ['自發性細菌性腹膜炎', `診斷 6 h 內 ${B('1.5 g/kg')}${w ? `（${r0(1.5 * w)} g）` : ''}，第 3 天 1 g/kg；單劑多不超過 100 g。多保留給 Cr >1、BUN >30 或 bilirubin >4 者。`],
      ['休克擴充血管內容積', 'SSC 2021：大量晶體液後可考慮加白蛋白；重症整體族群無額外效益。健保限制見下方。'],
    ];
  },
  adj: (P) => [['w', '輸注過快致容積過量：無休克者 25% 一般 ≤1–2 mL/min。'], ...(P.hf ? [['w', '心衰竭：容積負荷。']] : [])],
  prep: '25% 可原液或以 NS 稀釋（勿用 SWFI 稀釋，溶血）；開封後 4 h 內用完。', admin: '周邊可；可與 NS 或含醣溶液同一管路。', ext: '',
  mon: ['容積狀態、血壓、肺水腫', '血清白蛋白（健保：3 天內數值）'], notes: [],
  nhi: `<b>4.2.1. Human Albumin</b>（96/6/1、104/11/1、111/2/1）
<ol><li>本保險對象因病使用 Human Albumin 以符合下列適應症為限：
<ol type="a"><li>休克病人擴充有效循環血液量
<ol type="i"><li>休克病人至少已給生理鹽水或林格爾液等類溶液 1000 mL 後尚不能維持穩定血流動態，血比容（hematocrit）&gt;30%，或血色素（hemoglobin）&gt;10 gm/dL 需要繼續靜脈輸液時，宜優先使用合成膠類溶液，如 dextran、hydroxyethylstarch、polyvinylpyrolidone 等。若無上述合適製劑，可給白蛋白溶液，每一病人用量限 50 gm。</li>
<li>70 歲以上及 2 歲以下或併有心衰竭的休克病人，無法忍受太多靜脈輸液時，可一開始即使用白蛋白溶液，每一病人用量限 50 gm。</li></ol></li>
<li>病危、有腹水或水腫併有血清白蛋白濃度偏低病人
<ol type="i"><li>血清白蛋白濃度低於 2.5 gm/dL：(i) 肝硬化症（有相當之腹水或併發水腫）每日最多用量限 25 gm；(ii) 腎病症候群（嚴重蛋白尿致血清白蛋白下降），每日最多用量限 25 gm；(iii) 嚴重燒燙傷；(iv) 肝移植；(v) 蛋白質流失性腸症（protein-losing enteropathy）（104/11/1）：經內視鏡或手術或病理報告證實為蛋白質流失性腸症，或糞便 alpha-1-antitrypsin 升高；18 歲以下。</li>
<li>血清白蛋白濃度低於 3.0 gm/dL（96/6/1）：(i) 嚴重肺水腫；(ii) 大量肝切除（&gt;40%）。</li>
<li>開心手術用於維持體外循環液，用量限 37.5 gm。</li></ol></li></ol></li>
<li>注意事項
<ol type="a"><li>血清白蛋白濃度檢驗日期限最近 3 天以內，如係多次注射，限上次注射後，最近 3 天內之結果。</li>
<li>醫院於病例發生時，應填寫「全民健康保險病人使用 Human Albumin 申報表」（附表四），並附原始治療醫囑單於當月份申報醫療費用時送局辦理。</li>
<li>醫療機構、醫師開立使用血液製劑時，應依血液製劑條例之規定辦理。</li></ol></li></ol>` },

{ id: 'hc', g: 'Hydrocortisone', b: 'Hydrocortisone Sodium Succinate', spec: '100 mg/vial', code: 'IHYDR1', cls: 'oth', utd: '2026-11-13',
  route: 'int', line: 'P', ves: '', kw: 'solu-cortef 類固醇 septic shock 腎上腺',
  dose: () => [
    ['敗血性休克（持續需升壓劑）', `${B('200–300 mg/day')}，連續輸注或分次（例：50 mg Q6H，或 100 mg/100 mL NS Q12H＝8.3 mL/h），5–7 天或至轉出 ICU；可併用 fludrocortisone。`],
    ['心因性休克（off-label，頑固性或疑相對腎上腺功能不足）', `比照敗血性休克 ${B('200 mg/day')}（50 mg Q6H 或連續輸注），升壓劑脫離後逐步停藥。證據有限；UpToDate 藥物專論未收載此適應症，用於高劑量升壓劑仍不穩定、長期使用類固醇或疑腎上腺功能不足者。`],
    ['腎上腺危象', `${B('100 mg IV bolus')} → 50 mg Q6H 或 200 mg/24 h 連續輸注（首 24 h）；改善後逐步減量（如 50 mg Q12H）。`],
    ['甲狀腺風暴', '300 mg loading → 100 mg Q8H。'],
    ['壓力劑量（長期類固醇者手術／重症）', '依手術大小 25–100 mg/day。'],
  ],
  adj: () => [['i', '腎、肝功能：不需調整。'], ['i', '連續輸注可減少血糖波動。']],
  prep: '以附帶稀釋液溶解；連續輸注 100 mg/100 mL NS（12 h 內用完）。', admin: '周邊可。', ext: '',
  mon: ['血糖', '血鈉、血鉀', '感染、腸胃道出血', '譫妄、肌無力'], notes: ['與 midazolam、phenytoin、rocuronium 不相容。'] },

{ id: 'esome', g: 'Esomeprazole', b: 'Emazole', spec: '40 mg/vial', code: 'IESOM4', cls: 'oth', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'emazole nexium ppi 上消化道出血 UGI bleeding ugib',
  ci: { u: 'mg/h', w: null, lo: 4, hi: 8, st: 8, steps: [4, 6, 8] },
  preps: [{ l: '80 mg（2 vial）+ NS 至 100 mL', c: 0.8, cu: 'mg/mL' }],
  dose: () => [
    ['消化性潰瘍出血（高風險內視鏡表徵）', `${B('80 mg IV')} → ${B('8 mg/h')} ≥72 h（內視鏡前已給 80 mg 可省 bolus）；或 80 mg 後 40 mg Q12H ≥72 h。之後口服 40 mg BID × 14 天 → QD。`],
    ['內視鏡前（疑UGI bleeding）', '80 mg → 8 mg/h，或 40 mg Q12H。'],
    ['壓力性潰瘍預防', '40 mg IV QD；危險因子解除即停。'],
  ],
  adj: (P) => [['i', '腎功能不全：不需調整。'], ...(P.child === 'C' ? [['w', 'Child-Pugh C：連續輸注 80 mg 後 4 mg/h；間歇不調整。晚期肝硬化僅短期明確適應症使用。']] : P.child ? [['w', `Child-Pugh ${P.child}：連續輸注 80 mg 後 6 mg/h；間歇不調整。`]] : [])],
  prep: '單劑：溶解後稀釋於 100 mL NS，10–30 分鐘輸注；或 5 mL 稀釋 ≥3 分鐘推注。連續輸注液 NS 稀釋後 12 h 內用完。',
  admin: '周邊可；建議獨立管路或給藥前後沖管（Y-site 資料有限）。', ext: '',
  mon: ['出血徵象、Hb', '長期：C. difficile、低血鎂、肺炎'], notes: [] },

{ id: 'panto', g: 'Pantoprazole', b: 'Panzolec', spec: '40 mg/vial', code: 'IPANT4', cls: 'oth', utd: '2026-11-13',
  route: 'ci', line: 'P', ves: '', kw: 'panzolec pantoloc ppi ugib',
  ci: { u: 'mg/h', w: null, lo: 8, hi: 8, st: 8, steps: [8] },
  preps: [{ l: '80 mg（2 vial）+ NS 至 100 mL', c: 0.8, cu: 'mg/mL' }],
  dose: () => [
    ['消化性潰瘍出血（高風險內視鏡表徵）', `${B('80 mg IV')} → ${B('8 mg/h')} ≥72 h；或 80 mg 後 40 mg Q12H ≥72 h。`],
    ['壓力性潰瘍預防', '40 mg IV QD。'],
  ],
  adj: (P) => [['i', '腎功能不全：不需調整。'], ...(P.child ? [['i', `Child-Pugh ${P.child}：UGI bleeding不需調整；其他適應症用最低有效劑量${P.child !== 'C' ? '，每日 ≤40 mg' : ''}。`]] : [])],
  prep: '以 10 mL NS 溶解，可 2 分鐘推注；輸注稀釋於 NS 或 D5W 至 0.4–0.8 mg/mL。', admin: '周邊可；建議獨立管路或給藥前後沖管（與 midazolam、nicardipine 等不相容）。', ext: '',
  mon: ['出血徵象、Hb', '長期：C. difficile、低血鎂'], notes: [] },

{ id: 'pge1', g: 'Alprostadil (PGE1)', b: 'Promostan', spec: '20 mcg/vial', code: 'IPROS2', cls: 'oth', utd: 'NA', src: '仿單（UpToDate 成人僅收載陰莖海綿體注射）',
  route: 'int', line: 'P', ves: 'I', kw: 'promostan prostaglandin e1 paod 末梢循環',
  dose: (P) => {
    const c = renal(P), low = (typeof c === 'number' && c < 30) || P.rrt !== 'none';
    return [
      ['慢性動脈閉塞（四肢潰瘍、靜止痛）', `${low ? `${B('20 mcg BID')} 起始（腎功能不全），耐受後增量；` : ''}${B('40 mcg')} 加入 NS 50–250 mL，2 h 輸注 ${B('BID')}；或 60 mcg QD 3 h 輸注。療程依臨床（常 2–4 週）。`],
    ];
  },
  adj: (P) => {
    const a = [];
    if (P.hf) a.push(['w', '心衰竭：輸注液量與血管擴張可能加重，減少稀釋液量並監測。']);
    a.push(['w', '出血風險、近期心肌梗塞、低血壓者慎用。']);
    return a;
  },
  prep: '以 NS 溶解稀釋；配製後 12 h 內使用。', admin: '周邊可；靜脈炎時更換部位。', ext: '',
  mon: ['血壓、心跳', '注射部位、潮紅、腹瀉'], notes: [] },
];

/* 磷補充共用 */
function phosDose(P, salt) {
  const { w } = dw(P, 'PHOS'); const p = P.phos;
  let lo, hi, lv;
  if (p != null) {
    if (p >= 2.5) { lo = 0.08; hi = 0.16; lv = '輕度（2.3–2.7）'; }
    if (p < 2.5 && p >= 1.5) { lo = 0.16; hi = 0.32; lv = '中度（1.5–2.2）'; }
    if (p < 1.5) { lo = 0.32; hi = 0.64; lv = '重度（<1.5）'; }
    if (p >= 2.8) lv = null;
  }
  const ren = (typeof renal(P) === 'number' && renal(P) < 60) || P.rrt === 'HD' || P.rrt === 'PD';
  const o = [];
  if (p != null && !lv) o.push(['低血磷補充', `血磷 ${p} mg/dL：不需靜脈補充。`]);
  else if (lv && w) {
    let a = lo * w, b = Math.min(hi * w, 50);
    if (ren) { a /= 2; b /= 2; }
    o.push(['低血磷補充', `血磷 ${p} mg/dL（${lv}）→ ${B(lo + '–' + hi + ' mmol/kg')} × ${fx(w)} kg ＝ ${B(r0(a) + '–' + r0(b) + ' mmol')}${ren ? '（腎功能不全減半）' : ''}，4–6 h 輸注${salt === 'K' ? `` : ''}；可補至無症狀或 P >2 mg/dL。ICU 合併營養治療時四捨五入至 7.5 mmol。${salt === 'Na' ? `＝ Glycophos ${fx(a, 0)}–${fx(b, 0)} mL（含 Na ${r0(2 * a)}–${r0(2 * b)} mmol）。` : `＝ K₃PO₄ ${fx(a / 3, 1)}–${fx(b / 3, 1)} mL（K⁺ ${r0(a / 3 * 4.4)}–${r0(b / 3 * 4.4)} mEq）。`}`]);
  } else o.push(['低血磷補充（mg/dL）', '2.3–2.7：0.08–0.16 mmol/kg；1.5–2.2：0.16–0.32；<1.5：0.32–0.64；4–6 h 輸注，腎功能不全減半。']);
  return o;
}
function phosAdj(P, salt) {
  const a = [];
  if (salt === 'K' && P.k != null && P.k >= 4) a.push(['w', `血鉀 ${P.k}：≥4 時改用鈉鹽（Glycophos）。`]);
  if (salt === 'K' && ((typeof renal(P) === 'number' && renal(P) < 30) || P.rrt === 'HD' || P.rrt === 'PD')) a.push(['w', '腎功能不全（非 CRRT）：起始至少減 50%；嚴重腎功能不全極度謹慎（Glycophos 於 eGFR <30 或 iHD 禁用，不能以鈉鹽替代）。']);
  if (salt === 'Na') { const c = renal(P); if ((typeof c === 'number' && c < 30) || P.rrt === 'HD') a.push(['d', 'Glycophos：eGFR <30 或間歇性血液透析禁用。']); else if (typeof c === 'number' && c < 60) a.push(['w', 'eGFR 30–60：由劑量範圍低端起始，謹慎使用。']); a.push(['i', '每 1 mmol 磷含 Na 2 mEq；與無機磷酸鹽換算時維持相同磷 mmol。須稀釋，滲透壓 ≥900 mOsm/L 經中央靜脈。']); }
  if (P.ca != null && P.alb != null && P.ca + 0.8 * (4 - P.alb) < 7.5) a.push(['w', '低血鈣：磷補充可能再降低鈣，先評估。']);
  if (P.rrt === 'CRRT') a.push(['i', 'CRRT：磷持續流失，常需每日補充或使用含磷置換液。']);
  return a;
}

/* -------------------------------------------------------------------
   Y-site 相容性（標準濃度、短時間接觸；Y-site／三通並接）
   主要來源：臨床藥學會 Y-site compatibility 表（TSHP，見下方 TSHP）；
   下列 CMP 僅用於 TSHP 表未收錄之組合（Trissel's 整理，標示「其他來源」）
   C 相容｜I 不相容｜V 結果不一／依濃度｜未列 ＝ 無可靠資料
------------------------------------------------------------------- */
const CMP = {};
function setC(s, a, list) { list.split(/\s+/).filter(Boolean).forEach((b) => { CMP[[a, b].sort().join('|')] = s; }); }
/* 不相容 */
setC('I', 'nahco3', 'ne epi dopa dobu iso cagl mida amio labe nicar vera cisa atra');
setC('I', 'cagl', 'kphos');
setC('I', 'dobu', 'kphos tpa');
setC('I', 'dopa', 'tpa');
setC('I', 'hep', 'amio nicar tpa');
setC('I', 'ntg', 'tpa');
setC('I', 'prop', 'atra cisa vera');
setC('I', 'mida', 'hc panto pb');
setC('I', 'nicar', 'panto');
setC('I', 'rocu', 'hc ins');
setC('I', 'pb', 'ket atra');
setC('I', 'dexa', 'mida rocu');
setC('I', 'mpred', 'prop');
setC('I', 'dig', 'prop');
setC('I', 'bume', 'mil');
/* 結果不一／依濃度 */
setC('V', 'mida', 'prop');
setC('V', 'cagl', 'mg naglyp');
setC('V', 'mg', 'nahco3');
setC('V', 'dobu', 'hep panto ins');
setC('V', 'labe', 'hep');
setC('V', 'ins', 'ne');
/* 相容 */
setC('C', 'ne', 'epi avp dopa dobu mil ntg nicar labe amio dilt lido hep mida fent morph prop dex ket kcl mg cagl cisa rocu hc');
setC('C', 'epi', 'avp dopa dobu mil ntg nicar amio dilt hep mida fent morph prop dex kcl mg cagl cisa rocu');
setC('C', 'avp', 'dopa dobu mil amio mida fent prop dex hc');
setC('C', 'dopa', 'dobu mil ntg nicar labe amio dilt lido hep mida fent morph prop dex kcl mg cagl cisa tiro hc');
setC('C', 'dobu', 'mil ntg nicar labe amio dilt lido mida fent morph prop dex kcl mg cagl cisa rocu');
setC('C', 'mil', 'ntg hep ins kcl mg dilt mida fent morph prop');
setC('C', 'nicar', 'labe dilt ntg mida fent morph prop dex kcl mg lido');
setC('C', 'labe', 'dilt ntg amio lido mida fent morph kcl mg cagl ins');
setC('C', 'ntg', 'dilt amio lido hep mida fent morph prop dex kcl mg ins tiro levo');
setC('C', 'amio', 'dilt lido mida fent morph dex kcl mg ins');
setC('C', 'dilt', 'hep mida fent morph kcl mg ins cagl');
setC('C', 'vera', 'hep');
setC('C', 'lido', 'hep kcl tiro mida cagl');
setC('C', 'hep', 'kcl mg ins mida fent morph prop dex tiro cagl rocu loraz');
setC('C', 'tiro', 'kcl mida morph');
setC('C', 'prop', 'fent morph ket dex kcl mg rocu');
setC('C', 'mida', 'fent morph ket dex cisa rocu kcl mg cagl ins loraz tiro lev');
setC('C', 'dex', 'fent morph ket cisa kcl mg ins');
setC('C', 'ket', 'fent');
setC('C', 'fent', 'morph cisa rocu kcl mg ins');
setC('C', 'morph', 'cisa rocu kcl mg ins');
setC('C', 'cisa', 'kcl mg');
setC('C', 'kcl', 'mg ins kphos cagl nahco3');
setC('C', 'mg', 'ins kphos');
setC('C', 'ins', 'nahco3 cagl');
setC('C', 'nahco3', 'hep');
setC('C', 'lev', 'loraz vpa');
setC('C', 'loraz', 'mida');
setC('C', 'hc', 'ne');

/* 一律獨立管路者 */
const SOLO = {
  diaz: 'Diazepam 稀釋或與他藥混合易沉澱，獨立管路推注，前後以 NS 沖管。',
  idar: 'Idarucizumab 不可與他藥混合，獨立管路，給藥前後以 NS 沖管。',
  pcc: '4F-PCC（Beriplex）不可與他藥混合，獨立管路推注。',
  pht: 'Phenytoin 與幾乎所有藥物、D5W 不相容（沉澱），一律獨立管路，給藥前後以 NS 沖管。',
  tpa: 'Alteplase 建議獨立管路，輸注結束以 NS 推完殘餘藥量。',
  nimo: 'Nimodipine 仿單建議經中央靜脈獨立給藥，僅以三通與 NS／D5W／LR 並行；使用 polyethylene 管路、避光。',
  mann: 'Mannitol 不可與血品同時輸注；高濃度易結晶，建議 ≤5 µm 線上過濾器、獨立管路。',
  aden: 'Adenosine 須快速推注後立即沖管，經獨立或最近端管路給藥。',
  nahco3: 'NaHCO₃（鹼性）與兒茶酚胺、鈣、多數鎮靜藥不相容，建議獨立管路。',
};
/* 臨床藥學會（TSHP）第十五屆年輕藥師委員會 Y-site compatibility 表（110 年）：一般內科、心臟內外科、兒科、創傷、神經內外科、一般外科、胸腔外科工作表合併；各表結果不一者列為 V */
const TSHP = {"amio|cagl":"C","amio|cisa":"C","amio|dex":"C","amio|fent":"C","amio|hep":"I","amio|ins":"C","amio|kcl":"C","amio|loraz":"C","amio|mg":"C","amio|mida":"C","amio|nahco3":"I","amio|ne":"C","amio|avp":"C","cagl|cisa":"C","cagl|dex":"C","cagl|fent":"C","cagl|hep":"C","cagl|ins":"C","cagl|kcl":"C","cagl|loraz":"C","cagl|mg":"C","cagl|mida":"C","cagl|nahco3":"I","cagl|ne":"C","cagl|prop":"C","avp|cagl":"C","cisa|dex":"C","cisa|fent":"C","cisa|hep":"C","cisa|kcl":"C","cisa|loraz":"C","cisa|mg":"C","cisa|mida":"C","cisa|nahco3":"V","cisa|ne":"C","cisa|prop":"I","avp|cisa":"C","dex|fent":"C","dex|hep":"C","dex|ins":"C","dex|kcl":"C","dex|loraz":"C","dex|mg":"C","dex|mida":"C","dex|nahco3":"C","dex|ne":"C","dex|prop":"C","avp|dex":"C","fent|hep":"C","fent|ins":"C","fent|kcl":"C","fent|loraz":"C","fent|mg":"C","fent|mida":"C","fent|nahco3":"C","fent|ne":"C","fent|prop":"C","avp|fent":"C","hep|ins":"C","hep|kcl":"C","hep|loraz":"C","hep|mg":"C","hep|mida":"C","hep|nahco3":"C","hep|ne":"C","hep|prop":"C","avp|hep":"C","ins|kcl":"C","ins|loraz":"C","ins|mg":"C","ins|mida":"C","ins|nahco3":"C","ins|ne":"C","ins|prop":"C","avp|ins":"C","kcl|loraz":"C","kcl|mg":"C","kcl|mida":"C","kcl|nahco3":"C","kcl|ne":"C","kcl|prop":"C","avp|kcl":"C","loraz|mg":"C","loraz|mida":"C","loraz|nahco3":"C","loraz|ne":"C","loraz|prop":"C","avp|loraz":"C","mg|mida":"C","mg|nahco3":"C","mg|ne":"C","mg|prop":"C","avp|mg":"C","mida|nahco3":"I","mida|ne":"C","mida|prop":"C","avp|mida":"C","nahco3|ne":"I","nahco3|prop":"C","avp|nahco3":"C","ne|prop":"C","avp|ne":"C","amio|bume":"C","amio|dig":"I","amio|dopa":"C","amio|mann":"C","amio|ntg":"C","bume|cisa":"C","bume|dex":"C","bume|dig":"C","bume|dopa":"C","bume|fent":"C","bume|hep":"C","bume|ins":"C","bume|kcl":"C","bume|mann":"C","bume|mg":"C","bume|mida":"I","bume|nahco3":"C","bume|ntg":"C","bume|ne":"C","bume|prop":"C","bume|uk":"C","avp|bume":"C","cisa|dig":"C","cisa|dopa":"C","cisa|mann":"C","cisa|ntg":"C","dex|dig":"C","dex|dopa":"C","dex|mann":"C","dex|ntg":"C","dig|dopa":"C","dig|fent":"C","dig|hep":"C","dig|ins":"C","dig|kcl":"C","dig|mann":"C","dig|mg":"C","dig|mida":"C","dig|nahco3":"C","dig|ntg":"C","dig|ne":"C","dig|prop":"I","dig|uk":"C","avp|dig":"C","dopa|fent":"C","dopa|hep":"C","dopa|ins":"C","dopa|kcl":"C","dopa|mann":"C","dopa|mg":"C","dopa|mida":"C","dopa|nahco3":"I","dopa|ntg":"C","dopa|ne":"C","dopa|prop":"C","dopa|uk":"C","avp|dopa":"C","fent|mann":"C","fent|ntg":"C","fent|uk":"C","hep|mann":"C","hep|ntg":"C","hep|txa":"C","hep|uk":"C","ins|mann":"C","ins|ntg":"C","ins|uk":"C","kcl|mann":"C","kcl|ntg":"C","kcl|uk":"C","mann|mg":"C","mann|mida":"C","mann|nahco3":"C","mann|ntg":"C","mann|ne":"C","mann|prop":"C","mann|uk":"C","avp|mann":"C","mg|ntg":"C","mg|uk":"C","mida|ntg":"C","mida|uk":"C","nahco3|ntg":"C","nahco3|uk":"C","ne|ntg":"C","ntg|prop":"C","ntg|uk":"C","avp|ntg":"C","ne|uk":"C","avp|uk":"C","amio|pge1":"C","cisa|pge1":"I","dex|pge1":"I","dobu|pge1":"C","dopa|pge1":"C","fent|pge1":"C","hep|pge1":"C","ins|pge1":"I","mida|pge1":"C","amio|dobu":"C","amio|epi":"C","amio|iso":"C","amio|labe":"C","amio|lido":"C","amio|nicar":"C","cisa|dobu":"C","cisa|epi":"C","cisa|iso":"C","cisa|labe":"C","cisa|lido":"C","cisa|nicar":"C","dex|dobu":"C","dex|epi":"C","dex|iso":"C","dex|labe":"C","dex|lido":"C","dex|nicar":"C","dobu|dopa":"C","dobu|epi":"C","dobu|fent":"C","dobu|hep":"C","dobu|ins":"C","dobu|iso":"C","dobu|labe":"C","dobu|lido":"C","dobu|loraz":"C","dobu|mann":"C","dobu|mg":"C","dobu|mida":"C","dobu|nahco3":"I","dobu|nicar":"C","dobu|ntg":"C","dobu|ne":"C","dobu|prop":"C","dobu|uk":"C","avp|dobu":"C","dopa|epi":"C","dopa|iso":"C","dopa|labe":"C","dopa|lido":"C","dopa|loraz":"C","dopa|nicar":"C","epi|fent":"C","epi|hep":"C","epi|ins":"C","epi|iso":"C","epi|labe":"C","epi|lido":"C","epi|loraz":"C","epi|mann":"C","epi|mg":"C","epi|mida":"C","epi|nahco3":"I","epi|nicar":"C","epi|ntg":"C","epi|ne":"C","epi|prop":"C","epi|uk":"C","avp|epi":"C","fent|iso":"C","fent|labe":"C","fent|lido":"C","fent|nicar":"C","hep|iso":"C","hep|labe":"C","hep|lido":"C","hep|nicar":"C","ins|iso":"I","ins|labe":"I","ins|lido":"C","iso|labe":"C","iso|lido":"C","iso|loraz":"C","iso|mann":"C","iso|mg":"C","iso|mida":"C","iso|nahco3":"I","iso|nicar":"C","iso|ntg":"C","iso|ne":"C","iso|prop":"C","iso|uk":"C","avp|iso":"C","labe|lido":"C","labe|loraz":"C","labe|mann":"C","labe|mg":"C","labe|mida":"C","labe|nahco3":"C","labe|nicar":"C","labe|ntg":"C","labe|ne":"C","labe|prop":"C","labe|uk":"C","avp|labe":"C","lido|loraz":"C","lido|mann":"C","lido|mg":"C","lido|mida":"C","lido|nahco3":"C","lido|nicar":"C","lido|ntg":"C","lido|ne":"C","lido|prop":"C","lido|uk":"C","avp|lido":"C","loraz|mann":"C","loraz|nicar":"C","loraz|ntg":"C","mann|nicar":"C","mg|nicar":"C","mida|nicar":"C","nahco3|nicar":"I","nicar|ntg":"C","ne|nicar":"C","avp|nicar":"C","amio|hc":"I","amio|mil":"C","amio|morph":"C","cagl|dopa":"C","cagl|epi":"C","cagl|hc":"C","cagl|mann":"C","cagl|mil":"C","cisa|hc":"C","cisa|mil":"C","dopa|hc":"C","dopa|mil":"C","epi|hc":"C","epi|mil":"C","fent|hc":"C","fent|mil":"C","hc|hep":"C","hep|mil":"C","hc|mann":"C","hc|mg":"C","hc|mida":"I","hc|mil":"C","hc|morph":"C","hc|nahco3":"C","hc|ne":"C","avp|hc":"C","mann|mil":"C","mg|mil":"C","mida|mil":"C","mida|morph":"C","mil|nahco3":"C","mil|ne":"C","avp|mil":"C","morph|nahco3":"C","kcl|pge1":"C","kcl|labe":"C","kcl|nicar":"C","hep|tpa":"I","amio|dilt":"C","amio|ket":"C","dex|dilt":"C","dilt|fent":"C","dilt|hep":"C","dilt|ins":"C","dilt|kcl":"C","dilt|labe":"C","dilt|lido":"C","dilt|mg":"C","dilt|mida":"C","dilt|nahco3":"C","dilt|nicar":"C","dilt|ntg":"C","dilt|ne":"C","avp|dilt":"C","hep|ket":"I","ins|ket":"I","kcl|ket":"C","kcl|lido":"C","ket|mg":"C","ket|mida":"C","ket|nahco3":"I","ket|prop":"C","dex|hc":"C","hc|ins":"C","hc|kcl":"C","hc|labe":"I","hc|nicar":"C","hc|prop":"C","mpred|pge1":"C","dex|mpred":"C","fent|mpred":"C","hep|mpred":"C","ins|mpred":"C","mann|mpred":"C","mg|mpred":"I","mida|mpred":"C","mpred|nicar":"C","mpred|ne":"C","avp|mpred":"C","cagl|vitk":"C","dopa|vitk":"C","epi|vitk":"C","fent|vitk":"C","hep|vitk":"C","hc|vitk":"C","mann|vitk":"I","mg|vitk":"I","mida|vitk":"C","nahco3|vitk":"C","ne|vitk":"C","avp|vitk":"C","dex|keto":"C","fent|keto":"C","fent|thia":"C","ins|keto":"C","ins|thia":"C","kcl|keto":"C","keto|labe":"I","keto|mann":"C","keto|mg":"C","keto|mida":"I","keto|nahco3":"C","keto|nicar":"I","keto|ne":"C","avp|keto":"C","kcl|thia":"C","labe|thia":"C","mann|thia":"C","mg|thia":"C","mida|tram":"C","nahco3|thia":"I","ne|thia":"C","avp|thia":"C","hep|nac":"C"};
function compatSrc(a, b) {
  const k = [a, b].sort().join('|');
  if (a === b) return '';
  if (TSHP[k]) return 'tshp';
  if (a === 'pht' || b === 'pht') return 'label';
  return CMP[k] ? 'other' : '';
}
function compat(a, b) {
  if (a === b) return 'S';
  const k = [a, b].sort().join('|');
  if (TSHP[k]) return TSHP[k];
  if (a === 'pht' || b === 'pht') return 'I';
  return CMP[k] || 'U';
}
