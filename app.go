package main

import (
	"context"
	"fmt"
	goruntime "runtime"

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
