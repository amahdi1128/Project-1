import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from collect import classify, normalize, safe_cost
from permit_privacy import redact_contact_details

class CollectionTests(unittest.TestCase):
    def test_classify(self):
        self.assertEqual(classify('Remove and replace roof covering', '', ''), 'Roofing')
        self.assertEqual(classify('INSTALL NEW HVAC SYSTEM', '', ''), 'HVAC')
        self.assertEqual(classify('random unspecified work', '', ''), 'Other')
    def test_normalize(self):
        item = normalize({'permit_':'1234','issue_date':'2026-11-18T00:00:00.000','street_number':'100','street_direction':'N','street_name':'STATE ST','reported_cost':'12345.67','work_description':'Electrical work'})
        self.assertEqual(item['trade'], 'Electrical')
        self.assertEqual(item['address'], '100 N STATE ST')
        self.assertEqual(item['cost'], 12345.67)
        self.assertNotIn('contact_1_name', item)
    def test_redacts_contact_details(self):
        for phone in ("202-555-0142", "(202) 555-0142", "+1 202.555.0142 ext. 5"):
            with self.subTest(phone=phone):
                self.assertEqual(
                    redact_contact_details(f"Roof work. Ask office@example.test or call {phone}."),
                    "Roof work. Ask [email removed] or call [phone removed].",
                )
        self.assertEqual(redact_contact_details("Permit BLD-202-555-0142"), "Permit BLD-202-555-0142")

    def test_redacts_before_truncating(self):
        description = 'x ' * 596 + 'office@example.test'
        item = normalize({'permit_': '1234', 'issue_date': '2026-11-18', 'work_description': description})
        self.assertNotIn('office', item['description'])
        self.assertEqual(len(item['description']), 1200)

    def test_missing(self):
        self.assertIsNone(normalize({'permit_':'1234'}))
        self.assertIsNone(safe_cost('not a number'))
        self.assertIsNone(safe_cost('-99'))

if __name__ == '__main__':
    unittest.main()
