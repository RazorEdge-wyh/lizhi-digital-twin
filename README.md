# 立志楼 · 未来智能空间建筑数字孪生面板
**Lizhi Building · Intelligent Space Digital Twin Console**

湖南科技大学立志楼的数字孪生界面：一个极简的入口页，加一个仿 Unity / Godot 风格的建筑运行控制台。视觉遵循 Apple 式的克制——玻璃只用于「控制层」（需要浮在内容之上、必须保持可读的控件与外壳），内容面一律扁平 + 发丝分隔线。

An end-to-end front-end for the Lizhi Building at Hunan University of Science and Technology: a deliberately minimal landing screen that opens into an engine-editor-style console (project menu bar, hierarchy, viewport, monitor, per-floor sensor status) built on a restrained liquid-glass material system.

---

## 界面 / Screens

### 1. 入口页 · Landing

左侧只有一个动作：**「开始探索」四个大字**。它不是玻璃，也不带图标——就是纯文字，鼠标移上去（或键盘聚焦）时下方拉出一条下划线，文字轻微右移。

其余信息全部压到边缘，保持简短：

- 上方两行小字：`立志楼 · LIZHI BUILDING` / `湖南科技大学 · 智能空间数字孪生`
- 底部一行：共用学院 / 楼层 / 建筑面积 / 目标标准，右下角经纬度与海拔

实现要点：下划线用 `transform: scaleX(0→1)` + `transform-origin: left` 拉出（只动 transform，不触发布局）；`:focus-visible` 给出与 hover 相同的下划线，所以键盘用户也能得到同样的反馈；按钮是真正的 `<button>`，可聚焦、可回车。因为没有玻璃承托，压暗层改成左重右轻的定向渐变来保证白字对比度。

#### 背景视频 / Background media

把三个文件放进 `public/assets/`，代码会自动接管（文件名必须一致）：

| 文件 | 用途 | 建议规格 |
| --- | --- | --- |
| `bg.webm` | 桌面端循环视频 | 1080p 或 720p，6–10 秒无缝循环，≤ 20 MB（GitHub 单文件上限 100 MB） |
| `bg-poster.jpg` | 桌面静态海报（视频首帧 / 加载期间 / 减少动效时显示） | ≥ 1920×1080 |
| `bg-mobile.jpg` | 手机静态海报（竖构图更佳） | 1080×1920 左右 |

仓库里已放了 `bg-poster.svg` / `bg-mobile.svg` 作为**兜底海报**，所以缺文件时页面依然完整，不会出现破图。放了真图后真图自动覆盖。

实现要点（`src/components/MediaBackdrop.tsx`）：

1. **背景层**：`position: fixed; inset: 0; width/height: 100%; object-fit: cover; z-index: -1`，任何视口比例都铺满且不变形。
2. **文字层**：内容容器 `position: relative; z-index: 1` 盖在背景与压暗层之上。
3. **视频属性**：`autoplay loop muted playsinline`——`muted` + `playsinline` 是移动端与部分浏览器允许自动播放的前提；元素插入后再显式 `play()`，兼容部分浏览器的策略。
4. **移动端不下载视频**：`<source media="…">` 对 `<video>` **无效**（`media` 属性不被支持），所以走 JS `matchMedia` **条件挂载**：视口 ≥ 768px、`(hover: hover) and (pointer: fine)`、且未开启减少动效时才插入 `<video>`。实测 430px 视口下视频元素不存在、0 字节视频流量。
5. **减少动效降级**：`prefers-reduced-motion: reduce` 时不挂载视频，只保留静态海报；CSS 里再加一层 `display: none` 兜底。
6. **相对路径**：一律 `./assets/…`，`public/` 由打包器原样复制，因此在域名根路径与 GitHub Pages 子路径（`/<repo>/`）下都不会 404。
7. **不用 `<picture>` 做兜底**：`<picture>` 只在 `type`/`media` 不匹配时回退到 `<img>`；资源 404 会触发 `error` 并留下破图。所以这里先用 SVG 打底，再用一次 `HEAD` 探测确认文件存在后才插入真图 / 视频。

另有一份**独立静态版** `public/standalone-index.html`：不依赖 React，同样的三层背景与降级逻辑，可直接当纯静态页使用（放进 `public/` 后随站点一起发布）。

### 2. 细节面板 · Detail console

类 Unity / Godot 的简化编辑器布局，四个区域对应面板化建筑的全部需求：

