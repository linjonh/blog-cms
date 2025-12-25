import fs from "fs";
import path from "path";
import axios from "axios";
import matter from "gray-matter";

const STRAPI_URL = "http://localhost:1337";
const POSTS_DIR = "./content/posts";
const AUTH_TOKEN ="Bearer 2b3c93cdc20e65ec7daa512420d413906f893c874752f16ef841e2cac4df2eb1f57e02f0c7b5c3063038dbaf85e81b301c538aaff7b985a0f43416ec796b4f1c9731f7dde4a855ca8cdd400fd7980d8192f096fc9a2d7436f49492e2af0db63b79285f690cdb443255118d9d80526356086bda73eeab4e8726beb44ca2eec48e";

async function createCategoriesAndTags() {
  const files = fs.readdirSync(POSTS_DIR);
  const allCategories = new Set();
  const allTags = new Set();

  // 收集所有唯一的categories和tags
  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const filePath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);

    if (parsed.data.categories) {
      const cats = Array.isArray(parsed.data.categories) ? parsed.data.categories : [parsed.data.categories];
      cats.forEach((cat) => allCategories.add(cat));
    }

    if (parsed.data.tags) {
      const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [parsed.data.tags];
      tags.forEach((tag) => allTags.add(tag));
    }
  }

  console.log(`找到 ${allCategories.size} 个分类和 ${allTags.size} 个标签`);

  // 并发创建分类
  await Promise.all(
    Array.from(allCategories).map(async (category) => {
      try {
        await axios.post(
          `${STRAPI_URL}/api/categories`,
          { data: { name: category } },
          { headers: { "Content-Type": "application/json", Authorization: AUTH_TOKEN } }
        );
        console.log(`✅ 创建分类：${category}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`⏭️ 分类已存在：${category}`);
        } else {
          console.log(`❌ 创建分类失败：${category}`, err.response?.data || err.message);
        }
      }
    })
  );

  // 并发创建标签
  await Promise.all(
    Array.from(allTags).map(async (tag) => {
      try {
        await axios.post(
          `${STRAPI_URL}/api/tags`,
          { data: { name: tag } },
          { headers: { "Content-Type": "application/json", Authorization: AUTH_TOKEN } }
        );
        console.log(`✅ 创建标签：${tag}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`⏭️ 标签已存在：${tag}`);
        } else {
          console.log(`❌ 创建标签失败：${tag}`, err.response?.data || err.message);
        }
      }
    })
  );
}

createCategoriesAndTags();
