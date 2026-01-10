#!/bin/bash

# 上传 API 测试脚本
# 使用方法: ./test-upload.sh [API_BASE_URL] [TOKEN] [IMAGE_PATH]

API_BASE_URL="${1:-http://localhost:3000/v1}"
TOKEN="${2}"
IMAGE_PATH="${3:-test-image.png}"

echo "=========================================="
echo "上传 API 测试工具"
echo "=========================================="
echo "API 地址: $API_BASE_URL"
echo "图片路径: $IMAGE_PATH"
echo "=========================================="
echo ""

# 如果没有提供 token，提示需要先登录
if [ -z "$TOKEN" ]; then
    echo "❌ 错误: 需要提供商家认证 Token"
    echo ""
    echo "使用方法:"
    echo "  $0 [API_BASE_URL] [TOKEN] [IMAGE_PATH]"
    echo ""
    echo "示例:"
    echo "  # 1. 先登录获取 Token"
    echo "  curl -X POST $API_BASE_URL/merchant/login \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"username\":\"your_username\",\"password\":\"your_password\"}'"
    echo ""
    echo "  # 2. 使用 Token 测试上传"
    echo "  $0 $API_BASE_URL 'your_token_here' test.png"
    exit 1
fi

# 检查图片文件是否存在
if [ ! -f "$IMAGE_PATH" ]; then
    echo "❌ 错误: 图片文件不存在: $IMAGE_PATH"
    echo ""
    echo "创建一个测试图片:"
    echo "  # 使用 ImageMagick (如果已安装)"
    echo "  convert -size 200x200 xc:blue test.png"
    echo ""
    echo "  # 或者使用任意现有图片文件"
    exit 1
fi

echo "📤 正在上传图片..."
echo ""

# 上传图片
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/upload/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$IMAGE_PATH")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP 状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    # 提取返回的图片 URL
    IMAGE_URL=$(echo "$BODY" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$IMAGE_URL" ]; then
        # 如果是相对路径，添加 base URL
        if [[ ! "$IMAGE_URL" =~ ^http ]]; then
            BASE_DOMAIN=$(echo "$API_BASE_URL" | sed 's|/v1$||')
            FULL_URL="${BASE_DOMAIN}${IMAGE_URL}"
        else
            FULL_URL="$IMAGE_URL"
        fi
        
        echo "✅ 上传成功!"
        echo "图片 URL: $FULL_URL"
        echo ""
        echo "📥 测试图片访问..."
        
        # 测试图片是否可以访问
        IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FULL_URL")
        
        if [ "$IMAGE_STATUS" -eq 200 ]; then
            echo "✅ 图片可以正常访问 (HTTP $IMAGE_STATUS)"
            echo ""
            echo "💡 提示: 在浏览器中打开以下 URL 查看图片:"
            echo "   $FULL_URL"
        else
            echo "⚠️  图片上传成功，但无法访问 (HTTP $IMAGE_STATUS)"
            echo "   请检查:"
            echo "   1. Nginx 静态文件配置是否正确"
            echo "   2. 文件是否确实存在于服务器上"
            echo "   3. 文件权限是否正确"
        fi
    else
        echo "⚠️  上传成功，但无法解析返回的 URL"
    fi
else
    echo "❌ 上传失败!"
    echo ""
    echo "可能的原因:"
    echo "  1. Token 无效或已过期"
    echo "  2. 文件格式不支持 (只支持 jpg, jpeg, png, gif)"
    echo "  3. 文件大小超过限制 (默认 5MB)"
    echo "  4. 服务器错误"
    echo ""
    echo "检查项目:"
    echo "  - 确认 Token 有效: curl -H \"Authorization: Bearer $TOKEN\" $API_BASE_URL/merchant/store"
    echo "  - 检查服务器日志"
fi

echo ""
echo "=========================================="
