from __future__ import annotations

import re
import unittest

from tests.test_v2_structure import ROOT, find_all, load_dom


class HomeV21Tests(unittest.TestCase):
    def test_home_is_banner_plus_one_hierarchical_four_module_grid(self):
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
        self.assertEqual(["news", "media", "notices", "results"], quadrants)
        self.assertEqual([], find_all(dom, class_name="home-about"))

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


if __name__ == "__main__":
    unittest.main()
