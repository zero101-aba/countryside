from pathlib import Path
p=Path(r'D:\桌面\田园小镇\README.md')
t=p.read_text(encoding='utf-8')
t=t.replace('set DEEPSEEK_API_KEY=sk-xxxx','$env:DEEPSEEK_API_KEY="sk-xxxx"')
p.write_text(t,encoding='utf-8')
print('ok')