| 区域 | 内容 |
| --- | --- |
| **上方菜单栏** | 项目（新建 / 打开 / 保存 / 导入 / 导出 / 返回）、视图（三维 / 平面 / 数据 / 面板开关）、监测（暂停数据流 / 刷新 / 自检 / 告警订阅）、帮助；中间是工程名与保存时间 |
| **左侧层级 Hierarchy** | 建筑 → 楼层（F1–F8）→ 功能区 → 传感器组；单击选中、展开折叠，底部是该层温度 / 湿度 / CO₂ 与点位在线数 |
| **中央视口 Viewport** | 三种模式：**三维模型**（等距楼层板堆叠，选中层高亮、异常层变色，左侧屏幕空间楼层列表）、**平面图**（房间 + 传感点位 + 比例尺 / 指北针）、**数据面板**（逐点位遥测表） |
| **右侧监视器 Monitor** | 三路画面，四种通道实时 Canvas 绘制：深度态势（波形）、热成像（单色亮度热力阵列 + 十字测温）、无线感知（雷达）、人流统计（分区柱状）；可暂停 |
| **下方状态栏 Status bar** | 八个楼层玻璃格（温度 / 湿度 / CO₂ / 人数 / 电耗 / PMV），加上全楼汇总四格（负荷、在场人数、点位在线率、平均 CO₂）——每格都是独立玻璃面板 |

子界面整体是**全毛玻璃**：菜单栏、层级、视口、监视器四块面板用主玻璃材质（带背景模糊与边缘折射），嵌在它们内部的层级读数格、监视器指标格、楼层状态格与汇总格统一用 `over` 档玻璃——保留玻璃的体感、边缘与高光，但关掉模糊。原因是嵌套的 `backdrop-filter` 无法采样父级已过滤的结果，叠层再模糊会发灰，这一档让"层层玻璃"既成立又清晰。

交互：`1`–`8` 选择楼层，`M` / `P` / `D` 切换视图，`空格` 暂停数据流，`Ctrl/⌘+S` 保存，`Esc` 返回入口页。深链接 `#console` 可直接进入控制台。

---

## 设计准则 / Design rules applied

本版按以下公开规范重做（文档已抓取比对）：

- **Apple 式玻璃克制** —— 玻璃是「控制层」材质：只出现在入口按钮、菜单栏、浮层与面板外壳；内容面用实色 + 发丝线，避免把毛玻璃当成装饰铺满全屏。
- **阴影负责层级，描边负责结构**（`jakubkrehel/make-interfaces-feel-better`）—— 卡片与按钮的立体感来自分层透明 `box-shadow`，1px 描边只用于分隔线、选中态与聚焦态。
- **同心圆角** —— 外层半径 = 内层半径 + 内边距，避免嵌套圆角看起来「掐住」。
- **一致的图标笔画** —— 单一图标集、单一 `1.5px` 笔画（与正文字重匹配），全部走 `currentColor`，状态由 CSS 决定，同一图标不出现两套资源。
- **按压反馈** —— `transform: scale(0.96)`；触达面积用伪元素补到 40px（桌面）/ 44px（触摸）。
- **`font-variant-numeric: tabular-nums`** —— 所有会跳动的读数，避免数字变化引起抖动。
- **不使用 `transition: all`**；只动 `transform` / `opacity` / `background` / `color`。
- **`prefers-reduced-motion`** —— 全局降级，背景漂移与所有过渡在减弱动效时停用。
- **对比度** —— 正文对面板底色 ≥ 7:1，最弱的四级灰仍为 5.8:1，语义色 5.6–6.7:1（WCAG AA 通过）；颜色从不是唯一的状态指示，旁边始终有文字标签。

---

## 液态玻璃的实现 / How the glass works

`src/components/LiquidGlass.tsx` 只有三件事：

1. **玻璃本体** —— `backdrop-filter: blur() saturate()`，加上材质自身的 tint/wash。四种材质重量：`thin` / `regular` / `thick`（深色外壳）与 `frost`（浅色控件，会额外 `brightness(1.22)` 提亮背景，这正是 Apple 在照片上放控件时改用的浅色玻璃）。
2. **真实折射边缘** —— 在 canvas 上按圆角矩形 SDF 光栅化位移场（R 通道存水平位移、G 通道存垂直位移，中灰 128 为基准），编码成 data URL 交给 SVG `feDisplacementMap`，作为该元素的 `backdrop-filter`。玻璃边缘因此真正**折射背景**，即 Apple Liquid Glass 与 [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) 所采用的技术路线。位移图按尺寸缓存，只在 `ResizeObserver` 报告尺寸变化时重算。
3. **一条发丝高光 + 一层内侧暗影** —— 真实玻璃受光的样子，仅此而已。

