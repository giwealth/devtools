# DevTools Desktop

基于 [Wails v2](https://wails.io/) + **Vue 3（JavaScript）** + **Vite** 的桌面端，界面与行为以仓库内 `web/` 工具页为原型（**不包含** `web/index.html` 门户）。

- **M0**：侧栏工作台 + 路由占位（已完成）
- **M1**：五个工具可用实现（已完成）：JSON（美化/压缩/校验/复制/下载/语法高亮）、Base64、时间戳（时钟 + 时区列表 + 互转）、JWT（HS256 编解码/验签）、图片（预览、旋转、缩放、输出尺寸、质量、格式、下载、Base64 复制）
- **M2**：i18n（`zh` / `en`，`localStorage` `devtools-locale`）、主题（暗 / 浅，`devtools-theme`）、侧栏切换与关于弹窗（已完成）
- **M3**：应用图标（`build/appicon.png`、`build/windows/icon.ico`）、多平台构建脚本与发布物（已完成）

与浏览器原型的**已知差异**：JWT 无独立「可见性切换」等细部 UI；核心算法与 `web/js/*.js` 对齐。JSON 已支持树视图与图片框选裁剪（见各工具页）。

## 要求

- Go 1.18+
- Node.js + npm
- Wails CLI：`go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Windows：WebView2 Runtime

## 开发与构建

```bash
cd devtools-desktop
wails dev              # 热重载；默认连接 http://localhost:5173
```

另开终端（若 `wails dev` 未自动拉起前端）：

```bash
cd devtools-desktop/frontend
npm run dev
```

生产构建：

```bash
cd devtools-desktop
wails build
```

产物：`build/bin/`（Windows 为 `devtools-desktop.exe`）。

### 图标资源

- 通用源图：`build/appicon.png`（建议 1024x1024 PNG）
- Windows 图标：`build/windows/icon.ico`
- `wails build` 时优先使用 `build/windows/icon.ico`；若缺失会尝试由 `build/appicon.png` 生成

### 各平台构建脚本

- Windows（PowerShell）：

```powershell
cd devtools-desktop
.\scripts\build-windows.ps1
```

- macOS（bash）：

```bash
cd devtools-desktop
chmod +x scripts/build-macos.sh
./scripts/build-macos.sh
```

- Linux（bash）：

```bash
cd devtools-desktop
chmod +x scripts/build-linux.sh
./scripts/build-linux.sh
```

说明：
- 以上脚本都会先执行 `frontend/npm ci`，再执行 `wails build -clean`
- Linux 脚本会自动安装 `libgtk-3-dev` 与 `libwebkit2gtk-4.1-dev`
- 构建产物统一输出到 `build/bin/`

## 样式与字体

- **Tailwind CSS v3**：`tailwind.config.js` + `postcss.config.js`，主题色/圆角与 `web/js/config.js` 对齐；工具类与现有 `var(--*)` 令牌共存（侧栏已用 Tailwind 工具类示例）。
- **本地化字体**（与 `web/jwt.html` 中 Google Fonts 族一致，构建打入产物，离线可用）：`@fontsource/inter`、`@fontsource/noto-sans-sc`、`@fontsource/jetbrains-mono`，在 `frontend/src/fonts.css` 中按字重引入。原型中的 **Material Symbols** 未接入（当前桌面 UI 未依赖该图标字体）。

## 结构

- `frontend/src/shell/ShellLayout.vue` — 侧栏与主内容区
- `frontend/src/router/index.js` — 路由；默认 `/json`，上次访问工具存于 `localStorage`
- `frontend/src/tools/*.vue` — 各工具占位页
- `app.go` — `OpenURL`、`AppVersion` 等 Go 绑定（`npm run build` / `wails generate module` 会更新 `frontend/wailsjs`）

## 修改 Go API 后

```bash
wails generate module
```

或在 `wails build` / `wails dev` 时会自动生成绑定。
