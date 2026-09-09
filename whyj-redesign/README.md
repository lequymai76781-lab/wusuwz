# 武汉体育学院非物质文化遗产研究中心新版官网

## 项目简介

这是武汉体育学院非物质文化遗产研究中心的多页面静态前端，可作为 GitHub 仓库、Replit 项目或普通静态网站部署。

## 技术栈

- 语义化 HTML5
- 原生 CSS，适配桌面端、平板与手机
- 原生 JavaScript
- Python 标准库静态服务器

项目没有第三方前端依赖，也不需要构建步骤。

## 本地运行

在项目根目录执行：

    python -m http.server 3000 --bind 0.0.0.0

然后访问 http://localhost:3000/。如系统仅提供 `python3`，将命令中的 `python` 改为 `python3`。

## Replit 部署

1. 将本目录作为 GitHub 仓库根目录并推送。
2. 在 Replit 选择 **Import from GitHub**。
3. 点击 **Run**。
4. `.replit` 会启动 3000 端口的静态服务器。

## 目录结构

    whyj-redesign/
    ├── index.html              首页
    ├── about.html              中心概况
    ├── news.html               新闻动态
    ├── research.html           学术研究
    ├── heritage.html           非遗档案
    ├── fieldwork.html          田野调查
    ├── resources.html          数字资源
    ├── policies.html           政策法规
    ├── contact.html            联系我们
    ├── styles.css              全站样式
    ├── script.js               导航、搜索、轮播与筛选交互
    ├── assets/images/          两张校园照片
    ├── ASSET_MANIFEST.md       图片清单
    ├── DEPLOYMENT_CHECKLIST.md 上线前检查记录
    ├── .replit                 Replit 启动配置
    └── .gitignore              Git 排除规则

## 内容说明

- 文章详情、下载文件、CMS 数据和站内搜索尚未接入。
- 尚未接入的页面内容统一标为“数据或文件待导入”。
- 图片均位于 `assets/images/`，详情见 `ASSET_MANIFEST.md`。
- 页面运行不依赖外部 CSS、JavaScript、字体或图片。