刻意不做：彩色辉光、渐变文字、噪点薄膜、流动光泽、多重投影。不支持在 backdrop 上运行滤镜的浏览器自动退回纯 `blur()`，界面不会退化成方块。

> 嵌套的 `backdrop-filter` 在 Chromium 中只会采样中间层，下拉菜单与模态框因此改用高不透明度表面并关闭模糊（见 `global.css` 中 `.menu` / `.modal__card` 的注释）。

2. **真实折射** —— 在 canvas 上按圆角矩形 SDF 光栅化位移场（R 通道存水平位移、G 通道存垂直位移，中灰 128 为基准），编码成 data URL 交给 SVG `feDisplacementMap`，再作为该元素的 `backdrop-filter` 使用。玻璃边缘因此真正**折射背景**，即 Apple Liquid Glass 与 [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) 所采用的技术路线。位移图按尺寸缓存，仅在 `ResizeObserver` 报告尺寸变化时重算。

不支持在 backdrop 上运行滤镜的浏览器会自动回退到第 1 层，界面不会退化成不可读的方块。

> 说明：嵌套的 `backdrop-filter` 在 Chromium 中只会采样中间层，下拉菜单等浮层因此改用高不透明度表面关闭模糊（见 `global.css` 中 `.menu` 的注释）。

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

技术栈：React 19 · TypeScript 5 · Vite 7 · 纯手写 CSS（无 UI 框架依赖）。监视画面与三维楼层板为手写 Canvas / CSS 3D，图标为项目内置 SVG 组件（单笔画、单 `currentColor`）。

```
public/
  assets/       背景视频与海报（bg.webm / bg-poster.jpg / bg-mobile.jpg）
  standalone-index.html   独立静态版入口页（无 React 依赖）
src/
  components/   LiquidGlass 材质组件、MediaBackdrop 背景媒体、图标
  data/         建筑 / 楼层 / 功能区 / 点位定义
  hooks/        传感器仿真（确定性随机）、定时器
  panels/       层级、视口、监视器、状态栏
  screens/      入口页、控制台
  styles/       设计令牌、玻璃材质、面板语言
tools/          静态服务、验证用的 CDP 探针、部署脚本
```

## 数据说明 / Data

面板中的读数由 `src/hooks/useSimulation.ts` 生成：以固定种子驱动的确定性随机过程，按楼层基础负荷与作息推演温度、湿度、CO₂、人数、电耗与 PMV，并据此派生告警等级。它用于演示界面与交互，**不连接真实楼宇设备**。

## 部署 / Deployment

线上站点：<https://razoredge-wyh.github.io/lizhi-digital-twin/>
控制台直达：<https://razoredge-wyh.github.io/lizhi-digital-twin/#console>

仓库只保存源码，由 `.github/workflows/deploy-pages.yml` 在 `main` 分支推送后自动构建并发布为 Pages 工件（先 `pnpm typecheck`，再 `pnpm build`，最后 `actions/deploy-pages`）。因此仓库中不需要提交 `dist/`。

```bash
pnpm build        # 本地产出 dist/，内容与线上一致
```

`vite.config.ts` 使用 `base: "./"`，字体与图片由打包器指纹化并重写为相对路径，所以在 `https://<user>.github.io/<repo>/` 这类子路径下无需额外配置即可正确加载。

首次发布或需要重建仓库内容时，可用内置脚本通过 GitHub REST API 推送（本环境没有 git 可执行文件，脚本以 blobs → tree → commit → ref 的方式组装提交）：

```bash
GITHUB_TOKEN=<token> node tools/deploy-gh-pages.mjs <owner>/<repo>
```

脚本会把 Pages 的 build type 设为 `workflow`。**注意**：若仓库早先用“分支目录”方式开启过 Pages，GitHub 会残留一个 `pages-build-deployment` 工作流，它会发布源码 `index.html` 而不是构建产物，需要停用它，否则站点会指向未构建的源码。

## 许可 / License

- 代码：MIT（见 `LICENSE`）
- 显示字体：Chakra Petch，SIL Open Font License 1.1（`src/assets/fonts/`），仅保留 latin 子集
- 背景图：由本仓库脚本程序化生成，与代码同许可
