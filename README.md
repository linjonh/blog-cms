# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>


# 数据库 迁移
## 本地开发的postgreSQL数据库迁移到Docker里
* **本地宿主机 dev 数据库**名、用户名和 `.env` 一致（都是 `strapidb` / `strapiuser`）
* **目标 Docker PostgreSQL** 容器里的数据库、用户名也同样是 `.env` 配置的 `strapidb` / `strapiuser`

所以迁移命令需要对 **源数据库**（宿主机）和 **目标数据库**（容器）分别指定 host、端口、用户名和数据库名。

假设你宿主机 PostgreSQL 用默认端口 `5432`，容器映射到宿主机端口 `5433`，那么可以这样做：

---

## 1️⃣ 导出宿主机数据库

直接用 `pg_dump`：

```bash
PGPASSWORD=jaysen pg_dump -U strapiuser -h 127.0.0.1 -p 5432 -F c -b -v -f strapidb.dump strapidb
```

解释：

* `-h 127.0.0.1 -p 5432` → 宿主机的 PostgreSQL
* `-U strapiuser` → 用户名
* `-F c` → 自定义格式，便于恢复
* `-f strapidb.dump` → 输出文件
* `strapidb` → 数据库名

---

## 2️⃣ 导入到 Docker PostgreSQL

```bash
PGPASSWORD=jaysen pg_restore -U strapiuser -h 127.0.0.1 -p 5433 -d strapidb -v strapidb.dump
```

解释：

* `-h 127.0.0.1 -p 5433` → 宿主机访问 Docker 容器映射端口
* `-U strapiuser` → 容器内数据库用户名
* `-d strapidb` → 容器内目标数据库
* `-v` → 显示详细日志

---

✅ 这样做可以把本地 dev 数据库（名字和用户名同 `.env`）直接迁移到 Docker PostgreSQL 容器里的数据库。

---

## 我们可以用 **管道直接把本地数据库的数据导入 Docker PostgreSQL**，不生成中间文件，一步完成。

假设你的配置如下：

* **本地 dev 数据库**（宿主机）

  * 数据库名：`strapidb`
  * 用户名：`strapiuser`
  * 密码：`jaysen`
  * 主机：127.0.0.1
  * 端口：5432

* **目标 Docker PostgreSQL**（容器）

  * 数据库名：`strapidb`
  * 用户名：`strapiuser`
  * 密码：`jaysen`
  * 映射端口：5433

---

### 单条命令迁移

```bash
# 先删除并重建目标数据库，然后导入数据
sudo docker exec -i blog_postgres psql -U strapiuser -c "DROP DATABASE IF EXISTS strapidb;"
sudo docker exec -i blog_postgres psql -U strapiuser -c "CREATE DATABASE strapidb;"

PGPASSWORD=jaysen pg_dump -U strapiuser -h 127.0.0.1 -p 5432 -F c strapidb | \
PGPASSWORD=jaysen pg_restore -U strapiuser -h 127.0.0.1 -p 5433 -d strapidb --no-owner --role=strapiuser -v
```

---

### 解释：

1. `pg_dump`

   * 从本地宿主机的 dev 数据库导出数据
   * `-F c` → 自定义格式
   * 输出直接通过管道传给 `pg_restore`

2. `pg_restore`

   * 直接导入 Docker PostgreSQL 容器的数据库
   * `--no-owner` → 避免权限/所有者问题
   * `--role=strapiuser` → 使用目标数据库用户执行
   * `-v` → 显示详细日志

3. **优势**

   * 不生成 dump 文件
   * 一次命令完成迁移
   * 避免中间文件占用空间

---

💡 **注意**：

* 目标数据库最好是干净的（没有表或已经 DROP 再 CREATE）
* 如果遇到扩展问题（如 `uuid-ossp`），先在容器里创建扩展
* 适合中小型数据库，一次性传输

---

# ✅ docker compose的宿主机后台管理

- Strapi: http://localhost:1337/admin # CMS 内容管理
- Meilisearch 控制台: http://localhost:7700 #搜索引擎控制台
- Adminer: http://localhost:8089 # 网页方式连接数据库
- PostgreSQL: 127.0.0.1:5433 #psql连接方式