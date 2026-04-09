#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[1/3] 安装前端依赖..."
cd "${ROOT_DIR}/frontend"
npm ci

echo "[2/3] 回到项目目录..."
cd "${ROOT_DIR}"

echo "[3/3] 构建 macOS 发布物..."
wails build -clean -platform darwin/amd64

echo "完成。产物目录: ${ROOT_DIR}/build/bin"
