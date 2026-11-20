from pathlib import Path
import re
p = Path(r'D:\桌面\田园小镇\docs\游戏简介-350字.md')
t = p.read_text(encoding='utf-8')
body = t.split('\n', 2)[2].strip()
plain = re.sub(r'\s+', '', body)
print('含标点字数 =', len(plain))
cn = len(re.findall(r'[\u4e00-\u9fff]', body))
print('纯汉字数 =', cn)
