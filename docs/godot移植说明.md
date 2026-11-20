# Godot 版移植说明

用 `D:\文档\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64.exe`（Godot 4.7.2 stable）把《田园小镇》做成了一个**原生工程**，路径在仓库的 `godot/`。

> Godot 工程是**独立**的，不影响网页版；网页版内容最全，Godot 版是可跑的原生优化版。

---

## 一、怎么运行

```powershell
# 编辑器打开
& "D:\文档\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64.exe" --path godot

# 直接运行
& "D:\文档\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64.exe" --path godot

# 无头自检（跑 300 帧后打印状态，并验证指令、阶段、服装购买）
& "D:\文档\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe" --headless --path godot --quit-after 300 -- smoke

# 指定场景截图（自动存到 godot/shots/godot-02.png）
& "...\Godot_v4.7.2-stable_win64_console.exe" --path godot --quit-after 200 -- shop
& "...\Godot_v4.7.2-stable_win64_console.exe" --path godot --quit-after 200 -- night rain
```

操作：滚轮缩放、左键拖动平移、点村民跟随（金色光圈）、点服装摊/委托板直接开面板、空格跳过夜晚。

---

## 二、优化点（v2 相比第一版）

| 项目 | v1 切片 | v2 优化版 |
|---|---|---|
| 寻路 | 手写 BFS + 每次排序 | 引擎 `AStarGrid2D`，障碍增量刷新 |
| 地图 | 40×30 单区域 | **80×56，四区域**（青禾村 / 西岭果园 / 后山林地 / 湖畔渔村）+ 双木桥、河湖、码头、营火、芦苇、小船、长椅 |
| 作物 | 3 种、两段造型 | **50 块农田**、5 种作物（萝卜/芜菁/胡萝卜/草莓/南瓜）、**四季阶段**、四段生长造型、成熟闪光 |
| 动物 | 11 只 | **21 只**（鸡/小鸡/牛/小牛/羊/小羊/鸭/小鸭/鹅/猫/狗），牧产就绪图标 |
| 村民 | 简单矩形小人 | **手工像素立绘**：头部/发型/眼睛眉毛/嘴/腮红、四方向、表情随情绪变化、走路腿臂摆动、工具（锄/斧/水壶/鱼竿/镐/篮子）、头顶名牌 |
| 自主行为 | 只会找农活 | 河边发呆、钓鱼、打盹、看花、收拾、找人聊天、**自己去集市买种子/卖库存** |
| 指令 | 关键词 + 序号 | 序号 / 全部 / 多人分配 / 排队 / 状态汇报 / 跳过夜晚 |
| 世界 | 昼夜 + 雨 | 昼夜渐变、窗户与路灯灯光、三层雨丝 + 落地涟漪 + 闪电、四季粒子（花瓣/落叶/雪） |
| 系统 | 阶段解锁 | 阶段解锁 + **每日委托（3 份，可领取）** + **9 个成就** + 每日小结卡片 |
| 商店 | 种子 + 服装 | 集市（5 种种子 + 面包）、仓库（单卖/全卖）、**服装店（10 套时装）**、设置 |
| UI | 默认控件 | **v4 按图像模型概念图重做**：木框 + 内嵌奶油纸、铜钉装饰、emoji 圆形图标键、村民卡片（绿框头像 + 名牌 + 🍎/⚡ 状态条）、行卡片 + 绿色操作按钮 + 琥珀高亮、标签页分段落、半透明遮罩、阴影层次 |
| 性能 | 每帧重建村民栏 | 村民栏签名缓存；只绘制可见区域；`AStarGrid2D` 寻路 |
| 存档 | 基础 | 金钱/种子/库存/时间/天气/阶段/成就/委托/时装/区域/村民状态/地块/树石/动物 |

![概念图 1（图像模型生成）](shots/ui-godot-1.png)

![概念图 2（图像模型生成）](shots/ui-godot-2.png)

![角色近景](shots/godot-closeup.png)

![农田](shots/godot-farm.png)

![果园](shots/godot-orchard.png)

![林地](shots/godot-forest.png)

![湖畔](shots/godot-lake.png)

![白天](shots/godot-day.png)

![夜晚与雨](shots/godot-night-rain.png)

