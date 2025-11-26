export default ({ env }) => ({
  meilisearch: {
    // Meili 地址
    host: env("MEILI_HOST", "http://127.0.0.1:7700"),

    // 认证
    apiKey: env("MEILI_MASTER_KEY", "masterKey"),

    // 需要同步的 Content Types
    contentTypes: [
      "api::article.article",      // 文章
      "api::category.category",    // 分类（如需要）
      "api::tag.tag",
    ],

    // 索引设置
    settings: {
      "api::article.article": {
        indexName: "articles",
        fields: [
          "title",
          "slug",
          "content",
          "date",
          "tags",
          "categories",
          "desciption",
          "keywords"
        ],
      }
    },
  },
});
