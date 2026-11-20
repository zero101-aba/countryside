from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

t = t.replace(
    '3. **看执行**：他会自己寻路、绕开障碍、干活、搬运，进度环和想法实时可见。',
    '3. **跟随**：点地图上的小伟或小杨，视角会跟着他移动，顶部出现「👁 跟随」提示；点 ✕ 或拖动地图取消。\n4. **看执行**：他会自己寻路、绕开障碍、干活、搬运，进度环和想法实时可见。'
)
t = t.replace('4. **循环**：开垦 → 播种 → 浇水 → 收获 → 卖钱 → 买种子/升级。', '5. **循环**：开垦 → 播种 → 浇水 → 收获 → 卖钱 → 买种子/升级。')

anchor = '## 存档'
sec = '''## 手机安装

已内置 `manifest.webmanifest` + `icons/` + `sw.js`，可以当 PWA 装到手机上：

1. 电脑上运行 `npm run dev`，确保手机和电脑在同一个 Wi-Fi
2. 手机浏览器打开 `http://<电脑局域网IP>:5180/`（Windows 上用 `ipconfig` 查 IPv4）
3. 浏览器菜单 → **添加到主屏幕**，之后可以全屏打开
4. 也可以把 `dist/` 整个文件夹部署到任意静态服务器

仓库里已经打包好：`release/田园小镇-手机版.zip`（解压即 dist 内容，含安装说明）。

> Service Worker 需要 HTTPS 或 localhost 才会启用离线缓存；局域网 HTTP 下浏览器会忽略，但游戏照常运行。

'''
t = t.replace(anchor, sec + anchor, 1)
p.write_text(t, encoding='utf-8')
print('ok')
