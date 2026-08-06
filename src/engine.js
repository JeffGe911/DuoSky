/* 八字×星座 排盘引擎 (prototype)
 * 依赖: TERMS = {year: [[deg,"MMDDHHMM"(UTC)] x24]}
 * 口径: 年柱以立春(315°)为界; 月柱以十二节为界; 日柱 JDN 算术; 晚子时(23:00+)日柱换次日; 时区由调用方传入
 */
const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const GAN_WX = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
const ZHI_MAIN = { 子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙", 午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬" };
// 十二节 -> 月支 (立春315→寅 ... 小寒285→丑)
const JIE_DEG_TO_BRANCH = { 315: 2, 345: 3, 15: 4, 45: 5, 75: 6, 105: 7, 135: 8, 165: 9, 195: 10, 225: 11, 255: 0, 285: 1 };
// 五虎遁: 年干 -> 寅月起干
const WUHU = { 甲: "丙", 己: "丙", 乙: "戊", 庚: "戊", 丙: "庚", 辛: "庚", 丁: "壬", 壬: "壬", 戊: "甲", 癸: "甲" };
// 五鼠遁: 日干 -> 子时起干
const WUSHU = { 甲: "甲", 己: "甲", 乙: "丙", 庚: "丙", 丙: "戊", 辛: "戊", 丁: "庚", 壬: "庚", 戊: "壬", 癸: "壬" };
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function termUTCms(termsTable, year, mmddhhmm) {
  const mo = +mmddhhmm.slice(0, 2), d = +mmddhhmm.slice(2, 4), h = +mmddhhmm.slice(4, 6), mi = +mmddhhmm.slice(6, 8);
  return Date.UTC(year, mo - 1, d, h, mi);
}

// 该年所有节气 [{deg, ms}]
function yearTerms(termsTable, year) {
  const arr = termsTable[String(year)];
  if (!arr) return null;
  return arr.map(([deg, s]) => ({ deg, ms: termUTCms(termsTable, year, s) }));
}

