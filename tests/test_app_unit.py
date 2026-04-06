from pathlib import Path

import app as app_module


def test_parse_download_summary_parses_expected_format():
    summary = app_module.parse_download_summary("x DOWNLOAD_SUMMARY|total=10|downloaded=4|skipped=6 y")

    assert summary == {"total": 10, "downloaded": 4, "skipped": 6}


def test_normalize_connector_fields_enriches_unknown_row():
    row = {
        "source": "Unknown",
        "connectionType": "",
        "mQuery": 'let Source = Sql.Database("server-a", "db-a") in Source',
    }

    normalized = app_module.normalize_connector_fields(row)

    assert normalized["source"] == "SQL Server"
    assert normalized["connectionType"] == "Sql.Database"


def test_resolve_semantic_model_path_finds_nested_folder(tmp_path):
    report_root = tmp_path / "MyReport"
    semantic_model = report_root / "MyReport.SemanticModel"
    semantic_model.mkdir(parents=True)

    model_path, report_path = app_module.resolve_semantic_model_path(report_root)

    assert model_path == semantic_model
    assert report_path == report_root


def test_download_pbix_route_formats_all_already_downloaded_message(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(
        app_module,
        "run_power_bi_action",
        lambda action, data, timeout=900: (
            "DOWNLOAD_SUMMARY|total=3|downloaded=0|skipped=3",
            None,
        ),
    )

    response = client.post("/api/pbi/download", json={})
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["message"] == "All files are already downloaded."
    assert payload["downloadSummary"] == {"total": 3, "downloaded": 0, "skipped": 3}


def test_download_pbix_route_returns_400_on_power_bi_error(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(
        app_module,
        "run_power_bi_action",
        lambda action, data, timeout=900: (None, "missing credentials"),
    )

    response = client.post("/api/pbi/download", json={})
    payload = response.get_json()

    assert response.status_code == 400
    assert payload["success"] is False
    assert payload["error"] == "missing credentials"
