import csv
import io
import unittest

from server import app
from workbench import DEMO


class WorkbenchTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        with DEMO.open(newline="") as stream:
            self.rows = list(csv.reader(stream))

    def upload(self, rows):
        stream = io.StringIO()
        csv.writer(stream).writerows(rows)
        return self.client.post("/workbench/analyze", data={
            "file": (io.BytesIO(stream.getvalue().encode()), "example.csv")
        })

    def test_demo_and_upload_match(self):
        demo = self.client.post("/workbench/analyze", data={"demo": "1"}).get_json()
        self.assertEqual(self.upload(self.rows).get_json(), demo)
        self.assertEqual((demo["fit"], demo["calibration"], demo["evaluated"]), (200, 100, 100))
        self.assertEqual(demo["models"]["ensemble"]["tp"], 6)

    def test_labels_never_affect_scores(self):
        labeled = self.upload(self.rows).get_json()
        unlabeled = self.upload([r[:-1] for r in self.rows]).get_json()
        self.assertEqual([(f["record"], f["score"]) for f in labeled["findings"]],
                         [(f["record"], f["score"]) for f in unlabeled["findings"]])
        self.assertNotIn("roc_auc", unlabeled["models"]["ensemble"])

    def test_constant_reference_and_single_class(self):
        response = self.upload([["sensor", "label"]] + [["3", "0"]] * 100)
        metrics = response.get_json()["models"]["ensemble"]
        self.assertEqual(metrics["alerts"], 0)
        self.assertNotIn("roc_auc", metrics)

    def test_reject_invalid_inputs(self):
        cases = [self.rows[:12], [["id", "id"]] + self.rows[1:],
                 self.rows[:100] + [["101", "nan", "1", "1", "0"]],
                 self.rows[:100] + [["101", "1", "1", "1", "2"]]]
        for rows in cases:
            with self.subTest(last=rows[-1]):
                self.assertEqual(self.upload(rows).status_code, 400)
        self.assertEqual(self.client.post("/workbench/analyze", data={
            "demo": "1", "alert_rate": "nan"}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
