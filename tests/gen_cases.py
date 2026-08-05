# -*- coding: utf-8 -*-
import sxtwl, json, random, datetime as dt
Gan = "甲乙丙丁戊己庚辛壬癸"; Zhi = "子丑寅卯辰巳午未申酉戌亥"
random.seed(42)
cases = []
# 400 随机用例 (北京时间, 时辰 0-22 点, sxtwl 出期望)
for _ in range(400):
    y = random.randint(1935, 2029)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    hh = random.randint(0, 22); mi = random.choice([0, 15, 30, 59])
    day = sxtwl.fromSolar(y, m, d)
    yGZ, mGZ, dGZ, hGZ = day.getYearGZ(), day.getMonthGZ(), day.getDayGZ(), day.getHourGZ(hh)
    cases.append({"y": y, "m": m, "d": d, "hh": hh, "mi": mi, "tz": 480,
                  "exp": [Gan[yGZ.tg]+Zhi[yGZ.dz], Gan[mGZ.tg]+Zhi[mGZ.dz], Gan[dGZ.tg]+Zhi[dGZ.dz], Gan[hGZ.tg]+Zhi[hGZ.dz]]})
# 立春边界日 + 节交界日专测 (2000-02-04 20:40 CST 立春)
for hh, mi in [(20, 39), (20, 41), (0, 0), (23, 30)]:
    day = sxtwl.fromSolar(2000, 2, 4)
    if hh == 23:
        continue  # sxtwl 晚子时口径另测
    yGZ, mGZ, dGZ, hGZ = day.getYearGZ(), day.getMonthGZ(), day.getDayGZ(), day.getHourGZ(hh)
    cases.append({"y": 2000, "m": 2, "d": 4, "hh": hh, "mi": mi, "tz": 480, "boundary": True,
                  "exp": None})  # sxtwl 年月柱按"日"给, 分钟级边界它给不了 -> 用 cnlunar 出期望
import cnlunar
for c in cases:
    if c.get("exp") is None or c.get("boundary"):
        lc = cnlunar.Lunar(dt.datetime(c["y"], c["m"], c["d"], c["hh"], c["mi"]), godType='8char')
        c["exp"] = [lc.year8Char, lc.month8Char, lc.day8Char, lc.twohour8Char]
# 晚子时用例 (23点, cnlunar 出期望)
for _ in range(40):
    y = random.randint(1935, 2029); m = random.randint(1, 12); d = random.randint(1, 27)
    lc = cnlunar.Lunar(dt.datetime(y, m, d, 23, 30), godType='8char')
    cases.append({"y": y, "m": m, "d": d, "hh": 23, "mi": 30, "tz": 480,
                  "exp": [lc.year8Char, lc.month8Char, lc.day8Char, lc.twohour8Char]})
json.dump(cases, open("tests/cases.json", "w"), ensure_ascii=False)
print("cases:", len(cases))
