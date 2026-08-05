// 对拍: node tests/test.js  (先跑 python3 tests/gen_cases.py 生成用例)
const fs = require("fs");
const TERMS = JSON.parse(fs.readFileSync(__dirname + "/../data/terms.json", "utf8"));
const { computeChart } = require(__dirname + "/../src/engine.js");
const cases = JSON.parse(fs.readFileSync(__dirname + "/cases.json", "utf8"));
let pass = 0, fail = 0;
for (const c of cases) {
  const r = computeChart(TERMS, { y: c.y, m: c.m, d: c.d, hh: c.hh, mi: c.mi, tzMin: c.tz, timeKnown: true });
  const ok = JSON.stringify([r.year, r.month, r.day, r.hour]) === JSON.stringify(c.exp);
  ok ? pass++ : (fail++, fail <= 10 && console.log("DIFF", JSON.stringify(c), "got", [r.year, r.month, r.day, r.hour].join(" ")));
}
console.log(`pass ${pass} / ${pass + fail}  (预期存在少量 DIFF: 参考库的流派/日粒度口径差异, 见 tests/README.md)`);
const r = computeChart(TERMS, { y: 2000, m: 9, d: 11, hh: 14, mi: 30, tzMin: 480, timeKnown: true });
console.log("基准 2000-09-11 14:30 +8:", r.year, r.month, r.day, r.hour, r.sign);
