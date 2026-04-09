# DevTools Desktop

基于 [Wails v2](https://wails.io/) + **Vue 3（JavaScript）** + **Vite** 的桌面端，

## 要求

- Go 1.18+
- Node.js + npm
- Wails CLI：`go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Windows：WebView2 Runtime

## 开发与构建

```bash
cd devtools
wails dev
```

另开终端（若 `wails dev` 未自动拉起前端）：

```bash
cd devtools/frontend
npm run dev
```

生产构建：

```bash
cd devtools
wails build
```

产物：`build/bin/`（Windows 为 `devtools.exe`）。

### 图标资源

- 通用源图：`build/appicon.png`（建议 1024x1024 PNG）
- Windows 图标：`build/windows/icon.ico`
- `wails build` 时优先使用 `build/windows/icon.ico`；若缺失会尝试由 `build/appicon.png` 生成

### 各平台构建脚本

- Windows（PowerShell）：

```powershell
cd devtools
.\scripts\build-windows.ps1
```

- macOS（bash）：

```bash
cd devtools
chmod +x scripts/build-macos.sh
./scripts/build-macos.sh
```

- Linux（bash）：

```bash
cd devtools
chmod +x scripts/build-linux.sh
./scripts/build-linux.sh
```

说明：
- 以上脚本都会先执行 `frontend/npm ci`，再执行 `wails build -clean`
- Linux 脚本会自动安装 `libgtk-3-dev` 与 `libwebkit2gtk-4.1-dev`
- 构建产物统一输出到 `build/bin/`

## 结构

- `frontend/src/shell/ShellLayout.vue` — 侧栏与主内容区
- `frontend/src/router/index.js` — 路由；默认 `/json`，上次访问工具存于 `localStorage`
- `frontend/src/tools/*.vue` — 各工具占位页
- `app.go` — `OpenURL`、`AppVersion` 等 Go 绑定（`npm run build` / `wails generate module` 会更新 `frontend/wailsjs`）

