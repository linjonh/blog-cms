export default ({ env }) => ({
  meilisearch: {
    enabled: true,
    config: {
      // Meili 地址
      host: env("MEILI_HOST", "http://127.0.0.1:7700"),

      // 认证
      apiKey: env("MEILI_MASTER_KEY", "masterKey"),

      // 需要同步的 Content Types（使用完整的 API ID）
      article: {
        indexName: "articles",
        entriesQuery: {
          populate: ["categories", "tags"],
        },
        transformEntry({ entry }) {
          return {
            id: entry.id,
            title: entry.title,
            slug: entry.slug,
            content: entry.content,
            date: entry.date,
            description: entry.description,
            keywords: entry.keywords,
            categories: entry.categories?.map(cat => cat.name) || [],
            tags: entry.tags?.map(tag => tag.name) || [],
          };
        },
        settings: {
          searchableAttributes: [
            "title",
            "content",
            "description",
            "keywords",
            "categories",
            "tags"
          ],
          filterableAttributes: [
            "date",
            "categories",
            "tags"
          ],
          sortableAttributes: ["date"],
          displayedAttributes: [
            "id",
            "title",
            "slug",
            "description",
            "date",
            "categories",
            "tags"
          ],
        },
      },
    },
  },
});
