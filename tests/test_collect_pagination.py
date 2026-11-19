import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect import normalize
from collect_markets import arcgis_rows, date_string
from pagination import iter_rows


class PaginationTests(unittest.TestCase):
    def test_exact_cap_requires_terminal_probe(self):
        records = [{"id": n} for n in range(5)]

        def fetch(offset, size):
            page = records[offset:offset + size]
            return page, len(page) == size

        self.assertEqual(list(iter_rows(fetch, limit=5, page_size=3)), records)
        with self.assertRaisesRegex(RuntimeError, "safety cap"):
            list(iter_rows(fetch, limit=4, page_size=3))

    @patch("collect_markets.get_json")
    def test_arcgis_advances_by_actual_page_length(self, fetch):
        fetch.side_effect = [
            {"features": [{"attributes": {"id": 1}}], "exceededTransferLimit": True},
            {"features": [{"attributes": {"id": 2}}], "exceededTransferLimit": False},
        ]
        rows = arcgis_rows("https://example.test", "1=1", "id", fields="id")
        self.assertEqual(list(rows), [{"id": 1}, {"id": 2}])
        self.assertEqual(fetch.call_args_list[1].args[1]["resultOffset"], 1)

    def test_no_progress_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "without making progress"):
            list(iter_rows(lambda offset, size: ([], True), limit=10))

    def test_invalid_dates_are_excluded(self):
        self.assertIsNone(normalize({"permit_": "1", "issue_date": "2026-02-30"}))
        self.assertEqual(date_string("2026-02-30"), "")
        self.assertEqual(date_string(float("inf")), "")
        self.assertEqual(date_string(0), "1970-01-01")
