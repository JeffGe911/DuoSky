// 解读层不变量测试: node tests/reading.js
// 验证喜用/忌神/用神/吉凶等解读层输出的一致性与健壮性(golden.js 只验四柱排盘)。
const fs = require("fs");
const TERMS = JSON.parse(fs.readFileSync(__dirname + "/../data/terms.json", "utf8"));
const E = require(__dirname + "/../src/engine.js");
const { computeChart, computeStrength, computeYongshen, luckAssess, computePattern, computeClimate, computeShensha, computeLuck } = E;
const ELS = ["wood", "fire", "earth", "metal", "water"];
const GRADES = ["daji", "ji", "ping", "xiong", "daxiong"];
const LEVELS = ["good", "neutral", "bad"];

let pass = 0, fail = 0, warn = 0;
const fails = [];
const check = (cond, msg) => { if (cond) pass++; else { fail++; if (fails.length < 20) fails.push(msg); } };

let n = 0, ysInFavor = 0;
for (let y = 1940; y <= 2015; y += 1)
  for (const [m, d] of [[2, 12], [5, 20], [8, 8], [11, 28]])
    for (const notime of [false, true]) {
      const gender = (y + m + d) % 2 === 0 ? "m" : "f";
      const tag = `${y}-${m}-${d}${notime ? "NT" : ""}/${gender}`;
      n++;
      const r = computeChart(TERMS, { y, m, d, hh: notime ? 12 : 9, mi: 0, tzMin: 480, timeKnown: !notime });
      check(r && r.year && r.month && r.day && (notime || r.hour), `${tag}: chart pillars missing`);
      const s = computeStrength(r);
      check(s.favor.length >= 1, `${tag}: favor empty`);
      check(s.avoid.length >= 1, `${tag}: avoid empty`);
      check(!!s.useGod, `${tag}: useGod empty`);
      check(["strong", "weak", "balanced"].indexOf(s.level) >= 0, `${tag}: bad level ${s.level}`);
      check(s.favor.every(e => ELS.indexOf(e) >= 0), `${tag}: favor has non-element`);
      check(s.favor.every(e => s.avoid.indexOf(e) < 0), `${tag}: favor/avoid overlap ${s.favor}|${s.avoid}`);
      const ys = computeYongshen(r, s);
      check(ys && ELS.indexOf(ys.element) >= 0, `${tag}: bad yongshen element`);
      if (ys && s.favor.indexOf(ys.element) >= 0) ysInFavor++; else warn++;   // 用神应属喜用(记为观察项)
      const pt = computePattern(r);
      check(pt && pt.key, `${tag}: pattern missing key`);
      computeClimate(r, s);                     // 不抛即可
      check(Array.isArray(computeShensha(r)), `${tag}: shensha not array`);
      // luckAssess 对流年干支
      const idx = ((y + 40 - 1984) % 60 + 60) % 60, gz = E.GAN[idx % 10] + E.ZHI[idx % 12];
      const a = luckAssess(r, gz, s);
      check(typeof a.score === "number" && isFinite(a.score), `${tag}: luckAssess score NaN`);
      check(GRADES.indexOf(a.grade) >= 0, `${tag}: bad grade ${a.grade}`);
      check(LEVELS.indexOf(a.level) >= 0, `${tag}: bad level ${a.level}`);
      const lk = computeLuck(TERMS, { y, m, d, hh: notime ? 12 : 9, mi: 0, tzMin: 480, timeKnown: !notime }, { yearStem: r.year[0], monthGZ: r.month, gender });
      check(lk && (lk.error || Array.isArray(lk.list)), `${tag}: computeLuck bad shape`);
    }

console.log(`charts ${n} · assertions ${pass} passed, ${fail} failed`);
console.log(`用神∈喜用: ${ysInFavor}/${n} (${(ysInFavor / n * 100).toFixed(1)}%) · 其余 ${warn} 例为观察项`);
if (fails.length) { console.log("first failures:"); fails.forEach(f => console.log("  " + f)); }
process.exit(fail ? 1 : 0);
