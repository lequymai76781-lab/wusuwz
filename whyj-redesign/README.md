# 湖北省非物质文化遗产中心网站 V2

## 项目简介

这是湖北省非物质文化遗产中心的多页面静态网站。V2 在原有项目内完成信息架构、首页、导航、中心动态、学术团队和研究方向重构，保留 V1 的专家资料、图片和补充栏目，不依赖构建工具即可部署。

## 技术栈

- 语义化 HTML5
- 原生 CSS（桌面、平板、手机响应式）
- 原生 JavaScript
- 本地 JSON 风格数据文件（`news-data.js`、`notice-data.js`、`people-data.js`）
- Python 标准库静态服务器

项目没有第三方前端运行时依赖，也不需要构建步骤。

## 本地运行

在项目根目录执行：

    python -m http.server 3000 --bind 0.0.0.0

然后访问 `http://localhost:3000/`。如系统仅提供 `python3`，将命令中的 `python` 改为 `python3`。

## V2 信息架构

主导航固定为：首页、中心简介、中心动态、学术团队、他山之石、联系我们、武体首页。

| 栏目 | 页面与锚点 | 说明 |
|---|---|---|
| 首页 | `index.html` | Banner、中心简介、中心动态、通知公告、研究方向五个固定区域 |
| 中心简介 | `about.html` | 中心概况、组织架构；研究方向与联系我们通过下拉菜单直达对应页面 |
| 中心动态 | `news.html`、`news-detail.html` | 新闻列表与新闻详情 |
| 通知公告 | `notices.html`、`notice-detail.html` | 独立公告列表与公告详情 |
| 学术团队 | `people.html`、`people-detail.html` | 中心成员、研究团队与专家详情 |
| 研究方向 | `research.html` | 非遗价值链、旅游体验、视听传播三个正式方向 |
| 他山之石 | `perspectives.html` | 独立一级栏目 |
| 联系我们 | `contact.html` | 中心联系方式 |
| 保留栏目 | `heritage.html`、`fieldwork.html`、`resources.html`、`policies.html` | 保留 V1 内容与路由，作为补充资源页面 |

## 主要文件

    whyj-redesign/
    ├── index.html                 V2 首页
    ├── about.html                 中心简介与组织架构
    ├── news.html                  新闻列表
    ├── news-detail.html           新闻详情模板
    ├── notices.html               通知公告列表
    ├── notice-detail.html         通知公告详情模板
    ├── people.html                学术团队
    ├── people-detail.html         专家详情模板
    ├── research.html              三个研究方向
    ├── perspectives.html          他山之石
    ├── contact.html               联系我们
    ├── news-data.js               新闻数据
    ├── notice-data.js             通知公告数据
    ├── people-data.js             原有专家资料
    ├── styles.css                 全站样式与响应式规则
    ├── script.js                  导航、轮播、列表和详情渲染
    ├── assets/images/             10 张现有本地图片
    ├── tests/test_v2_structure.py 结构、路由和内容约束测试
    └── tests/browser-smoke.cjs    多视口真实浏览器冒烟测试

## 内容边界

- 新闻与公告严格使用现有资料；没有正文的记录在详情页显示“正文资料待导入”，不虚构内容。
- 三个研究方向的团队成员和成果仅保留待补位置，不编造姓名、项目或成果。
- 专家简介继续由 `people-data.js` 提供，原始文字和照片均保留。
- 尚未接入 CMS、后台编辑、下载文件和站内搜索服务。
- 全站图片、CSS、JavaScript 均使用本地相对路径；“武体首页”是唯一主导航外链并在新窗口打开。

## 自动化测试

结构测试只使用 Python 标准库：

    python -m unittest tests.test_v2_structure -v

真实浏览器测试使用 Playwright（仅开发依赖，不进入网站运行时）：

    npm install
    npm run test:browser

脚本优先使用 `BROWSER_EXECUTABLE` 指定的浏览器；未指定时会寻找常见 Chrome/Edge 路径，均不存在时使用 Playwright 随包浏览器。

## Replit 部署

1. 将本目录作为 GitHub 仓库根目录并推送。
2. 在 Replit 选择 **Import from GitHub**。
3. 点击 **Run**。
4. `.replit` 会启动 3000 端口的静态服务器。

上线前请按 `DEPLOYMENT_CHECKLIST.md` 复核页面、资源和浏览器行为。
