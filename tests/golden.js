// SPEC §10 golden cases — locks engine correctness. Run: node tests/golden.js
const fs = require("fs");
const TERMS = JSON.parse(fs.readFileSync(__dirname + "/../data/terms.json", "utf8"));
const { computeChart } = require(__dirname + "/../src/engine.js");
const C = (p) => computeChart(TERMS, Object.assign({ tzMin: 480, timeKnown: true }, p));

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const ok = got === exp;
  ok ? pass++ : (fail++, console.log(`  FAIL ${name}: got ${JSON.stringify(got)} exp ${JSON.stringify(exp)}`));
}

// 1. full chart + sign
const g1 = C({ y: 2000, m: 9, d: 11, hh: 14, mi: 30 });
eq("1.year", g1.year, "庚辰"); eq("1.month", g1.month, "乙酉");
eq("1.day", g1.day, "壬申"); eq("1.hour", g1.hour, "丁未"); eq("1.sign", g1.sign, "Virgo");

// 2. Lichun minute flip (立春 2000 = 20:40 CST)
eq("2.before", C({ y: 2000, m: 2, d: 4, hh: 20, mi: 39 }).year, "己卯");
eq("2.after",  C({ y: 2000, m: 2, d: 4, hh: 20, mi: 41 }).year, "庚辰");

// 3. late 子时 rolls the day + pre-Lichun year
const g3 = C({ y: 1976, m: 2, d: 3, hh: 23, mi: 30 });
eq("3.year", g3.year, "乙卯"); eq("3.day", g3.day, "丙戌"); eq("3.hour", g3.hour, "戊子");

// 4. sign boundary + jie-not-yet-reached month
eq("4a.sign", C({ y: 1995, m: 3, d: 21, hh: 12, mi: 0, tzMin: -300 }).sign, "Aries");
eq("4b.month", C({ y: 1998, m: 1, d: 5, hh: 16, mi: 30 }).month, "壬子");

// 5. same UTC instant, different tz -> Y/M/D pillars invariant, hour tracks local clock
const a = C({ y: 2000, m: 9, d: 11, hh: 14, mi: 30, tzMin: 480 });   // 06:30 UTC
const b = C({ y: 2000, m: 9, d: 11, hh: 6,  mi: 30, tzMin: 0 });     // 06:30 UTC
eq("5.year",  a.year,  b.year);  eq("5.month", a.month, b.month); eq("5.day", a.day, b.day);
eq("5.hourDiffers", a.hour !== b.hour, true);

// 6. unknown time -> 3 pillars, no hour
const g6 = C({ y: 2000, m: 9, d: 11, timeKnown: false });
eq("6.noHour", g6.hour, null); eq("6.year", g6.year, "庚辰");

console.log(`golden: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
