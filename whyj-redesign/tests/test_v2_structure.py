from __future__ import annotations

import pathlib
import re
import unittest
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[1]
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]], parent: "Node | None" = None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children: list[Node] = []
        self.text: list[str] = []

    def classes(self) -> set[str]:
        return set((self.attrs.get("class") or "").split())

    def content(self) -> str:
        parts = list(self.text)
        for child in self.children:
            parts.append(child.content())
        return " ".join(" ".join(parts).split())

    def descendants(self):
        for child in self.children:
            yield child
            yield from child.descendants()


class DOMParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("document", [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs, self.stack[-1]))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data):
        if data.strip():
            self.stack[-1].text.append(data.strip())


def load_dom(name: str) -> Node:
    parser = DOMParser()
    parser.feed((ROOT / name).read_text(encoding="utf-8"))
    return parser.root


def find_all(root: Node, *, tag: str | None = None, class_name: str | None = None, attr: str | None = None):
    nodes = [root, *root.descendants()]
    return [
        node
        for node in nodes
        if (tag is None or node.tag == tag)
        and (class_name is None or class_name in node.classes())
        and (attr is None or attr in node.attrs)
    ]


class V2StructureTests(unittest.TestCase):
    maxDiff = None

    def test_required_v2_routes_exist(self):
        expected = {
            "notices.html",
            "news-detail.html",
            "notice-detail.html",
            "research-award-detail.html",
            "news-data.js",
            "notice-data.js",
        }
        self.assertEqual(expected, {name for name in expected if (ROOT / name).exists()})

    def test_home_has_one_carousel_and_one_core_grid(self):
        dom = load_dom("index.html")
        sections = [node.attrs["data-home-section"] for node in find_all(dom, attr="data-home-section")]
        self.assertEqual(["banner", "core-grid"], sections)
        self.assertEqual(3, len(find_all(dom, attr="data-slide")))
        self.assertEqual(3, len(find_all(dom, attr="data-go")))

    def test_home_core_grid_uses_the_approved_four_modules_in_mobile_order(self):
        dom = load_dom("index.html")
        grid = find_all(dom, class_name="home-core-grid")[0]
        quadrants = [
            node.attrs["data-home-quadrant"]
            for node in grid.children
            if "data-home-quadrant" in node.attrs
        ]
        self.assertEqual(["news", "notices", "research", "media"], quadrants)
        self.assertEqual(1, len([node for node in find_all(dom, attr="data-home-quadrant") if node.attrs.get("data-home-quadrant") == "research"]))
        self.assertEqual(1, len(find_all(dom, attr="data-media-list")))
        self.assertEqual([], find_all(dom, attr="data-home-media-state"))

    def test_home_media_uses_the_three_confirmed_official_articles(self):
        source = (ROOT / "media-data.js").read_text(encoding="utf-8")
        urls = re.findall(r'url:\s*"([^"]+)"', source)
        self.assertEqual([
            "https://paper.people.com.cn/rmrb/pc/content/202609/17/content_30181548.html",
            "https://epaper.gmw.cn/gmrb/html/content/202609/08/content_24414.html",
            "https://epaper.gmw.cn/gmrb/html/content/202609/04/content_24004.html",
        ], urls)
        self.assertEqual(1, source.count('source: "人民日报"'))
        self.assertEqual(2, source.count('source: "光明日报"'))
        for temporary_copy in ("资料" + "待核验", "来源" + "待确认", "真实报道将在确认媒体来源后" + "发布"):
            self.assertNotIn(temporary_copy, (ROOT / "index.html").read_text(encoding="utf-8"))

    def test_home_research_results_use_fixed_order_and_local_pdfs(self):
        data_path = ROOT / "research-results-data.js"
        self.assertTrue(data_path.exists())
        source = data_path.read_text(encoding="utf-8")
        titles = re.findall(r'title:\s*"([^"]+)"', source)
        self.assertEqual([
            "【社科成果奖】中心研究员王安妮教授成果荣获湖北省社会科学优秀成果奖二等奖",
            "【研究论文】张颖慧等：大学生体育锻炼与负性生活事件对生活满意度的影响——基于消极情绪为中介的结构方程模型分析",
            "【研究论文】吕永峰等：体育饭圈治理制度困境的生成机理及其纾解路径——基于中国国家治理制度逻辑的视角",
            "【研究论文】张颖慧等：长期武术运动对大学生静息态脑网络连接的可塑性研究——来自fNIRS的证据",
        ], titles)
        urls = re.findall(r'url:\s*"([^"]+)"', source)
        self.assertEqual([
            "research-award-detail.html",
            "assets/papers/college-exercise-life-satisfaction.pdf",
            "assets/papers/sports-fandom-governance.pdf",
            "assets/papers/martial-arts-fnirs-brain-network.pdf",
        ], urls)

        home = load_dom("index.html")
        scripts = [node.attrs.get("src") for node in find_all(home, tag="script")]
        self.assertIn("research-results-data.js", scripts)
        self.assertEqual(1, len(find_all(home, attr="data-research-results")))

        for relative in urls[1:]:
            pdf = ROOT / relative
            self.assertTrue(pdf.exists(), f"missing {relative}")
            self.assertEqual(b"%PDF-", pdf.read_bytes()[:5])

    def test_center_news_keeps_the_approved_title_and_wechat_url(self):
        source = (ROOT / "news-data.js").read_text(encoding="utf-8")
        self.assertIn(
            'title: "研究中心主任苏健蛟教授受邀出席《汝阳县疗愈产业发展白皮书》发布会"',
            source,
        )
        self.assertIn('url: "https://mp.weixin.qq.com/s/qg4LxiSi-ZOupq19c1rmjA"', source)
    def test_award_detail_preserves_the_approved_body_verbatim(self):
        dom = load_dom("research-award-detail.html")
        paragraphs = [node.content() for node in find_all(dom, class_name="article-body")[0].children if node.tag == "p"]
        self.assertEqual([
            "近日，湖北省社会科学界联合会发布《第十五届湖北省社会科学优秀成果奖拟获奖成果公示公告》。根据《湖北省社会科学优秀成果奖励暂行办法》等有关规定，经初评、复评、终审等程序，第十五届湖北省社会科学优秀成果奖共评出拟获奖成果395项。其中，武汉体育学院湖北省非物质文化遗产研究中心研究员王安妮教授学术专著《舞蹈传播学》荣获二等奖。",
            "湖北省社会科学优秀成果奖是我省哲学社会科学领域的重要奖项，旨在表彰在哲学社会科学研究中取得突出成绩、具有较高学术价值和社会影响力的优秀成果。",
        ], paragraphs)
        self.assertEqual(
            "中心研究员王安妮教授成果荣获湖北省社会科学优秀成果奖二等奖",
            find_all(dom, tag="h1")[0].content(),
        )
        self.assertNotIn(".pdf", (ROOT / "research-award-detail.html").read_text(encoding="utf-8").lower())
    def test_home_header_has_a_distinct_brand_lockup(self):
        dom = load_dom("index.html")
        self.assertEqual(1, len(find_all(dom, attr="data-brand-lockup")))
        self.assertEqual(1, len(find_all(dom, class_name="identity-copy")))

    def test_institution_name_is_current_on_every_page(self):
        current_name = "湖北省非物质文化遗产中心"
        retired_name = "非物质文化遗产" + "研究中心"
        for path in sorted(ROOT.glob("*.html")):
            with self.subTest(page=path.name):
                source = path.read_text(encoding="utf-8")
                self.assertIn(current_name, source)
                self.assertIn(f"© {current_name}", source)
                dom = load_dom(path.name)
                chrome = " ".join(node.content() for node in find_all(dom, tag="header") + find_all(dom, tag="footer"))
                self.assertNotIn(retired_name, chrome)

    def test_every_page_uses_the_frozen_primary_navigation(self):
        expected = ["首页", "中心简介", "中心动态", "学术团队", "他山之石", "联系我们", "武体首页"]
        for path in sorted(ROOT.glob("*.html")):
            with self.subTest(page=path.name):
                dom = load_dom(path.name)
                navs = find_all(dom, tag="nav", class_name="desktop-nav")
                self.assertEqual(1, len(navs))
                nav = navs[0]
                primary = []
                for child in nav.children:
                    if child.tag == "a":
                        primary.append(child.content())
                    elif "nav-group" in child.classes():
                        direct_link = next(item for item in child.children if item.tag == "a")
                        primary.append(direct_link.content())
                self.assertEqual(expected, primary)

    def test_every_page_preserves_the_search_control(self):
        for path in sorted(ROOT.glob("*.html")):
            with self.subTest(page=path.name):
                dom = load_dom(path.name)
                toggles = find_all(dom, tag="button", class_name="search-toggle")
                forms = [node for node in find_all(dom, tag="form") if node.attrs.get("id") == "global-search"]
                self.assertEqual(1, len(toggles))
                self.assertEqual("global-search", toggles[0].attrs.get("aria-controls"))
                self.assertEqual(1, len(forms))

    def test_news_and_notices_have_separate_data_and_detail_routes(self):
        news = load_dom("news.html")
        notices = load_dom("notices.html")
        news_scripts = [node.attrs.get("src") for node in find_all(news, tag="script")]
        notice_scripts = [node.attrs.get("src") for node in find_all(notices, tag="script")]
        self.assertIn("news-data.js", news_scripts)
        self.assertNotIn("notice-data.js", news_scripts)
        self.assertIn("notice-data.js", notice_scripts)
        self.assertNotIn("news-data.js", notice_scripts)
        self.assertTrue(find_all(news, attr="data-news-list"))
        self.assertTrue(find_all(notices, attr="data-notice-list"))

        news_detail_scripts = [node.attrs.get("src") for node in find_all(load_dom("news-detail.html"), tag="script")]
        notice_detail_scripts = [node.attrs.get("src") for node in find_all(load_dom("notice-detail.html"), tag="script")]
        self.assertIn("news-data.js", news_detail_scripts)
        self.assertNotIn("notice-data.js", news_detail_scripts)
        self.assertIn("notice-data.js", notice_detail_scripts)
        self.assertNotIn("news-data.js", notice_detail_scripts)

    def test_center_members_begin_with_director_and_deputy_director(self):
        dom = load_dom("people.html")
        names = [node.content() for node in find_all(dom, class_name="person-name")]
        self.assertEqual(["苏健蛟", "吕永峰"], names[:2])
        self.assertEqual({"苏健蛟", "吕永峰", "姜小凌", "王安妮", "余沁芸"}, set(names))

    def test_about_page_contains_only_confirmed_leadership(self):
        dom = load_dom("about.html")
        organization = next(node for node in find_all(dom, attr="id") if node.attrs.get("id") == "organization")
        leadership = []
        for article in find_all(organization, tag="article"):
            role = next(child.content() for child in article.children if child.tag == "span")
            name = next(child.content() for child in article.children if child.tag == "h3")
            leadership.append((role, name))
        self.assertEqual([("主任", "苏健蛟"), ("副主任", "吕永峰")], leadership)

    def test_research_page_contains_all_three_frozen_directions(self):
        dom = load_dom("research.html")
        expected = {
            "value-chain": "数智技术赋能非遗的价值链延伸与良好发展",
            "tourism-experience": "数智驱动非遗的文旅融合与科学化循证",
            "research-03": "非遗数智传播与活态转化研究",
        }
        by_id = {node.attrs.get("id"): node.content() for node in find_all(dom, attr="id")}
        for section_id, title in expected.items():
            self.assertIn(title, by_id.get(section_id, ""))

    def test_perspectives_skip_link_and_mobile_navigation_are_operational(self):
        dom = load_dom("perspectives.html")
        mains = [node for node in find_all(dom, tag="main") if node.attrs.get("id") == "main"]
        scripts = [node.attrs.get("src") for node in find_all(dom, tag="script")]
        self.assertEqual(1, len(mains))
        self.assertIn("script.js", scripts)

    def test_local_html_links_and_fragments_resolve(self):
        failures = []
        for page in sorted(ROOT.glob("*.html")):
            dom = load_dom(page.name)
            for link in find_all(dom, tag="a"):
                href = link.attrs.get("href", "")
                if not href or href.startswith(("http://", "https://", "tel:", "mailto:", "data:")):
                    continue
                route, _, fragment = href.partition("#")
                route = route.split("?", 1)[0]
                target = ROOT / route if route else page
                if not target.exists():
                    failures.append(f"{page.name}: missing {href}")
                    continue
                if fragment:
                    target_dom = load_dom(target.name)
                    target_ids = {node.attrs.get("id") for node in find_all(target_dom, attr="id")}
                    if fragment not in target_ids:
                        failures.append(f"{page.name}: missing fragment {href}")
        self.assertEqual([], failures)


if __name__ == "__main__":
    unittest.main()
