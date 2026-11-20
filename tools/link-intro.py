from pathlib import Path
p=Path(r'D:\桌面\田园小镇\README.md')
t=p.read_text(encoding='utf-8')
t=t.replace('> 完整规则见 **[docs/游戏规则.md](docs/游戏规则.md)**（含阶段解锁表、经济价格、指令与村民规则）。','> 完整规则见 **[docs/游戏规则.md](docs/游戏规则.md)**；仓库简介 / Topics / 上传步骤见 **[docs/仓库介绍.md](docs/仓库介绍.md)**。')
p.write_text(t,encoding='utf-8')
print('ok')
