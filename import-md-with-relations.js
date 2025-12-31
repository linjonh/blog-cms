import fs from "fs";
import path from "path";
import axios from "axios";
import matter from "gray-matter";

const STRAPI_URL = "http://localhost:1337";
const POSTS_DIR = "../techblog/content/posts";

const AUTH_TOKEN =
  "Bearer 28a2d3b707a1e5b3d6a3bfda7627aa47b0050147c6c8ef7d72280acb843e831a26121ec08778805b27ce95782f7ebe2e98e63fe92271295ce6ea892cf4be32814bfce3c41ed176bd271a98c0d47284f3ecb0b05950ff1cf3ecd3553cf8ef0f6e771279a4f339face1cc316dcc3f22b8e683e22712c39a11003f12c54f512e606"; // 你的 token

// 并发数量：优先使用命令行参数，其次环境变量，最后使用默认值 5
// 使用方式：node import-md-with-relations.js --concurrency=10
// 或：CONCURRENCY=10 node import-md-with-relations.js
const getConcurrency = () => {
  const args = process.argv.slice(2);
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));

  if (concurrencyArg) {
    return parseInt(concurrencyArg.split("=")[1], 10);
  }

  if (process.env.CONCURRENCY) {
    return parseInt(process.env.CONCURRENCY, 10);
  }

  return 3; // 默认值
};

const MAX_CONCURRENCY = getConcurrency();

// 重试配置
const MAX_RETRIES = 3; // 最大重试次数
const RETRY_DELAY_BASE = 1000; // 基础延迟时间（毫秒）

const config = {
  headers: {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  },
};

// 延迟函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 重试包装函数（指数退避）
async function retryWithBackoff(fn, retries = MAX_RETRIES, context = "") {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === retries;
      const isRetryableError =
        error.response?.status === 500 ||
        error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (!isRetryableError || isLastAttempt) {
        throw error;
      }

      const delay = RETRY_DELAY_BASE * Math.pow(2, i); // 指数退避: 1s, 2s, 4s
      console.log(`⚠️  ${context} 失败 (${error.response?.status || error.code}), ${i + 1}/${retries} 次重试，等待 ${delay}ms...`);
      await sleep(delay);
    }
  }
}

// 分类和标签的缓存
const categoryCache = new Map();
const tagCache = new Map();

// ------------------------
// 分类 与 标签处理
// ------------------------

async function getOrCreateCategory(name) {
  if (categoryCache.has(name)) return categoryCache.get(name);

  try {
    const searchRes = await retryWithBackoff(
      () => axios.get(`${STRAPI_URL}/api/categories?filters[name][$eq]=${encodeURIComponent(name)}`, config),
      MAX_RETRIES,
      `查询分类 "${name}"`
    );

    if (searchRes.data.data.length > 0) {
      const id = searchRes.data.data[0].id;
      categoryCache.set(name, id);
      return id;
    }

    const createRes = await retryWithBackoff(
      () => axios.post(`${STRAPI_URL}/api/categories`, { data: { name } }, config),
      MAX_RETRIES,
      `创建分类 "${name}"`
    );

    const id = createRes.data.data.id;
    categoryCache.set(name, id);
    console.log(`📁 创建分类：${name} (ID ${id})`);
    return id;
  } catch (err) {
    // 如果是唯一性约束错误，说明已被其他并发请求创建，重新查询
    if (err.response?.data?.error?.message === "This attribute must be unique") {
      console.log(`🔄 分类 "${name}" 已存在，重新查询...`);
      try {
        const retrySearchRes = await axios.get(
          `${STRAPI_URL}/api/categories?filters[name][$eq]=${encodeURIComponent(name)}`,
          config
        );
        if (retrySearchRes.data.data.length > 0) {
          const id = retrySearchRes.data.data[0].id;
          categoryCache.set(name, id);
          return id;
        }
      } catch (retryErr) {
        console.error(`❌ 重新查询分类失败 ${name}`, retryErr.response?.data || retryErr);
      }
    }
    console.error(`❌ 分类失败 ${name}`, err.response?.data || err);
    return null;
  }
}

