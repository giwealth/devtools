#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[1/4] 安装 Linux 构建依赖..."
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev

echo "[2/4] 安装前端依赖..."
cd "${ROOT_DIR}/frontend"
npm ci

echo "[3/4] 回到项目目录..."
cd "${ROOT_DIR}"

echo "[4/4] 构建 Linux 发布物..."
wails build -clean -platform linux/amd64

echo "完成。产物目录: ${ROOT_DIR}/build/bin"