function jdn(y, m, d) { // Fliegel–Van Flandern, 公历
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/**
 * @param {Object} p {y,m,d,hh,mi,tzMin,timeKnown}
 * tzMin: 出生地与 UTC 的偏移分钟(东为正, 北京=480)
 */
function computeChart(termsTable, p) {
  const { y, m, d, tzMin } = p;
  const timeKnown = p.timeKnown !== false;
  const hh = timeKnown ? p.hh : 12, mi = timeKnown ? p.mi : 0; // 未知时辰按正午算日柱(不跨日, 无风险)
  const utcMs = Date.UTC(y, m - 1, d, hh, mi) - tzMin * 60000;

  // --- 年柱: 立春界 ---
  const t0 = yearTerms(termsTable, y);
  if (!t0) return { error: "out_of_range" };
  const lichun = t0.find(t => t.deg === 315);
  if (!lichun) return { error: "out_of_range" };
  const gzYearNum = utcMs >= lichun.ms ? y : y - 1;
  const ys = GAN[(gzYearNum - 4) % 10 < 0 ? ((gzYearNum - 4) % 10) + 10 : (gzYearNum - 4) % 10];
  const yb = ZHI[(gzYearNum - 4) % 12 < 0 ? ((gzYearNum - 4) % 12) + 12 : (gzYearNum - 4) % 12];

  // --- 月柱: 最近一个已过的"节" ---
  const pool = [];
  for (const yr of [y - 1, y]) {
    const ts = yearTerms(termsTable, yr);
    if (ts) for (const t of ts) if (t.deg in JIE_DEG_TO_BRANCH) pool.push(t);
  }
  pool.sort((a, b) => a.ms - b.ms);
  let lastJie = null;
  for (const t of pool) if (t.ms <= utcMs) lastJie = t;
  if (!lastJie) return { error: "out_of_range" };
  const mbIdx = JIE_DEG_TO_BRANCH[lastJie.deg];
  const mb = ZHI[mbIdx];
  const monthsFromYin = (mbIdx - 2 + 12) % 12;
  const ms_ = GAN[(GAN.indexOf(WUHU[ys]) + monthsFromYin) % 10];

  // --- 日柱: 本地历日, 23:00+ 归次日 ---
  let dy = y, dm = m, dd = d;
  if (timeKnown && p.hh >= 23) {
    const nx = new Date(Date.UTC(y, m - 1, d) + 86400000);
    dy = nx.getUTCFullYear(); dm = nx.getUTCMonth() + 1; dd = nx.getUTCDate();
  }
  const dayIdx = ((jdn(dy, dm, dd) + 49) % 60 + 60) % 60;
  const ds = GAN[dayIdx % 10], db = ZHI[dayIdx % 12];

  // --- 时柱 ---
  let hs = null, hb = null;
  if (timeKnown) {
    const totalMin = (p.hh * 60 + p.mi + 60) % 1440;
    const hbIdx = Math.floor(totalMin / 120);
    hb = ZHI[hbIdx];
    hs = GAN[(GAN.indexOf(WUSHU[ds]) + hbIdx) % 10];
  }

  // --- 太阳星座: 同一张表, 30° 整倍数(中气)为界 ---
  const pool2 = [];
  for (const yr of [y - 1, y]) {
    const ts = yearTerms(termsTable, yr);
    if (ts) for (const t of ts) if (t.deg % 30 === 0) pool2.push(t);
  }
  pool2.sort((a, b) => a.ms - b.ms);
  let lastCusp = null;
  for (const t of pool2) if (t.ms <= utcMs) lastCusp = t;
  if (!lastCusp) return { error: "out_of_range" };
  const sign = SIGNS[(lastCusp.deg / 30) % 12];

  // --- 五行统计 (天干 + 地支本气) ---
  const chars = timeKnown ? [ys, yb, ms_, mb, ds, db, hs, hb] : [ys, yb, ms_, mb, ds, db];
  const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (let i = 0; i < chars.length; i += 2) {
    count[GAN_WX[chars[i]]]++;
    count[GAN_WX[ZHI_MAIN[chars[i + 1]]]]++;
  }

  return {
    year: ys + yb, month: ms_ + mb, day: ds + db, hour: hs ? hs + hb : null,
    dayMaster: ds, sign, gzYearNum, count, timeKnown,
  };
}

// 十二节 (只用节, 不用中气) —— 用于大运起运
const JIE_SET = new Set([315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]);
function jiaziIndex(stem, branch) {
  const si = GAN.indexOf(stem), bi = ZHI.indexOf(branch);
  for (let n = 0; n < 60; n++) if (n % 10 === si && n % 12 === bi) return n;
  return -1;
}
/**
 * 大运 (子平): 阳年男/阴年女顺行, 阴年男/阳年女逆行;
 * 起运 = 出生到最近一个节(顺)或上一个节(逆)的天数 / 3 (三日折一年);
 * 干支从月柱起, 顺行取次干支/逆行取前干支, 每步十年。
 * @param opts {yearStem, monthGZ:"干支", gender:"m"|"f"}
 */
function computeLuck(termsTable, p, opts) {
  const { yearStem, monthGZ, gender } = opts;
  const timeKnown = p.timeKnown !== false;
  const hh = timeKnown ? p.hh : 12, mi = timeKnown ? p.mi : 0;
  const utcMs = Date.UTC(p.y, p.m - 1, p.d, hh, mi) - p.tzMin * 60000;
  const yangYear = GAN.indexOf(yearStem) % 2 === 0;
  const forward = yangYear === (gender === "m");
  const jies = [];
  for (const yr of [p.y - 1, p.y, p.y + 1]) {
    const arr = termsTable[String(yr)];
    if (arr) for (const [deg, str] of arr) if (JIE_SET.has(deg)) jies.push(termUTCms(termsTable, yr, str));
  }
  jies.sort((a, b) => a - b);
  let target = null;
  if (forward) { for (const t of jies) if (t > utcMs) { target = t; break; } }
  else { for (let i = jies.length - 1; i >= 0; i--) if (jies[i] <= utcMs) { target = jies[i]; break; } }
  if (target == null) return { error: "out_of_range" };
  const daysDiff = Math.abs(target - utcMs) / 86400000;   // 三日折一年 / 一日四月 / 一时五日
  const startAge = Math.floor(daysDiff / 3);
  let rem = daysDiff - startAge * 3;                      // 0..3 天
  const startMonths = Math.floor(rem * 4);               // 一天=四个月
  const startDays = Math.round((rem * 4 - startMonths) * 30);
  const n0 = jiaziIndex(monthGZ[0], monthGZ[1]);
  const list = [];
  for (let i = 0; i < 9; i++) {
    const n = ((n0 + (forward ? 1 : -1) * (i + 1)) % 60 + 60) % 60;
    const age = startAge + i * 10;
    list.push({ ganzhi: GAN[n % 10] + ZHI[n % 12], startAge: age, startYear: p.y + age });
  }
  return { forward, startAge, startMonths, startDays, startYear: p.y + startAge, list };
}

// ============ 格局 (月令取格) ============
function computePattern(r) {
  const dm = r.dayMaster, mb = r.month[1], hid = HIDDEN[mb];
  const outs = [r.year[0], r.month[0]]; if (r.hour) outs.push(r.hour[0]);   // 天干(不含日主)
  let geStem = null, via = -1;
  for (let i = 0; i < hid.length; i++) if (outs.indexOf(hid[i]) >= 0) { geStem = hid[i]; via = i; break; }  // 藏干透出(本>中>余)
  const transparent = geStem != null;
  if (!geStem) { geStem = hid[0]; via = 0; }   // 无透干 -> 取月令本气
  const tg = tenGod(dm, geStem);
  let key;
  if (tg === "比肩" || tg === "劫财") {
    if (mb === SS_LU[dm]) key = "jianlu";
    else if (SS_YANGREN[dm] === mb) key = "yangren";
    else key = "bijie";
  } else {
    key = { 正官:"zhengguan", 七杀:"qisha", 正财:"zhengcai", 偏财:"piancai", 正印:"zhengyin", 偏印:"pianyin", 食神:"shishen", 伤官:"shangguan" }[tg];
  }
  const JI = ["zhengguan", "zhengcai", "piancai", "zhengyin", "shishen", "jianlu"];  // 吉格(顺用)
  return { key, geStem, geTenGod: tg, via, transparent, type: JI.indexOf(key) >= 0 ? "ji" : "xiong" };
}

// ============ 双人合盘 (八字合婚) ============
function branchRel2(a, b) {
  if (ZHI_CHONG[a] === b) return "chong";
  if (ZHI_LIUHE[a] === b) return "liuhe";
  if (XING_PAIRS.has(a + b)) return "xing";
  if (ZHI_HAI[a] === b) return "hai";
  for (const [x, y, z] of SANHE) { const g = [x, y, z]; if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) return "sanhe"; }
  if (a === b) return "same";
  return "none";
}
function computeCompat(rA, rB) {
  const sA = computeStrength(rA), sB = computeStrength(rB);
  const aE = GAN_WX[rA.dayMaster], bE = GAN_WX[rB.dayMaster];
  const dmRel = STEM_HE[rA.dayMaster] === rB.dayMaster ? "he" : aE === bE ? "same" : (shengOf(aE) === bE || shengOf(bE) === aE) ? "sheng" : "ke";
  const zodiac = branchRel2(rA.year[1], rB.year[1]);
  const spouse = branchRel2(rA.day[1], rB.day[1]);
  const aHelp = sA.favor.filter(e => sB.score[e] > sB.total / 5).length;   // B 能补 A 的喜用
  const bHelp = sB.favor.filter(e => sA.score[e] > sA.total / 5).length;   // A 能补 B 的喜用
  const aHarm = sA.avoid.filter(e => sB.score[e] > sB.total / 4).length;   // B 加重 A 的忌神
  const bHarm = sB.avoid.filter(e => sA.score[e] > sA.total / 4).length;
  const ZBONUS = { liuhe:15, sanhe:14, banhe:8, same:6, none:0, xing:-8, hai:-8, chong:-12 };
  const SBONUS = { liuhe:12, sanhe:10, banhe:6, same:6, none:0, xing:-6, hai:-6, chong:-12 };
  let score = 60;
  score += dmRel === "he" ? 18 : dmRel === "sheng" ? 15 : dmRel === "same" ? 8 : 6;
  score += ZBONUS[zodiac] || 0;
  score += SBONUS[spouse] || 0;
  score += Math.min(aHelp, 2) * 5 + Math.min(bHelp, 2) * 5 - aHarm * 3 - bHarm * 3;
  score = Math.max(20, Math.min(98, Math.round(score)));
  const tier = score >= 80 ? "great" : score >= 66 ? "good" : score >= 52 ? "ok" : "work";
  return { score, tier, dmRel, zodiac, spouse, aHelp, bHelp, aHarm, bHarm, favorA: sA.favor, favorB: sB.favor, dmA: rA.dayMaster, dmB: rB.dayMaster, aE, bE };
}

