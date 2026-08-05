# 引擎对拍

```bash
pip install sxtwl cnlunar pyswisseph
python3 tests/gen_cases.py   # 用 sxtwl/cnlunar 生成期望值 -> tests/cases.json
node tests/test.js
```

443 例中约 7 例 DIFF,全部为参考库口径差异而非引擎错误:
- sxtwl 月柱按"日"粒度切换 —— 节气当天、交节时刻之前出生的用例,本引擎按分钟级判定仍属上月(正确)
- cnlunar 年柱以春节为界 —— 本引擎按子平标准以立春为界
- 起运/大运需按"节"(非中气)计算,本仓库引擎口径:立春换年、十二节定月、晚子时(23:00+)日柱归次日
