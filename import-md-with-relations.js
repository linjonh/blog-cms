import fs from "fs";
import path from "path";
import axios from "axios";
import matter from "gray-matter";

const STRAPI_URL = "http://localhost:1337";
const POSTS_DIR = "./content/posts";

const AUTH_TOKEN =  "Bearer "; // 你的 token

const MAX_CONCURRENCY = 5; // 并发数量

const config = {
  headers: {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  },
};

// 分类和标签的缓存
const categoryCache = new Map();
const tagCache = new Map();

// ------------------------
// 分类 与 标签处理
// ------------------------

async function getOrCreateCategory(name) {
  if (categoryCache.has(name)) return categoryCache.get(name);

  try {
    const searchRes = await axios.get(`${STRAPI_URL}/api/categories?filters[name][$eq]=${encodeURIComponent(name)}`, config);

    if (searchRes.data.data.length > 0) {
      const id = searchRes.data.data[0].id;
      categoryCache.set(name, id);
      return id;
    }

    const createRes = await axios.post(`${STRAPI_URL}/api/categories`, { data: { name } }, config);

    const id = createRes.data.data.id;
    categoryCache.set(name, id);
    console.log(`📁 创建分类：${name} (ID ${id})`);
    return id;
  } catch (err) {
    console.error(`❌ 分类失败 ${name}`, err.response?.data || err);
    return null;
  }
}

async function getOrCreateTag(name) {
  if (tagCache.has(name)) return tagCache.get(name);

  try {
    const searchRes = await axios.get(`${STRAPI_URL}/api/tags?filters[name][$eq]=${encodeURIComponent(name)}`, config);

    if (searchRes.data.data.length > 0) {
      const id = searchRes.data.data[0].id;
      tagCache.set(name, id);
      return id;
    }

    const createRes = await axios.post(`${STRAPI_URL}/api/tags`, { data: { name } }, config);

    const id = createRes.data.data.id;
    tagCache.set(name, id);
    console.log(`🏷 创建标签：${name} (ID ${id})`);
    return id;
  } catch (err) {
    console.error(`❌ 标签失败 ${name}`, err.response?.data || err);
    return null;
  }
}

// ------------------------
// 单篇文章处理函数
// ------------------------

async function processOneMarkdown(file) {
  const filePath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);

  const title = parsed.data.title || "未命名";
  const title_id = file.replace(".md", "");
  const content = parsed.content;
  const date = parsed.data.date || new Date().toISOString();
  const artid = String(parsed.data.artid);
  const keywords = parsed.data.keywords;
  const description = parsed.data.description;

  console.log(`⏳ 开始处理：${title}`);

  try {
    const articleData = {
      title,
      md_title_id: title_id,
      slug: title_id.toLowerCase().replace(/\s+/g, "-"),
      content,
      date,
      artid,
      keywords,
      description,
    };

    // 分类
    if (parsed.data.categories) {
      const categories = Array.isArray(parsed.data.categories) ? parsed.data.categories : [parsed.data.categories];

      const categoryIds = [];

      for (const cat of categories) {
        const id = await getOrCreateCategory(cat);
        if (id) categoryIds.push(id);
      }

      if (categoryIds.length > 0) articleData.categories = categoryIds;
    }

    // 标签
    if (parsed.data.tags) {
      const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [parsed.data.tags];

      const tagIds = [];

      for (const tag of tags) {
        const id = await getOrCreateTag(tag);
        if (id) tagIds.push(id);
      }

      if (tagIds.length > 0) articleData.tags = tagIds;
    }
    const findTitle = await axios.get(`${STRAPI_URL}/api/articles?filters[title][$eq]=${encodeURIComponent(title)}`, config);

    if (findTitle.data.data.length > 0) {
      // 已存在 → 执行更新
      const docId = findTitle.data.data[0].documentId;
      const res = await axios.put(`${STRAPI_URL}/api/articles/${docId}`, { data: articleData }, config);
      // 用 Document ID 更新
      console.log(`🔁 更新：${title} (docId: ${docId})`);
    } else {
      // 查询是否已存在
      const find = await axios.get(`${STRAPI_URL}/api/articles?filters[md_title_id][$eq]=${title_id}`, config);

      if (find.status === 200 && find.data.data.length > 0) {
        // 用 Document ID 更新
        const docId = find.data.data[0].documentId;

        const res = await axios.put(`${STRAPI_URL}/api/articles/${docId}`, { data: articleData }, config);

        console.log(`🔁 更新：${title} (docId: ${docId})`);
      } else {
        // 创建
        const res = await axios.post(`${STRAPI_URL}/api/articles`, { data: articleData }, config);

        console.log(`✨ 创建：${title}`);
      }
    }
    return true;
  } catch (err) {
    console.error(`❌ 失败：${title}`, err.stack);
    console.error(JSON.stringify(err.response?.data || err, null, 2));
    return false;
  }
}

// ------------------------
// 线程池控制（并发执行）
// ------------------------

async function runConcurrent(tasks, max = 5) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      const file = tasks[current];
      const ok = await processOneMarkdown(file);
      results.push(ok);
    }
  }

  // 启动 worker 线程
  const workers = Array.from({ length: max }, () => worker());

  await Promise.all(workers);

  return results;
}

// ------------------------
// 主函数
// ------------------------

async function start() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  console.log(`🚀 开始导入，共 ${files.length} 篇文章，线程数：${MAX_CONCURRENCY}`);

  const results = await runConcurrent(files, MAX_CONCURRENCY);

  const success = results.filter((x) => x).length;
  const fail = results.length - success;

  console.log(`\n📊 完成：成功 ${success} 篇，失败 ${fail} 篇`);
}

start();