// ============ 真太阳时校正 ============
function dayOfYear(y, m, d) {
  const a = [0,31,59,90,120,151,181,212,243,273,304,334];
  let n = a[m - 1] + d;
  if (m > 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) n++;
  return n;
}
// 相对钟表时间的分钟差 (经度校正 + 均时差); 加到钟表时间得真太阳时
function trueSolarDelta(y, m, d, lon, tzMin) {
  const stdMeridian = tzMin / 60 * 15;
  const lonCorr = (lon - stdMeridian) * 4;                       // 每度4分钟
  const B = (360 * (dayOfYear(y, m, d) - 81) / 365) * Math.PI / 180;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);  // 均时差(分)
  return lonCorr + eot;
}

// ============ 流年 / 神煞 / 吉凶 ============
// 流年干支: 1984=甲子(index0)
function computeFleetYears(fromYear, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const Y = fromYear + i, idx = ((Y - 1984) % 60 + 60) % 60;
    out.push({ year: Y, ganzhi: GAN[idx % 10] + ZHI[idx % 12] });
  }
  return out;
}
// 干支吉凶: 看天干五行 + 地支本气五行 落在 喜用 / 忌 的多寡
function luckFortune(gz, favor, avoid) {
  const es = [GAN_WX[gz[0]], GAN_WX[ZHI_MAIN[gz[1]]]];
  let f = 0, a = 0;
  es.forEach(e => { if (favor.indexOf(e) >= 0) f++; if (avoid.indexOf(e) >= 0) a++; });
  return f > a ? "good" : a > f ? "bad" : "neutral";
}
// 神煞 (日干起: 天乙/文昌/禄/羊刃; 年支三合起: 桃花/驿马/华盖/将星/劫煞; 日柱旬空)
const SS_TIANYI = { 甲:["丑","未"],乙:["子","申"],丙:["亥","酉"],丁:["亥","酉"],戊:["丑","未"],己:["子","申"],庚:["丑","未"],辛:["寅","午"],壬:["卯","巳"],癸:["卯","巳"] };
const SS_WENCHANG = { 甲:"巳",乙:"午",丙:"申",丁:"酉",戊:"申",己:"酉",庚:"亥",辛:"子",壬:"寅",癸:"卯" };
const SS_LU = { 甲:"寅",乙:"卯",丙:"巳",丁:"午",戊:"巳",己:"午",庚:"申",辛:"酉",壬:"亥",癸:"子" };
const SS_YANGREN = { 甲:"卯",丙:"午",戊:"午",庚:"酉",壬:"子" };
const SS_TRINE = { 申:"申子辰",子:"申子辰",辰:"申子辰",寅:"寅午戌",午:"寅午戌",戌:"寅午戌",巳:"巳酉丑",酉:"巳酉丑",丑:"巳酉丑",亥:"亥卯未",卯:"亥卯未",未:"亥卯未" };
const SS_TAOHUA = { 申子辰:"酉",寅午戌:"卯",巳酉丑:"午",亥卯未:"子" };
const SS_YIMA = { 申子辰:"寅",寅午戌:"申",巳酉丑:"亥",亥卯未:"巳" };
const SS_HUAGAI = { 申子辰:"辰",寅午戌:"戌",巳酉丑:"丑",亥卯未:"未" };
const SS_JIANGXING = { 申子辰:"子",寅午戌:"午",巳酉丑:"酉",亥卯未:"卯" };
const SS_JIESHA = { 申子辰:"巳",寅午戌:"亥",巳酉丑:"寅",亥卯未:"申" };
function computeShensha(r) {
  const P = [{ k:"year", b:r.year[1] }, { k:"month", b:r.month[1] }, { k:"day", b:r.day[1] }];
  if (r.hour) P.push({ k:"hour", b:r.hour[1] });
  const dgan = r.dayMaster, ybr = r.year[1], grp = SS_TRINE[ybr];
  const out = [];
  const posOf = targets => P.filter(p => targets.indexOf(p.b) >= 0).map(p => p.k);
  const add = (key, targets) => { const pos = posOf(targets); if (pos.length) out.push({ key, targets, positions: pos }); };
  add("tianyi", SS_TIANYI[dgan]);
  add("wenchang", [SS_WENCHANG[dgan]]);
  add("lu", [SS_LU[dgan]]);
  if (SS_YANGREN[dgan]) add("yangren", [SS_YANGREN[dgan]]);
  add("taohua", [SS_TAOHUA[grp]]);
  add("yima", [SS_YIMA[grp]]);
  add("huagai", [SS_HUAGAI[grp]]);
  add("jiangxing", [SS_JIANGXING[grp]]);
  add("jiesha", [SS_JIESHA[grp]]);
  // 旬空 (以日柱)
  const di = ((n => { const si = GAN.indexOf(r.day[0]), bi = ZHI.indexOf(r.day[1]); for (let x = 0; x < 60; x++) if (x % 10 === si && x % 12 === bi) return x; return 0; })());
  const n0 = di - di % 10;
  add("kongwang", [ZHI[(n0 + 10) % 12], ZHI[(n0 + 11) % 12]]);
  return out;
}

