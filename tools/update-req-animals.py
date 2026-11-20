from pathlib import Path
p=Path(r'D:\桌面\田园小镇\需求文档.md')
t=p.read_text(encoding='utf-8')
t=t.replace('挖矿已上线；','挖矿、牧场动物（鸡/鸭/鹅/牛/羊/猫/狗，鸡蛋/牛奶/羊毛牧产指令）已上线；')
p.write_text(t,encoding='utf-8')
print('ok')
