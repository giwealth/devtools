package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	goruntime "runtime"

	"devtools/internal/ico"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(ctx context.Context) {}

// OpenURL opens a URL in the system default browser.
func (a *App) OpenURL(url string) {
	if url == "" || a.ctx == nil {
		return
	}
	runtime.BrowserOpenURL(a.ctx, url)
}

// AppVersion returns the application version for the about screen or UI.
func (a *App) AppVersion() string {
	return "1.0.0"
}

// EncodeIcoFromPngBase64 accepts PNG as standard or data-URL Base64; returns ICO file as Base64.
// sizesJSON: empty or "[]" = auto single frame (16–256 from image); otherwise JSON array of edge lengths, e.g. [16,32,256].
func (a *App) EncodeIcoFromPngBase64(pngB64 string, sizesJSON string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(stripDataURL(pngB64))
	if err != nil {
		return "", err
	}
	var sizes []int
	s := strings.TrimSpace(sizesJSON)
	if s != "" && s != "null" && s != "[]" {
		if err := json.Unmarshal([]byte(s), &sizes); err != nil {
			return "", err
		}
	}
	icoBytes, err := ico.BuildICOFromPNG(raw, sizes)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(icoBytes), nil
}

func stripDataURL(s string) string {
	s = strings.TrimSpace(s)
	const p = "base64,"
	if i := strings.Index(s, p); i >= 0 {
		return strings.TrimSpace(s[i+len(p):])
	}
	return strings.TrimPrefix(s, "data:image/png;base64,")
}

func (a *App) menuAbout(_ *menu.CallbackData) {
	if a.ctx == nil {
		return
	}
	_, _ = runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   "关于 DevTools",
		Message: fmt.Sprintf("版本 %s\n离线开发者工具。", a.AppVersion()),
	})
}

func (a *App) menuQuit(_ *menu.CallbackData) {
	runtime.Quit(a.ctx)
}

// ApplicationMenu 窗口菜单：Windows/Linux 为「文件 / 帮助」；macOS 在系统 App/编辑/窗口 菜单后追加「帮助」。
func (a *App) ApplicationMenu() *menu.Menu {
	if goruntime.GOOS == "darwin" {
		help := menu.NewMenu()
		help.AddText("关于 DevTools", nil, a.menuAbout)
		return menu.NewMenuFromItems(
			menu.AppMenu(),
			menu.EditMenu(),
			menu.WindowMenu(),
			menu.SubMenu("帮助", help),
		)
	}
	root := menu.NewMenu()
	fileMenu := root.AddSubmenu("文件")
	fileMenu.AddText("退出", keys.CmdOrCtrl("q"), a.menuQuit)
	helpMenu := root.AddSubmenu("帮助")
	helpMenu.AddText("关于 DevTools", nil, a.menuAbout)
	return root
}