// ============ 日主旺衰 + 喜用神 (加权打分) ============
// 藏干全表 (本气/中气/余气)
const HIDDEN = { 子:["癸"],丑:["己","癸","辛"],寅:["甲","丙","戊"],卯:["乙"],辰:["戊","乙","癸"],巳:["丙","戊","庚"],午:["丁","己"],未:["己","丁","乙"],申:["庚","壬","戊"],酉:["辛"],戌:["戊","辛","丁"],亥:["壬","甲"] };
const WX_ORDER = ["wood","fire","earth","metal","water"];   // 相生序: 木→火→土→金→水→木
const shengOf = e => WX_ORDER[(WX_ORDER.indexOf(e) + 1) % 5];  // e 生 —>
const keOf = e => WX_ORDER[(WX_ORDER.indexOf(e) + 2) % 5];     // e 克 —>
/**
 * 扶抑法打分: 天干按位置计分; 地支藏干按 本气/中气/余气 分权重; 月支(月令)基数加倍。
 * 同党(印+比劫) vs 异党(食伤+财+官杀) 定日主强弱, 据此定喜用/忌神。
 */
function computeStrength(r) {
  const score = { wood:0, fire:0, earth:0, metal:0, water:0 };
  const detail = [];
  // 天干: 年10 月15 日15 时10
  const stems = [["year", r.year[0], 10], ["month", r.month[0], 15], ["day", r.day[0], 15], ["hour", r.hour ? r.hour[0] : null, 10]];
  for (const [pos, st, w] of stems) if (st) { score[GAN_WX[st]] += w; detail.push({ pos, kind:"stem", stem:st, role:-1, pts:w }); }
  // 地支藏干: 基数 年30 月60(得令) 日30 时30; 本:中:余 权重
  const RATIO = { 1:[1], 2:[0.7, 0.3], 3:[0.6, 0.3, 0.1] };
  const branches = [["year", r.year[1], 30], ["month", r.month[1], 60], ["day", r.day[1], 30], ["hour", r.hour ? r.hour[1] : null, 30]];
  for (const [pos, br, base] of branches) {
    if (!br) continue;
    const hid = HIDDEN[br], rs = RATIO[hid.length] || RATIO[3];
    hid.forEach((hs, i) => { const pts = +(base * rs[i]).toFixed(1); score[GAN_WX[hs]] += pts; detail.push({ pos, kind:"branch", branch:br, stem:hs, role:i, pts }); });
  }
  // ---- 合化 / 合绊 调整: 合化成功→两干化为化神; 合而不化→羁绊减力; 三合三会成局→化神加力 ----
  const STEM_W = { year:10, month:15, day:15, hour:10 };
  const stemAt = { year:r.year[0], month:r.month[0], day:r.day[0], hour:r.hour ? r.hour[0] : null };
  const pil = [{ k:"year", stem:r.year[0], branch:r.year[1] }, { k:"month", stem:r.month[0], branch:r.month[1] }, { k:"day", stem:r.day[0], branch:r.day[1] }];
  if (r.hour) pil.push({ k:"hour", stem:r.hour[0], branch:r.hour[1] });
  const huaNotes = [];
  for (const x of computeRelations(pil)) {
    if (x.type === "he") {
      const pa = x.members[0], pb = x.members[1], sa = stemAt[pa], sb = stemAt[pb], wa = STEM_W[pa], wb = STEM_W[pb];
      const involvesDay = pa === "day" || pb === "day";
      if (x.hua && !involvesDay) {
        score[GAN_WX[sa]] -= wa; score[GAN_WX[sb]] -= wb; score[x.elem] += wa + wb;
        huaNotes.push({ kind:"hua", chars:x.chars, elem:x.elem });
      } else if (x.hua && involvesDay) {
        const op = pa === "day" ? pb : pa, os = pa === "day" ? sb : sa;
        score[GAN_WX[os]] -= STEM_W[op] * 0.3;
        huaNotes.push({ kind:"bind", chars:x.chars, elem:null });
      } else {
        if (pa !== "day") score[GAN_WX[sa]] -= wa * 0.4;
        if (pb !== "day") score[GAN_WX[sb]] -= wb * 0.4;
        huaNotes.push({ kind:"bind", chars:x.chars, elem:null });
      }
    } else if (x.type === "sanhe") { score[x.elem] += x.hua ? 20 : 8; huaNotes.push({ kind:x.hua ? "ju" : "halfju", chars:x.chars, elem:x.elem }); }
    else if (x.type === "sanhui") { score[x.elem] += 22; huaNotes.push({ kind:"hui", chars:x.chars, elem:x.elem }); }
    else if (x.type === "banhe") { score[x.elem] += x.hua ? 10 : 4; if (x.hua) huaNotes.push({ kind:"halfju", chars:x.chars, elem:x.elem }); }
    else if (x.type === "liuhe" && x.hua) { score[x.elem] += 8; huaNotes.push({ kind:"hua", chars:x.chars, elem:x.elem }); }
  }
  for (const k in score) { if (score[k] < 0) score[k] = 0; score[k] = +score[k].toFixed(1); }

  const dmE = GAN_WX[r.dayMaster];
  const yin = WX_ORDER.find(e => shengOf(e) === dmE);   // 生我=印
  const bi = dmE;                                        // 同我=比劫
  const shi = shengOf(dmE);                              // 我生=食伤
  const cai = keOf(dmE);                                 // 我克=财
  const guan = WX_ORDER.find(e => keOf(e) === dmE);      // 克我=官杀
  const support = +(score[yin] + score[bi]).toFixed(1);
  const drain = +(score[shi] + score[cai] + score[guan]).toFixed(1);
  const total = +(support + drain).toFixed(1);
  const ratio = total ? +(support / total).toFixed(3) : 0.5;
  const level = ratio >= 0.56 ? "strong" : ratio <= 0.44 ? "weak" : "balanced";
  let favor = [], avoid = [];
  if (level === "strong") { favor = [shi, cai, guan]; avoid = [yin, bi]; }
  else if (level === "weak") { favor = [yin, bi]; avoid = [shi, cai, guan]; }
  // 用神: 喜用五行中当前分数最低者(最需引入/补强的平衡点)
  const useGod = favor.length ? favor.slice().sort((a, b) => score[a] - score[b])[0] : null;
  return { score, dmElement:dmE, roles:{ yin, bi, shi, cai, guan }, support, drain, total, ratio, level, favor, avoid, useGod, detail, huaNotes };
}

