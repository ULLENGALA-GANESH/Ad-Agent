import tempfile
import unittest
from functools import partial
from http.client import IncompleteRead
from pathlib import Path
from unittest.mock import Mock, patch

from flask import Flask

from investigations.api import Console, install
from investigations.briefs import create_brief
from investigations.inputs import sample_input
from investigations.worker import execute


class BriefTests(unittest.TestCase):
    incident = dict(id=1, metric="requests", peak_record=105, observed=2_000_000,
                    expected=100, low=20, high=200, count=3, log_count=0)

    def test_claims_must_copy_distinct_values_from_requested_tools(self):
        ask = Mock(side_effect=[
            {"tools": ["inspect_signal"]},
            {"claims": [{"key": "observed", "value": 1_999_999},
                        {"key": "median", "value": 100},
                        {"key": "record", "value": 105},
                        {"key": "record", "value": 105}], "follow_up": "events"},
        ])
        brief = create_brief(self.incident, "test-model", ask)
        self.assertEqual((brief["status"], brief["calls"], brief["rejected"]), ("verified", 2, 3))
        self.assertEqual([(c["key"], c["evidence"]) for c in brief["claims"]], [("record", "Record 105")])

    def test_unverified_claims_leave_the_deterministic_brief_available(self):
        ask = Mock(side_effect=[
            {"tools": ["read_event_window"]},
            {"claims": [{"key": "events", "value": False}], "follow_up": "events"},
        ])
        brief = create_brief(self.incident, "test-model", ask)
        self.assertEqual((brief["status"], brief["claims"], brief["rejected"]), ("no_verified_claims", [], 1))
        self.assertEqual(brief["baseline"][-1]["value"], 0)

    def test_invalid_model_responses_leave_no_claims(self):
        answers = [
            [{"tools": ["unknown_tool"]}],
            [{"tools": ["inspect_signal"]}, {"claims": [{"key": "record", "value": 105}], "follow_up": []}],
            [{"tools": ["inspect_signal"]}, IncompleteRead(b'{"message"')],
        ]
        for responses in answers:
            with self.subTest(responses=responses):
                brief = create_brief(self.incident, "test-model", Mock(side_effect=responses))
                self.assertEqual(brief["status"], "unavailable")
                self.assertEqual(brief["claims"], [])
                self.assertEqual(brief["calls"], len(responses))
                self.assertTrue(brief["baseline"])

    def test_optional_brief_is_persisted_only_on_its_incident(self):
        with tempfile.TemporaryDirectory() as directory:
            app = Flask(__name__)
            console = Console(Path(directory) / "jobs.sqlite", workers=0)
            install(app, console)
            client, store = app.test_client(), console.open()
            sample = {"sample": "ec2-cpu"}
            plain = client.post("/api/runs", json=sample).get_json()["id"]
            with patch("investigations.workflow.create_brief") as model:
                execute(store, store.claim())
                model.assert_not_called()
            self.assertNotIn("brief", client.get(f"/api/runs/{plain}").get_json()["summary"])
            self.assertEqual(client.post("/api/runs", json={**sample, "local_brief": "yes"}).status_code, 400)

            with patch.dict("os.environ", AD_AGENT_OLLAMA_MODEL="test-model"):
                rid = client.post("/api/runs", json={**sample, "local_brief": True}).get_json()["id"]
                self.assertTrue(client.post("/api/runs", json={**sample, "local_brief": True}).get_json()["reused"])
            self.assertNotEqual(plain, rid)
            legacy_data = {**sample_input("ec2-cpu"), "brief_model": "test-model"}
            self.assertNotEqual(store.submit(legacy_data)[0], rid)
            brief_without_service = partial(create_brief, ask=Mock(side_effect=ConnectionRefusedError()))
            with patch("investigations.workflow.create_brief", side_effect=brief_without_service):
                execute(store, store.claim())
            run = client.get(f"/api/runs/{rid}").get_json()
            self.assertEqual(run["status"], "completed")
            number = run["summary"]["brief"]["incident"]
            detail = client.get(f"/api/runs/{rid}/incidents/{number}").get_json()["detail"]
            self.assertEqual(detail["brief"]["status"], "unavailable")
            self.assertEqual(detail["brief"]["baseline"][0]["value"], detail["observed"])
            other = 2 if number == 1 else 1
            self.assertNotIn("brief", client.get(f"/api/runs/{rid}/incidents/{other}").get_json()["detail"])


if __name__ == "__main__":
    unittest.main()
