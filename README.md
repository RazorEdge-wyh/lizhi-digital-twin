# 立志楼 · 未来智能空间建筑数字孪生面板
**Lizhi Building · Intelligent Space Digital Twin Console**

湖南科技大学立志楼的三维数字孪生界面：一个游戏感（game-like）的入口页，加一个仿 Unity / Godot 风格的建筑运行控制台。整体视觉基于液态玻璃（Liquid Glass）材质：真实的边缘折射、镜面高光、噪点薄膜与多层半透明面板。

An end-to-end front-end for the Lizhi Building at Hunan University of Science and Technology: a cinematic landing screen that opens into an engine-editor-style console (menu bar, hierarchy, viewport, monitor, sensor status bar) built on a liquid-glass material system.

---

## 界面 / Screens

### 1. 入口页 · Landing

- 全屏立志楼夜景背景（程序化生成，2K，无第三方素材）
- 左侧居中主标题「立志楼」艺术字：渐变填充 + 描边 + 外发光 + 工程感蓝色标尺线
- 副标题 `LIZHI BUILDING`、小标题「未来智能空间建筑」与项目说明
- 主按钮「开始探索 / START EXPLORING」：真实折射的液态玻璃按钮，点击后淡入细节面板
- 右上角实时状态胶囊（点位在线率 / 时间）、底部坐标与标准信息

### 2. 细节面板 · Detail console

类 Unity / Godot 的简化编辑器布局，全部面板使用毛玻璃材质：

| 区域 | 内容 |
| --- | --- |
| **上方菜单栏** | 项目（新建 / 打开 / 最近 / 保存 / 导入 / 导出 / 返回）、视图（三维模型 / 平面图 / 数据面板 / 全楼 / 面板开关）、监测（暂停数据流 / 刷新 / 点位自检 / 告警订阅）、帮助；中间显示当前工程路径与保存时间 |
| **左侧层级 Hierarchy** | 建筑 → 楼层（F1–F8）→ 功能区 → 传感器组，可展开折叠、单击选中、双击聚焦；底部显示所选楼层点位统计 |
| **中央视口 Viewport** | 三种模式：**三维模型**（等距楼层堆叠，选中楼层高亮，异常楼层变色，扫描光带）、**平面图**（房间 + 传感点位 + 比例尺 / 指北针）、**数据面板**（逐点位遥测表格 + 24h 趋势） |
| **右侧监视器 Monitor** | 多路监视画面，四种通道实时绘制：深度态势（波形）、热成像（热力阵列 + 十字测温）、无线感知（雷达扫描）、人流统计（分区柱状）；可暂停、可单路放大 |
| **下方状态栏 Status bar** | 八个楼层瓦片（温度 / 湿度 / CO₂ / 人数 / 电耗 / PMV + 迷你趋势线），右侧全楼汇总（总负荷、在场人数、在线率、平均 CO₂、光伏出力） |

交互：`1`–`8` 选择楼层，`M` / `P` / `D` 切换视图，`F` 切换全楼，`空格` 暂停数据流，`Ctrl/⌘+S` 保存，`Esc` 返回入口页。深链接 `#console` 可直接进入控制台。

---

## 液态玻璃的实现 / How the glass works

`src/components/LiquidGlass.tsx` 分两层实现：

1. **CSS 玻璃基座** —— `backdrop-filter: blur() saturate()`、渐变玻璃体、内侧镜面高光、蚀刻发丝边、以及一层亚像素噪点薄膜，避免大面积模糊产生色带。
2. **真实折射** —— 在 canvas 上按圆角矩形 SDF 光栅化位移场（R 通道存水平位移、G 通道存垂直位移，中灰 128 为基准），编码成 data URL 交给 SVG `feDisplacementMap`，再作为该元素的 `backdrop-filter` 使用。玻璃边缘因此真正**折射背景**，即 Apple Liquid Glass 与 [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) 所采用的技术路线。位移图按尺寸缓存，仅在 `ResizeObserver` 报告尺寸变化时重算。

不支持在 backdrop 上运行滤镜的浏览器会自动回退到第 1 层，界面不会退化成不可读的方块。

> 说明：嵌套的 `backdrop-filter` 在 Chromium 中只会采样中间层，下拉菜单等浮层因此改用高不透明度表面关闭模糊（见 `global.css` 中 `.menu` 的注释）。

---

## 背景图 / Artwork

`tools/gen_backgrounds.py` 使用 Pillow 程序化生成蓝调时刻的建筑群像：渐变夜空、星空、云带、楼体窗格与竖向分格、入口暖光、体积雾、湿地面反射、光斑、暗角与胶片颗粒，并输出 2560 与 1600 两档尺寸。

```bash
python tools/gen_backgrounds.py
```

生成结果提交在 `src/assets/art/`，由打包器指纹化并自动重写路径，因此部署在子路径（GitHub Pages 项目站）下也能正确加载。

---

## 本地开发 / Development

需要 Node.js 20+。

```bash
pnpm install      # 或 npm install
pnpm dev          # 开发服务器
pnpm typecheck    # TypeScript 检查
pnpm build        # 产出 dist/
pnpm preview      # 预览构建结果
```

技术栈：React 19 · TypeScript 5 · Vite 7 · 纯手写 CSS（无 UI 框架依赖）。图表为手写 SVG，监视画面为手写 Canvas 渲染，图标为项目内置 SVG 组件。

```
src/
  components/   LiquidGlass 材质组件、图标、SVG 图表
  data/         建筑 / 楼层 / 功能区 / 点位定义
  hooks/        传感器仿真（确定性随机）、定时器
  panels/       层级、视口、监视器、状态栏
  screens/      入口页、控制台
  styles/       设计令牌、玻璃材质、面板语言
tools/          背景图生成、静态服务、验证用的 CDP 探针
```

## 数据说明 / Data

面板中的读数由 `src/hooks/useSimulation.ts` 生成：以固定种子驱动的确定性随机过程，按楼层基础负荷与作息推演温度、湿度、CO₂、人数、电耗与 PMV，并据此派生告警等级。它用于演示界面与交互，**不连接真实楼宇设备**。

## 部署 / Deployment

构建产物为纯静态文件。仓库根目录即站点根目录，GitHub Pages 直接从 `main` 分支根路径发布：

```bash
pnpm build        # dist/ 内的全部文件即是站点内容
```

组件与字号均使用相对路径，因此在 `https://<user>.github.io/<repo>/` 子路径下同样可用。

## 许可 / License

- 代码：MIT（见 `LICENSE`）
- 显示字体：Chakra Petch，SIL Open Font License 1.1（`src/assets/fonts/`），仅保留 latin 子集
- 背景图：由本仓库脚本程序化生成，与代码同许可
