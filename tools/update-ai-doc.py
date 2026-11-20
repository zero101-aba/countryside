from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')
start = t.index('### DeepSeek 角色对话（可选）')
end = t.index('### 操作', start)
block = '''### AI 角色对话（火山方舟 / DeepSeek）

当前只保留 **小伟** 和 **小杨** 两位主角，可以让他们用大模型自己聊天、发展关系。

1. **游戏内配置**：集市 → 设置 → AI 区域，选择「火山方舟（Ark）」或「DeepSeek」，填 API Key 和模型，点「保存」→「测试连接」。
   - Ark 默认模型：`deepseek-v4-1-flash-261017`
   - DeepSeek 默认模型：`deepseek-chat`
2. **服务端 Key（推荐，Key 不进浏览器）**：
   ```powershell
   $env:ARK_API_KEY="你的方舟 Key"
   npm run dev
   ```
   或 `$env:DEEPSEEK_API_KEY="sk-..."` 后启动；页面分别走 `/api/ark`、`/api/deepseek` 代理。
3. **自动对话**：打开「自动」后，只要两人都醒着且至少一人空闲，每 45–75 秒自动聊一次；对话会影响两人的情绪、信任和 **关系值**，最近对话显示在设置面板里。
4. **手动触发**：点「让他们聊聊」立刻生成一段。
5. 没有配置 Key 时，原有本地聊天/指令玩法不受影响；AI 只是可选增强。

> 方舟代理会关闭 thinking（`thinking: {type:'disabled'}`）以降低延迟和费用；API 调用会产生费用，自动对话频率已做限制。浏览器直连第三方 API 可能被 CORS 拦住，所以优先走本地代理。

'''
t = t[:start] + block + t[end:]
p.write_text(t, encoding='utf-8')
print('done')
