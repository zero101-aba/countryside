from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

t = t.replace(
    '- 「照看庄稼」「钓鱼」「找人聊天」会直接当成自己的活去干',
    '- 「照看庄稼」「钓鱼」「找人聊天」会直接当成自己的活去干\n- **会自己去集市买卖**：小杨发现种子不够时会走去集市买种子；小伟看到仓库堆货或缺钱时会去集市把木头、鱼、蛋、奶、羊毛卖掉\n- 交易会在气泡和消息里说清楚：「买了萝卜种子×2」「把 5 个木头卖了 +70G」'
)

anchor = '| 天气、昼夜与夜晚 |'
add = '| 自己去集市买种子 | |\n|---|---|\n| ![集市买卖](shots/296-market-trade.png) | |\n\n'
t = t.replace(anchor, add + anchor, 1)
p.write_text(t, encoding='utf-8')
print('ok')
