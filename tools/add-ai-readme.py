from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')
anchor = '### 操作'
block = '''### DeepSeek 角色对话（可选）

当前只保留 **小伟** 和 **小杨** 两位主角，可以让他们用 DeepSeek 自己聊天、发展关系。

1. **在游戏里配置**：集市 → 设置 → DeepSeek 区域，填入 API Key（`sk-...`）和模型（默认 `deepseek-chat`），点「保存」，再点「测试连接」。
2. **或者用服务端 key**（推荐，key 不进浏览器）：
   ```bash
   set DEEPSEEK_API_KEY=sk-xxxx
   npm run dev
   ```
   页面会通过本地 `/api/deepseek` 代理调用，key 只留在服务端进程环境变量里。
3. **自动对话**：打开「自动」后，只要两人都醒着且至少一人空闲，每 45–75 秒会自动聊一次；对话会影响两人的情绪、信任和 **关系值**，最近对话会显示在设置面板里。
4. **手动触发**：点「让他们聊聊」立刻生成一段。
5. 没有配置 key 时，原有本地聊天/指令玩法不受影响；AI 只是可选增强。

> 浏览器直连 `api.deepseek.com` 可能被 CORS 拦住，所以优先走本地代理；API 调用会产生费用，自动对话频率已做限制。

'''
t = t.replace(anchor, block + anchor, 1)
p.write_text(t, encoding='utf-8')
print('inserted')