// ============ 六十甲子纳音 (30 组, 每组辖两干支) ============
const NAYIN = [["海中金","metal"],["炉中火","fire"],["大林木","wood"],["路旁土","earth"],["剑锋金","metal"],
  ["山头火","fire"],["涧下水","water"],["城头土","earth"],["白蜡金","metal"],["杨柳木","wood"],
  ["泉中水","water"],["屋上土","earth"],["霹雳火","fire"],["松柏木","wood"],["长流水","water"],
  ["沙中金","metal"],["山下火","fire"],["平地木","wood"],["壁上土","earth"],["金箔金","metal"],
  ["覆灯火","fire"],["天河水","water"],["大驿土","earth"],["钗钏金","metal"],["桑柘木","wood"],
  ["大溪水","water"],["沙中土","earth"],["天上火","fire"],["石榴木","wood"],["大海水","water"]];
function jiaziIndexGZ(gz) {
  const si = GAN.indexOf(gz[0]), bi = ZHI.indexOf(gz[1]);
  for (let n = 0; n < 60; n++) if (n % 10 === si && n % 12 === bi) return n;
  return -1;
}
// 纳音: 传入干支(如"甲子") -> {idx, name, elem}
function nayin(gz) {
  const n = jiaziIndexGZ(gz); if (n < 0) return null;
  const [name, elem] = NAYIN[Math.floor(n / 2)];
  return { idx: n, name, elem };
}