async function getOrCreateTag(name) {
  if (tagCache.has(name)) return tagCache.get(name);

  try {
    const searchRes = await retryWithBackoff(
      () => axios.get(`${STRAPI_URL}/api/tags?filters[name][$eq]=${encodeURIComponent(name)}`, config),
      MAX_RETRIES,
      `查询标签 "${name}"`
    );

    if (searchRes.data.data.length > 0) {
      const id = searchRes.data.data[0].id;
      tagCache.set(name, id);
      return id;
    }

    const createRes = await retryWithBackoff(
      () => axios.post(`${STRAPI_URL}/api/tags`, { data: { name } }, config),
      MAX_RETRIES,
      `创建标签 "${name}"`
    );

    const id = createRes.data.data.id;
    tagCache.set(name, id);
    console.log(`🏷 创建标签：${name} (ID ${id})`);
    return id;
  } catch (err) {
    // 如果是唯一性约束错误，说明已被其他并发请求创建，重新查询
    if (err.response?.data?.error?.message === "This attribute must be unique") {
      console.log(`🔄 标签 "${name}" 已存在，重新查询...`);
      try {
        const retrySearchRes = await axios.get(
          `${STRAPI_URL}/api/tags?filters[name][$eq]=${encodeURIComponent(name)}`,
          config
        );
        if (retrySearchRes.data.data.length > 0) {
          const id = retrySearchRes.data.data[0].id;
          tagCache.set(name, id);
          return id;
        }
      } catch (retryErr) {
        console.error(`❌ 重新查询标签失败 ${name}`, retryErr.response?.data || retryErr);
      }
    }
    console.error(`❌ 标签失败 ${name}`, JSON.stringify(err.response?.data || err),null,2);
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
  let content = parsed.content;
  const date = parsed.data.date || new Date().toISOString();
  const artid = String(parsed.data.artid);
  const keywords = parsed.data.keywords;
  const description = parsed.data.description;

  const weix_ads = "![微信小程序星海飞驰](/weixin_miniapp.png)";
  if (!content.includes(weix_ads)) {
    content = `${weix_ads}\n\n${content}\n\n${weix_ads}`;
    console.log(`➕ 添加微信小程序广告到文章：${title}`);
  }

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

    const findTitle = await retryWithBackoff(
      () => axios.get(`${STRAPI_URL}/api/articles?filters[title][$eq]=${encodeURIComponent(title)}`, config),
      MAX_RETRIES,
      `查询文章标题 "${title}"`
    );

    if (findTitle.data.data.length > 0) {
      // 已存在 → 执行更新
      const docId = findTitle.data.data[0].documentId;
      await retryWithBackoff(
        () => axios.put(`${STRAPI_URL}/api/articles/${docId}`, { data: articleData }, config),
        MAX_RETRIES,
        `更新文章 "${title}"`
      );
      console.log(`🔁 更新：${title} (docId: ${docId})`);
    } else {
      // 查询是否已存在
      const find = await retryWithBackoff(
        () => axios.get(`${STRAPI_URL}/api/articles?filters[md_title_id][$eq]=${title_id}`, config),
        MAX_RETRIES,
        `查询文章ID "${title_id}"`
      );

      if (find.status === 200 && find.data.data.length > 0) {
        // 用 Document ID 更新
        const docId = find.data.data[0].documentId;

        await retryWithBackoff(
          () => axios.put(`${STRAPI_URL}/api/articles/${docId}`, { data: articleData }, config),
          MAX_RETRIES,
          `更新文章 "${title}"`
        );

        console.log(`🔁 更新：${title} (docId: ${docId})`);
      } else {
        // 创建
        await retryWithBackoff(() => axios.post(`${STRAPI_URL}/api/articles`, { data: articleData }, config), MAX_RETRIES, `创建文章 "${title}"`);

        console.log(`✨ 创建：${title}`);
      }
    }
    return true;
  } catch (err) {
    // 如果是标题唯一性约束错误，尝试查询并更新
    if (err.response?.data?.error?.message === "This attribute must be unique") {
      const uniqueError = err.response.data.error.details?.errors?.[0];
      if (uniqueError?.path?.[0] === "title") {
        console.log(`🔄 文章标题 "${title}" 已存在，尝试更新...`);
        try {
          const retrySearchRes = await axios.get(
            `${STRAPI_URL}/api/articles?filters[title][$eq]=${encodeURIComponent(title)}`,
            config
          );
          if (retrySearchRes.data.data.length > 0) {
            const docId = retrySearchRes.data.data[0].documentId;
            await axios.put(`${STRAPI_URL}/api/articles/${docId}`, { data: articleData }, config);
            console.log(`🔁 已更新文章：${title} (docId: ${docId})`);
            return true;
          }
        } catch (retryErr) {
          console.error(`❌ 重新查询并更新文章失败 ${title}`, retryErr.response?.data || retryErr);
        }
      }
    }

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
// 同步到 Meilisearch
// ------------------------

async function syncToMeilisearch() {
  console.log("\n🔄 开始同步到 Meilisearch...");

  const MEILI_URL = "http://localhost:7700";
  const MEILI_KEY = "masterKey";

  try {
    // 1. 确保索引存在
    try {
      await axios.get(`${MEILI_URL}/indexes/articles`, {
        headers: { Authorization: `Bearer ${MEILI_KEY}` }
      });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("📝 创建 Meilisearch 索引...");
        await axios.post(
          `${MEILI_URL}/indexes`,
          { uid: "articles", primaryKey: "id" },
          { headers: { Authorization: `Bearer ${MEILI_KEY}` } }
        );
      }
    }

    // 2. 获取所有文章
    const response = await axios.get(`${STRAPI_URL}/api/articles?populate=*&pagination[pageSize]=100`, config);
    const articles = response.data.data;

    if (articles.length === 0) {
      console.log("⚠️  没有文章需要同步");
      return;
    }

    // 3. 转换数据格式
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

    // 4. 批量同步到 Meilisearch
    await axios.post(`${MEILI_URL}/indexes/articles/documents`, documents, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
    });

    console.log(`✅ 已同步 ${documents.length} 篇文章到 Meilisearch`);
  } catch (error) {
    console.error("❌ 同步 Meilisearch 失败:", JSON.stringify(error.response?.data || error.message),null,2);
  }
}

// ------------------------
// 主函数
// ------------------------

async function start() {
  let files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  files = files
    .filter((f) => !f.startsWith(".")) // 排除隐藏文件
    // .filter((f) => {
    //   //只保留某段时间的文章
    //   const start_2025 = f.startsWith("2025");
    //   let index = f.lastIndexOf("-");
    //   if (index > 0) {
    //     const datePart = f.substring(0, index);
    //     return start_2025 && datePart >= "2025-11-29" && datePart <= "2025-11-31";
    //   }
    // });
  // files = [files[1]]; // 只处理第一篇测试
  console.log(`🚀 开始导入，共 ${files.length} 篇文章，线程数：${MAX_CONCURRENCY}`);

  console.log(`待处理文件数: ${files[0]} ~ ${files[files.length - 1]}`);

  const results = await runConcurrent(files, MAX_CONCURRENCY);

  const success = results.filter((x) => x).length;
  const fail = results.length - success;

  console.log(`\n📊 完成：成功 ${success} 篇，失败 ${fail} 篇： ${files[0]} ~ ${files[files.length - 1]}`);

  // 自动同步到 Meilisearch
  // await syncToMeilisearch();
}

start();
