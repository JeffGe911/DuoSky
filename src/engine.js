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

if (typeof module !== "undefined") module.exports = { computeChart, tenGod, GAN, ZHI, GAN_WX, ZHI_MAIN, SIGNS };
