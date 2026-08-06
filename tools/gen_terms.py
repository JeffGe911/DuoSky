# -*- coding: utf-8 -*-
import os
"""生成 1900-2150 每年 24 节气(上界给大运/流年留足未来)的 UTC 时刻(分钟精度), 太阳黄经 15° 整倍数交角二分法"""
import swisseph as swe, json, datetime as dt

def sunlon(jd):
    return swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)[0][0]

def jd_to_dt(jd):
    y, m, d, h = swe.revjul(jd)
    hh = int(h); mi = int(round((h - hh) * 60))
    if mi == 60: mi = 0; hh += 1
    base = dt.datetime(y, m, d) + dt.timedelta(hours=hh, minutes=mi)
    return base

result = {}
for year in range(1900, 2151):
    jd0 = swe.julday(year, 1, 1, 0.0)
    jd1 = swe.julday(year + 1, 1, 1, 0.0)
    terms = []
    prev_jd, prev_lon = jd0, sunlon(jd0)
    unwrap = 0.0
    prev_u = prev_lon
    jd = jd0
    step = 0.25  # 6小时粗扫
    while jd < jd1:
        jd2 = min(jd + step, jd1)
        lon2 = sunlon(jd2)
        u2 = lon2 + unwrap
        if u2 < prev_u - 180:  # 过 360 -> 0
            unwrap += 360.0
            u2 = lon2 + unwrap
        # 检查是否跨过 15 的整数倍
        k1, k2 = int(prev_u // 15), int(u2 // 15)
        if k2 > k1:
            target_u = (k1 + 1) * 15.0
            lo, hi = prev_jd, jd2
            for _ in range(40):  # 二分到 <1s
                mid = (lo + hi) / 2
                lm = sunlon(mid) + unwrap
                if lm < target_u - 180: lm += 360
                if lm >= target_u: hi = mid
                else: lo = mid
            t = jd_to_dt((lo + hi) / 2)
            deg = int(target_u % 360)
            terms.append([deg, t.strftime("%m%d%H%M")])
        prev_jd, prev_u = jd2, u2
        jd = jd2
    assert len(terms) == 24, (year, len(terms))
    result[str(year)] = terms

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "terms.json")
with open(OUT, "w") as f:
    json.dump(result, f, separators=(",", ":"))
print("years:", len(result), "| size:", len(json.dumps(result, separators=(',', ':'))), "bytes")

# 抽查验证: 与 sxtwl 的节气日期对拍 (sxtwl 按北京时间日界) — 可选, 未装则跳过
try:
    import sxtwl
except ImportError:
    print("(sxtwl not installed — skipping cross-check)"); sxtwl = None
jqmc = ["冬至","小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种",
        "夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪"]
name_by_deg = {285:"小寒",300:"大寒",315:"立春",330:"雨水",345:"惊蛰",0:"春分",15:"清明",30:"谷雨",
               45:"立夏",60:"小满",75:"芒种",90:"夏至",105:"小暑",120:"大暑",135:"立秋",150:"处暑",
               165:"白露",180:"秋分",195:"寒露",210:"霜降",225:"立冬",240:"小雪",255:"大雪",270:"冬至"}
bad = 0; checked = 0
for year in ([] if sxtwl is None else (1943, 1969, 2000, 2017, 2026)):
    # sxtwl 扫全年节气日
    sx = {}
    d = dt.date(year, 1, 1)
    while d.year == year:
        sd = sxtwl.fromSolar(d.year, d.month, d.day)
        if sd.hasJieQi():
            sx[jqmc[sd.getJieQi()]] = d
        d += dt.timedelta(days=1)
    for deg, s in result[str(year)]:
        t_utc = dt.datetime(year, int(s[:2]), int(s[2:4]), int(s[4:6]), int(s[6:8]))
        t_cst = t_utc + dt.timedelta(hours=8)
        nm = name_by_deg[deg]
        checked += 1
        if nm in sx and sx[nm] != t_cst.date():
            bad += 1
            print("MISMATCH", year, nm, "mine:", t_cst.date(), "sxtwl:", sx[nm])
print("抽查 %d 项, 日期不一致 %d 项" % (checked, bad))
print("2000立春(CST):", [ (dt.datetime(2000,int(s[:2]),int(s[2:4]),int(s[4:6]),int(s[6:8]))+dt.timedelta(hours=8)).strftime("%m-%d %H:%M") for deg,s in result["2000"] if deg==315 ])
