#!/bin/bash

# 快速部署脚本
# 使用方法: bash deploy.sh

set -e

echo "🚀 开始部署..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

echo "✅ PM2 已安装"

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，请从 .env.example 复制并配置"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请编辑配置文件"
        exit 1
    else
        echo "❌ .env.example 文件不存在"
        exit 1
    fi
fi

echo "✅ 环境变量文件已存在"

# 安装依赖
echo "📦 安装依赖..."
npm install --production

# 创建必要目录
mkdir -p uploads logs
chmod 755 uploads logs

echo "✅ 目录已创建"

# 停止旧进程
if pm2 list | grep -q "noodles-api"; then
    echo "🔄 停止旧进程..."
    pm2 stop noodles-api || true
    pm2 delete noodles-api || true
fi

# 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs noodles-api"
echo "🔄 重启应用: pm2 restart noodles-api"
echo ""
