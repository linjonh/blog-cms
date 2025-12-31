#!/bin/bash

echo "🔧 重建 Strapi 管理面板以加载 Meilisearch 插件..."
echo ""

# 1. 删除旧的构建文件
echo "📝 清理旧的构建文件..."
rm -rf dist/build .strapi/client
echo "✅ 清理完成"
echo ""

# 2. 在 Docker 容器中重新构建
echo "📦 在 Docker 容器中重新构建管理面板..."
docker compose exec strapi npm run build

echo ""
echo "✅ 构建完成！"
echo ""
echo "📋 下一步："
echo "1. 访问 http://localhost:1337/admin"
echo "2. 刷新浏览器（Ctrl+F5 强制刷新）"
echo "3. 左侧菜单应该会出现 'meilisearch' 选项"
echo ""
