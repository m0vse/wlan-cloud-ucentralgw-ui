import unittest
from unittest.mock import patch
import server


def sample(recorded, clients, partial=False):
    state = {"radios": [{"phy": "phy0", "band": ["6G"], "channel": 37}]}
    if not partial:
        state["interfaces"] = [{"clients": [{"mac": "aa:bb", "ipv4_addresses": ["192.0.2.1"]}],
                                "ssids": [{"ssid": "Test", "phy": "phy0", "bssid": "aa:cc", "associations": clients}]}]
    return {"recorded": recorded, "data": state}


class ClientsTests(unittest.TestCase):
    def test_authentication_precedes_any_data_access(self):
        for value in (None, "", "Basic abc", "Bearer bad\nheader"):
            with patch.object(server, "fetch") as fetch:
                with self.assertRaises(server.ApiError) as error:
                    server.collect(value, {})
                self.assertEqual(error.exception.status, 401)
                fetch.assert_not_called()

    def test_nonroot_and_suspended_users_denied(self):
        for user in ({"userRole": "admin"}, {"userRole": "root", "suspended": True}, {"userRole": "root", "blackListed": True}, {}):
            with patch.object(server, "fetch", return_value=user) as fetch:
                with self.assertRaises(server.ApiError) as error:
                    server.collect("Bearer test", {})
                self.assertEqual(error.exception.status, 403)
                self.assertEqual(fetch.call_count, 1)
                self.assertEqual(fetch.call_args.args[:2], ("sec", "oauth2?me=true"))

    def test_security_failure_fails_closed(self):
        with patch.object(server, "fetch", side_effect=server.ApiError(502, "Unavailable")), patch.object(server, "get_devices") as devices:
            with self.assertRaises(server.ApiError):
                server.collect("Bearer test", {})
            devices.assert_not_called()

    def test_current_client_and_phy_band(self):
        rows = server.sessions([sample(100, [{"station": "AA:BB", "connected": 20, "rssi": -55}])], {"apSerial": "test"})
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["band"], "6G")
        self.assertEqual(rows[0]["ip"], "192.0.2.1")
        self.assertEqual(rows[0]["startTime"], 80)
        self.assertIsNone(rows[0]["endTime"])

    def test_observed_end_and_reassociation_are_separate_rows(self):
        samples = [sample(100, [{"station": "aa:bb", "connected": 20}]), sample(110, []), sample(120, [{"station": "aa:bb", "connected": 5}])]
        rows = server.sessions(samples[::-1], {"apSerial": "test"})
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["endTime"], 110)
        self.assertIsNone(rows[1]["endTime"])
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])

    def test_duration_reset_starts_new_association(self):
        rows = server.sessions([sample(100, [{"station": "aa:bb", "connected": 20}]), sample(110, [{"station": "aa:bb", "connected": 3}])], {"apSerial": "test"})
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["endTime"], 110)

    def test_partial_report_does_not_end_client(self):
        rows = server.sessions([sample(100, [{"station": "aa:bb"}]), sample(110, [], partial=True)], {"apSerial": "test"})
        self.assertIsNone(rows[0]["endTime"])

    def test_radio_reference_and_duplicate_mac_on_distinct_bssids(self):
        data = sample(100, [{"station": "aa:bb"}])["data"]
        ssid = data["interfaces"][0]["ssids"][0]
        ssid.pop("phy")
        ssid["radio"] = {"$ref": "#/radios/0"}
        data["interfaces"][0]["ssids"].append(dict(ssid, bssid="aa:dd"))
        rows = server.sessions([{"recorded": 100, "data": data}], {"apSerial": "test"})
        self.assertEqual(len(rows), 2)
        self.assertEqual([r["band"] for r in rows], ["6G", "6G"])

    def test_filters_and_default_excludes_ended(self):
        root = {"userRole": "root"}
        rows = [{"endTime": None, "entityId": "customer", "venueId": "site", "apSerial": "test", "band": "6G"},
                {"endTime": 100, "entityId": "customer", "venueId": "site", "apSerial": "test", "band": "6G"}]
        with patch.object(server, "fetch", return_value=root), patch.object(server, "get_devices", return_value=[{}]), patch.object(server, "device_rows", return_value=(rows, {"apSerial": "test"}, "")):
            self.assertEqual(len(server.collect("Bearer test", {})["rows"]), 1)
            self.assertEqual(len(server.collect("Bearer test", {"historic": ["true"]})["rows"]), 2)
            self.assertEqual(len(server.collect("Bearer test", {"band": ["5G"]})["rows"]), 0)
            self.assertEqual(len(server.collect("Bearer test", {"entity": ["other"]})["rows"]), 0)


if __name__ == "__main__":
    unittest.main()
