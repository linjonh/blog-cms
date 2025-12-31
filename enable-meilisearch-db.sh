#!/bin/bash

# 通过直接修改数据库来启用 Meilisearch 自动同步
# 这个脚本会在 strapi_core_store_settings 表中插入配置

echo "🔧 通过数据库启用 Meilisearch 自动同步..."
echo ""

# 检查是否已存在配置
echo "📝 检查现有配置..."
docker compose exec postgres psql -U jaysen -d blogstrapi -c \
  "SELECT key, value FROM strapi_core_store_settings WHERE key LIKE 'plugin_meilisearch%';" 2>/dev/null

echo ""
echo "📝 插入/更新 Meilisearch 配置..."

# 插入或更新配置，将 article 内容类型标记为已索引
docker compose exec postgres psql -U jaysen -d blogstrapi << 'EOF'
-- 删除旧配置（如果存在）
DELETE FROM strapi_core_store_settings WHERE key = 'plugin_meilisearch_indexed_content_types';

-- 插入新配置，启用 article 内容类型
INSERT INTO strapi_core_store_settings (key, value, type, environment, tag)
VALUES (
  'plugin_meilisearch_indexed_content_types',
  '["api::article.article"]',
  'array',
  '',
  ''
);

-- 验证插入
SELECT key, value FROM strapi_core_store_settings WHERE key = 'plugin_meilisearch_indexed_content_types';
EOF

echo ""
echo "✅ 配置已更新！"
echo ""
echo "⚠️  重要：现在需要重启 Strapi 以使配置生效："
echo "   docker compose restart strapi"
echo ""
echo "重启后，Meilisearch 插件将自动监听 article 内容类型的变化。"
