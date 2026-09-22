# 图片资源清单

网站继续保留原有 10 张本地图片、上一轮线稿素材与 2 张官方媒体识别图。当前首页不加载上一轮全局线稿，页面统一通过项目内相对路径加载。

| 本地文件 | V2 页面使用 | 来源 |
|---|---|---|
| `assets/images/hero-dragon-boat.png` | 首页 Banner 轮播：研究方向一 | 用户提供的龙舟主题图 |
| `assets/images/hero-academic.png` | 首页 Banner 轮播：学术交流 | 用户提供的学术交流画面 |
| `assets/images/hero-fieldwork.png` | 首页 Banner 轮播：田野调查 | 用户提供的田野调查画面 |
| `assets/images/campus-gate.jpg` | 中心简介相关视觉 | 用户提供的武汉体育学院校门照片 |
| `assets/images/campus-aerial.jpg` | 中心简介校园视觉 | 用户提供的武汉体育学院校园航拍 |
| `assets/images/experts/su-jianjiao.jpg` | 学术团队中心成员、苏健蛟详情 | 苏健蛟个人简介 DOCX 内嵌图片 |
| `assets/images/experts/lv-yongfeng.jpg` | 学术团队中心成员、吕永峰详情 | 吕永峰个人简介 DOCX 内嵌图片 |
| `assets/images/experts/jiang-xiaoling.jpg` | 学术团队中心成员、姜小凌详情 | 姜小凌个人简介 DOCX 内嵌图片 |
| `assets/images/experts/wang-anni.jpg` | 学术团队中心成员、王安妮详情 | 王安妮个人简历 DOCX 内嵌图片 |
| `assets/images/experts/yu-qinyun.jpg` | 学术团队中心成员、余沁芸详情 | 余沁芸个人介绍 DOCX 内嵌图片 |
| `assets/images/hubei-heritage-linework.png` | 保留素材，本轮首页不加载 | 上一轮生成的低对比度文化线稿；现已由内联 SVG 编钟分隔带替代 |
| `assets/media/people-daily-frontpage-20260917.jpg` | 媒体聚焦：人民日报来源识别（仅在容器内裁切显示官方报头区域） | 人民日报数字报 2026-09-17 官方头版图片：https://paper.people.com.cn/rmrb/pc/layout/202609/17/node_01.html |
| `assets/media/guangming-daily-mark.png` | 媒体聚焦：光明日报来源识别 | 光明日报数字报官方页面直接引用图片：https://img.gmw.cn/pic/gmrb_logo_white_180x180.png |

## 使用约束

- 首页轮播只使用前三张既有横幅图。
- 专家照片与 `people-data.js` 中的专家记录一一对应。
- V2 未删除、替换或重新压缩上述图片。
- 媒体标识仅用于识别新闻来源，不重绘、不改字；人民日报图片只通过 CSS 视窗显示报头区域。
- 上一轮全局线稿本轮停用；首页四模块与 Footer 之间改用纯 SVG 编钟分隔带。
- 发布时必须保留当前目录层级和文件名，否则相对路径会失效。