// ============ 干支关系: 合 冲 刑 害 会 ============
const STEM_HE = { 甲:"己",己:"甲",乙:"庚",庚:"乙",丙:"辛",辛:"丙",丁:"壬",壬:"丁",戊:"癸",癸:"戊" };
const STEM_HE_ELEM = { 甲己:"earth",乙庚:"metal",丙辛:"water",丁壬:"wood",戊癸:"fire" };
const STEM_CHONG = { 甲:"庚",庚:"甲",乙:"辛",辛:"乙",丙:"壬",壬:"丙",丁:"癸",癸:"丁" };
const ZHI_CHONG = { 子:"午",午:"子",丑:"未",未:"丑",寅:"申",申:"寅",卯:"酉",酉:"卯",辰:"戌",戌:"辰",巳:"亥",亥:"巳" };
const ZHI_LIUHE = { 子:"丑",丑:"子",寅:"亥",亥:"寅",卯:"戌",戌:"卯",辰:"酉",酉:"辰",巳:"申",申:"巳",午:"未",未:"午" };
const ZHI_LIUHE_ELEM = { 子丑:"earth",寅亥:"wood",卯戌:"fire",辰酉:"metal",巳申:"water",午未:"fire" };
const ZHI_HAI = { 子:"未",未:"子",丑:"午",午:"丑",寅:"巳",巳:"寅",卯:"辰",辰:"卯",申:"亥",亥:"申",酉:"戌",戌:"酉" };
const XING_PAIRS = new Set(["寅巳","巳寅","巳申","申巳","丑戌","戌丑","戌未","未戌","子卯","卯子"]);
const SELF_XING = new Set(["辰","午","酉","亥"]);
const SANHE = [["申","子","辰","water"],["亥","卯","未","wood"],["寅","午","戌","fire"],["巳","酉","丑","metal"]];
const SANHE_WANG = { water:"子",wood:"卯",fire:"午",metal:"酉" };
const SANHUI = [["寅","卯","辰","wood"],["巳","午","未","fire"],["申","酉","戌","metal"],["亥","子","丑","water"]];