![服装店](shots/godot-shop.png)

![档案与成就](shots/godot-stats.png)

![每日委托](shots/godot-quests.png)

---

## 三、已实现清单

- 地图与区域：56×40 程序化地形（草地/道路/广场/农田/河流/湖湾/沙岸），三区域解锁（第 2 天开河岸、阶段 4 开林地）
- 农业：开垦 / 播种 / 浇水 / 收获，湿润才生长、季节限制、四段造型、成熟提示
- 资源：砍树（树桩保留、木头 +2）、钓鱼（河岸解锁）、挖矿（后山、矿石/石头）
- 牧场：16 只动物自主溜达 + 产蛋/奶/毛，收牧产指令与就绪图标
- 村民：小伟与小杨，性格标签、需求、情绪五维、信任、心情表情、想法气泡、工作进度环
- 自主意愿：河边、钓鱼、打盹、看花、收拾、聊天、集市买卖（按性格与状态自动挑选）
- 指令系统：自然语言关键词 + 人数分配 + 排队 + 状态汇报 + 停下 + 跳夜
- 经济：种子购买、面包、作物与资源出售、自动出售开关
- 服装店：10 套时装，按阶段解锁购买，实时换装（小人造型与颜色同步变化）
- 阶段与成长：8 阶段解锁（委托板 / 牧场指令 / 8× / 挖矿 / 鱼价 / 矿价 / 关系 / 荣誉）
- 委托与成就：每日 3 份委托可领取，9 个成就自动检查并发奖励
- 世界表现：昼夜光照与灯光、雷雨、四季粒子、水面波光、风车转动
- 存档：`user://tianyuan_save.json` 全量保存

---

## 四、与网页版的差距（继续移植的方向）

| 网页版 | Godot 版现状 |
|---|---|
| 自然语言更复杂（范围词、模糊反问、改令） | 已支持序号/全部/多人；范围词与"别X了去Y"待补 |
| 17 只动物 + 猫狗陪伴交互 | 16 只，猫狗只是溜达 |
| 五区域大地图、快速前往、世界地图面板 | 三区域，无地图面板与快速前往 |
| AI 对话（火山方舟 / DeepSeek） | 未接，可用 `HTTPRequest` 调 `/api/ark` |
| 关系里程碑、AI 影响情绪 | 关系值已存，里程碑未接 |
| PWA / 手机触屏 | 桌面窗口为主，可导出 Android APK |

---

## 五、架构映射

| 网页版 | Godot 版 |
|---|---|
| `src/config.js` | `godot/scripts/data.gd`（`CROPS / ITEM_PRICE / ANIMALS / OUTFITS / STAGES / ACHIEVEMENTS / REGIONS`） |
| `src/world.js` | `_build_world()` |
| `src/path.js` | `AStarGrid2D` + `_path_to()` / `_nearest_open()` |
| `src/sim.js` | `_process()` / `_tick_crops()` / `_tick_animals()` / `_check_stage()` / `_check_achievements()` / `_check_day()` / 存档 |
| `src/villagers.js` | `_tick_villager()` / `_run_task()` / `_finish_work()` / `_feel()` |
| `src/desires.js` | `_tick_desire()` / `_pick_desire()` / `_do_market()` |
| `src/commander.js` | `_run_command()` / `_targets_for()` / `_number_in()` |
| `src/renderer.js` | `_draw()` 及各 `_draw_*` 函数 |
| `src/ui.js` | `_build_ui()` / `_render_sheet()` / `_update_hud()` |
| `src/llm.js` | 未实现，建议 `HTTPRequest` 走 `/api/ark` |

---

## 六、下一步

1. 接 AI 对话：`HTTPRequest` 调火山方舟 / 复用网页版 `/api/ark`，把回复接到关系值与情绪
2. 补自然语言：范围词、模糊反问、改令、任务队列合并汇报
3. 大地图：`TileMapLayer` + `NavigationRegion2D` 替换手写绘制与 A*
4. UI 主题资源化：把奶油纸质样式做成 `.tres` 主题，支持手机竖屏布局
5. 导出：`Project → Export` 出 Windows exe / Android APK
6. 数据同源：把网页版 `config.js` 数值导出成 JSON，两端共用，避免数值漂移
