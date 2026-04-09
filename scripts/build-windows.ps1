$ErrorActionPreference = "Stop"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Arguments = @()
  )
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "命令执行失败: $Command $($Arguments -join ' ') (exit code: $LASTEXITCODE)"
  }
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[1/3] 安装前端依赖..."
Set-Location "$root/frontend"
Invoke-Native -Command "npm" -Arguments @("ci")

Write-Host "[2/3] 回到项目目录..."
Set-Location $root

Write-Host "[3/3] 构建 Windows 发布物..."
Invoke-Native -Command "wails" -Arguments @("build", "-clean", "-platform", "windows/amd64")

Write-Host "完成。产物目录: $root/build/bin"
