import axios from "axios";

const STRAPI_URL = "http://localhost:1337";
const MEILI_URL = "http://localhost:7700";
const MEILI_KEY = "masterKey";

const AUTH_TOKEN =
  "Bearer 28a2d3b707a1e5b3d6a3bfda7627aa47b0050147c6c8ef7d72280acb843e831a26121ec08778805b27ce95782f7ebe2e98e63fe92271295ce6ea892cf4be32814bfce3c41ed176bd271a98c0d47284f3ecb0b05950ff1cf3ecd3553cf8ef0f6e771279a4f339face1cc316dcc3f22b8e683e22712c39a11003f12c54f512e606";

// 1. 创建 Meilisearch 索引
async function createIndex() {
  try {
    const response = await axios.post(
      `${MEILI_URL}/indexes`,
      {
        uid: "articles",
        primaryKey: "id",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MEILI_KEY}`,
        },
      }
    );
    console.log("✅ 创建索引成功:", response.data);
  } catch (error) {
    if (error.response?.data?.code === "index_already_exists") {
      console.log("ℹ️  索引已存在，跳过创建");
    } else {
      console.error("❌ 创建索引失败:", error.response?.data || error.message);
    }
  }
}

// 2. 配置索引设置
async function configureIndex() {
  try {
    const settings = {
      searchableAttributes: ["title", "content", "description", "keywords", "categories", "tags"],
      filterableAttributes: ["date", "categories", "tags"],
      sortableAttributes: ["date"],
      displayedAttributes: ["id", "title", "slug", "description", "date", "categories", "tags"],
    };

    await axios.patch(`${MEILI_URL}/indexes/articles/settings`, settings, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
    });
    console.log("✅ 配置索引设置成功");
  } catch (error) {
    console.error("❌ 配置索引设置失败:", error.response?.data || error.message);
  }
}

// 3. 从 Strapi 获取所有文章并同步到 Meilisearch
async function syncArticles() {
  try {
    // 获取所有文章
    const response = await axios.get(`${STRAPI_URL}/api/articles?populate=*&pagination[pageSize]=100`, {
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    const articles = response.data.data;
    console.log(`📚 找到 ${articles.length} 篇文章`);

    if (articles.length === 0) {
      console.log("⚠️  没有文章需要同步");
      return;
    }

    // 转换数据格式
    const documents = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      date: article.date,
      description: article.description,
      keywords: article.keywords,
      categories: article.categories?.map((cat) => cat.name) || [],
      tags: article.tags?.map((tag) => tag.name) || [],
    }));

    // 批量添加到 Meilisearch
    const addResponse = await axios.post(`${MEILI_URL}/indexes/articles/documents`, documents, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
    });

    console.log("✅ 同步文章成功:", addResponse.data);
    console.log(`📊 共同步 ${documents.length} 篇文章`);
  } catch (error) {
    console.error("❌ 同步文章失败:", error.response?.data || error.message);
  }
}

// 主函数
async function main() {
  console.log("🚀 开始同步 Meilisearch 索引...\n");

  await createIndex();
  await configureIndex();
  await syncArticles();

  console.log("\n✨ 同步完成！");
}

main();
