import axios from "axios";

const STRAPI_URL = "http://localhost:1337";
const AUTH_TOKEN =
  "Bearer 28a2d3b707a1e5b3d6a3bfda7627aa47b0050147c6c8ef7d72280acb843e831a26121ec08778805b27ce95782f7ebe2e98e63fe92271295ce6ea892cf4be32814bfce3c41ed176bd271a98c0d47284f3ecb0b05950ff1cf3ecd3553cf8ef0f6e771279a4f339face1cc316dcc3f22b8e683e22712c39a11003f12c54f512e606";

const config = {
  headers: {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  },
};

async function enableAutoSync() {
  console.log("🔧 尝试启用 Meilisearch 自动同步...\n");

  try {
    // 方法 1: 通过插件的 store API 启用（如果插件提供）
    console.log("📝 检查插件状态...");

    // 获取插件配置
    try {
      const response = await axios.get(
        `${STRAPI_URL}/meilisearch/config`,
        config
      );
      console.log("当前插件配置:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log("⚠️  无法获取插件配置（可能是插件 API 路径不存在）");
    }

    // 尝试启用 article 内容类型
    try {
      console.log("\n📝 尝试通过 API 启用 article 内容类型...");
      const response = await axios.post(
        `${STRAPI_URL}/meilisearch/content-type/add`,
        { contentType: "article" },
        config
      );
      console.log("✅ 启用成功:", response.data);
    } catch (error) {
      if (error.response) {
        console.log("⚠️  API 响应:", error.response.status, error.response.data);
      } else {
        console.log("⚠️  请求失败:", error.message);
      }
    }

    // 方法 2: 尝试使用完整的 API ID
    try {
      console.log("\n📝 尝试使用完整 API ID: api::article.article");
      const response = await axios.post(
        `${STRAPI_URL}/meilisearch/content-type/add`,
        { contentType: "api::article.article" },
        config
      );
      console.log("✅ 启用成功:", response.data);
    } catch (error) {
      if (error.response) {
        console.log("⚠️  API 响应:", error.response.status, error.response.data);
      } else {
        console.log("⚠️  请求失败:", error.message);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📋 手动启用方法：");
    console.log("=".repeat(70));
    console.log("1. 访问 Strapi 管理后台: http://localhost:1337/admin");
    console.log("2. 左侧菜单找到 'Meilisearch' 插件");
    console.log("3. 找到 'article' 内容类型");
    console.log("4. 勾选复选框启用自动同步");
    console.log("5. 等待初始索引完成");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ 启用失败:", error.message);
    console.error("详细错误:", error.response?.data || error);
  }
}

enableAutoSync();