/**
 * 扫描四柱(或含大运/流年)之间的干支关系。
 * @param pillars [{k, stem, branch}]  k: year|month|day|hour|luck|fleet
 * @returns [{scope, type, chars, elem, members:[k...]}]
 */
function computeRelations(pillars) {
  const P = pillars.filter(Boolean);
  const out = [];
  // 合化条件: 化神得月令(月支本气为化神或生化神) + 无争合妒合
  const monthP = P.find(p => p.k === "month");
  const monthElem = monthP ? GAN_WX[ZHI_MAIN[monthP.branch]] : null;
  const stemsAll = P.map(p => p.stem).filter(Boolean);
  const deLing = E => monthElem != null && (monthElem === E || shengOf(monthElem) === E);
  const zhengHe = (a, b) => stemsAll.filter(x => x === a).length > 1 || stemsAll.filter(x => x === b).length > 1;
  const huaInfo = (E, a, b) => {
    const z = a != null && zhengHe(a, b);
    const dl = deLing(E);
    return { hua: dl && !z, reason: z ? "zhenghe" : dl ? "ok" : "buleling" };
  };
  // ---- 天干: 五合 / 相冲 ----
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i].stem, b = P[j].stem; if (!a || !b) continue;
    if (STEM_HE[a] === b) { const E = STEM_HE_ELEM[a+b]||STEM_HE_ELEM[b+a], h = huaInfo(E, a, b); out.push({ scope:"stem", type:"he", chars:a+b, elem:E, members:[P[i].k,P[j].k], hua:h.hua, huaReason:h.reason }); }
    if (STEM_CHONG[a] === b) out.push({ scope:"stem", type:"chong", chars:a+b, elem:null, members:[P[i].k,P[j].k] });
  }
  // ---- 地支: 六冲 / 六合 / 六害 / 刑 / 自刑 ----
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i].branch, b = P[j].branch, m = [P[i].k, P[j].k]; if (!a || !b) continue;
    if (ZHI_CHONG[a] === b) out.push({ scope:"branch", type:"chong", chars:a+b, elem:null, members:m });
    if (ZHI_LIUHE[a] === b) { const E = ZHI_LIUHE_ELEM[a+b]||ZHI_LIUHE_ELEM[b+a], h = huaInfo(E, null, null); out.push({ scope:"branch", type:"liuhe", chars:a+b, elem:E, members:m, hua:h.hua, huaReason:h.reason }); }
    if (ZHI_HAI[a] === b) out.push({ scope:"branch", type:"hai", chars:a+b, elem:null, members:m });
    if (XING_PAIRS.has(a+b)) out.push({ scope:"branch", type:"xing", chars:a+b, elem:null, members:m });
    if (a === b && SELF_XING.has(a)) out.push({ scope:"branch", type:"selfxing", chars:a+b, elem:null, members:m });
  }
  // ---- 地支三合 / 半合 / 三会 (按不同字判断) ----
  const membersOf = chars => P.filter(p => chars.includes(p.branch)).map(p => p.k);
  for (const [x, y, z, elem] of SANHE) {
    const present = [x, y, z].filter(c => P.some(p => p.branch === c));
    if (present.length === 3) { const h = huaInfo(elem, null, null); out.push({ scope:"branch", type:"sanhe", chars:x+y+z, elem, members:membersOf([x,y,z]), hua:h.hua, huaReason:h.reason }); }
    else if (present.length === 2 && present.includes(SANHE_WANG[elem])) { const h = huaInfo(elem, null, null); out.push({ scope:"branch", type:"banhe", chars:present.join(""), elem, members:membersOf(present), hua:h.hua, huaReason:h.reason }); }
  }
  for (const [x, y, z, elem] of SANHUI) {
    if ([x, y, z].every(c => P.some(p => p.branch === c))) out.push({ scope:"branch", type:"sanhui", chars:x+y+z, elem, members:membersOf([x,y,z]) });
  }
  return out;
}

// 十神
function tenGod(dm, other) {
  const ORDER = "wood,fire,earth,metal,water".split(",");
  const dwx = ORDER.indexOf(GAN_WX[dm]), owx = ORDER.indexOf(GAN_WX[other]);
  const same = (GAN.indexOf(dm) % 2) === (GAN.indexOf(other) % 2);
  const rel = (owx - dwx + 5) % 5;
  const T = {
    0: ["比肩", "劫财"], 1: ["食神", "伤官"], 2: ["偏财", "正财"], 3: ["七杀", "正官"], 4: ["偏印", "正印"],
  };
  return T[rel][same ? 0 : 1];
}

if (typeof module !== "undefined") module.exports = { computeChart, computeLuck, computeRelations, computeStrength, computeFleetYears, computeShensha, luckFortune, trueSolarDelta, computeCompat, computePattern, nayin, tenGod, GAN, ZHI, GAN_WX, ZHI_MAIN, SIGNS };
