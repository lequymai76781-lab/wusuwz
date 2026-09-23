from __future__ import annotations

import re
import unittest

from tests.test_v2_structure import ROOT, find_all, load_dom


class HomeV21Tests(unittest.TestCase):
    def test_home_is_banner_plus_one_compact_four_module_grid(self):
        dom = load_dom("index.html")
        sections = [node.attrs["data-home-section"] for node in find_all(dom, attr="data-home-section")]
        self.assertEqual(["banner", "core-grid"], sections)

        grids = find_all(dom, class_name="home-core-grid")
        self.assertEqual(1, len(grids))
        quadrants = [
            node.attrs["data-home-quadrant"]
            for node in grids[0].children
            if "data-home-quadrant" in node.attrs
        ]
        self.assertEqual(["news", "notices", "research", "media"], quadrants)
        self.assertEqual([], find_all(dom, class_name="home-about"))

        research_modules = find_all(dom, class_name="home-research-directions")
        self.assertEqual(1, len(research_modules))
        self.assertEqual(0, len(find_all(dom, attr="data-research-results")))
        for title in (
            "数智技术赋能非遗的价值链延伸与良好发展",
            "数智驱动非遗的文旅融合与科学化循证",
            "非遗数智传播与活态转化研究",
        ):
            self.assertIn(title, research_modules[0].content())

    def test_media_is_a_real_independent_content_type(self):
        required = {"media-data.js", "media.html", "media-detail.html"}
        self.assertEqual(required, {name for name in required if (ROOT / name).exists()})

        home = load_dom("index.html")
        scripts = [node.attrs.get("src") for node in find_all(home, tag="script")]
        self.assertIn("media-data.js", scripts)
        self.assertEqual(1, len(find_all(home, attr="data-media-list")))
        self.assertEqual(0, len(find_all(home, attr="data-home-media-state")))

        news_ids = set(re.findall(r'id:\s*"([^"]+)"', (ROOT / "news-data.js").read_text(encoding="utf-8")))
        media_ids = set(re.findall(r'id:\s*"([^"]+)"', (ROOT / "media-data.js").read_text(encoding="utf-8")))
        self.assertEqual({
            "people-heritage-community-spaces-2026",
            "gmrb-heritage-contemporary-expression-2026",
            "gmrb-heritage-museum-experience-2026",
        }, media_ids)
        self.assertTrue(news_ids.isdisjoint(media_ids))

    def test_home_uses_final_research_directions_and_bianzhong_divider(self):
        home = load_dom("index.html")
        home_text = home.content()
        final_titles = [
            "数智技术赋能非遗的价值链延伸与良好发展",
            "数智驱动非遗的文旅融合与科学化循证",
            "非遗数智传播与活态转化研究",
        ]
        for title in final_titles:
            self.assertIn(title, home_text)

        hero_labels = [node.content() for node in find_all(home, class_name="home-hero-index")]
        self.assertEqual(1, len(hero_labels))
        for label in ("RESEARCH 01", "RESEARCH 02", "RESEARCH 03", "研究一", "研究二", "研究三"):
            self.assertIn(label, hero_labels[0])

        dividers = find_all(home, class_name="home-cultural-divider")
        self.assertEqual(1, len(dividers))
        self.assertEqual(1, len(find_all(dividers[0], tag="svg")))
        self.assertEqual(0, len(find_all(dividers[0], tag="img")))

    def test_final_research_copy_is_synchronized_on_direction_surfaces(self):
        final_titles = [
            "数智技术赋能非遗的价值链延伸与良好发展",
            "数智驱动非遗的文旅融合与科学化循证",
            "非遗数智传播与活态转化研究",
        ]
        final_summaries = [
            "“数智技术赋能非遗价值链延伸与和谐发展”，围绕人工智能、动作捕捉、数字影像、虚拟交互等技术开展非遗数字资源建设，并推动非遗从传统保护向数字保护、健康服务和价值共创延伸。",
            "“数智驱动非遗的文旅融合与科学化循证”，立足民族传统体育非遗，通过田野调查、运动生理测试、文献考据等多源证据，推动传统体育非遗的科学化、标准化教学、健康应用和活态保护。",
            "“非遗数智传播与活态转化研究”，聚焦非遗数智表达、全媒体传播、数字化建档、活态传承以及大众表达。",
        ]
        research_text = load_dom("research.html").content()
        people_text = load_dom("people.html").content()
        for title in final_titles:
            self.assertIn(title, research_text)
            self.assertIn(title, people_text)
        for summary in final_summaries:
            self.assertIn(summary, research_text)

        retired_labels = ["SPORT" + " HERITAGE", "DIGITAL" + " HERITAGE", "传播" + "转化"]
        direction_surface = load_dom("index.html").content() + research_text + people_text
        for label in retired_labels:
            self.assertNotIn(label, direction_surface)

    def test_retired_english_direction_labels_are_absent_from_direction_surfaces(self):
        direction_surface = "".join((ROOT / name).read_text(encoding="utf-8") for name in ("index.html", "research.html", "people.html"))
        for label in ("SPORT" + " HERITAGE", "DIGITAL" + " HERITAGE", "COMMUNI" + "CATION"):
            self.assertNotIn(label, direction_surface.upper())


if __name__ == "__main__":
    unittest.main()
