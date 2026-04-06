from pathlib import Path

import changetech


def test_migrate_to_fabric_replaces_sql_source(monkeypatch):
    monkeypatch.setattr(changetech, "FABRIC_WORKSPACE_ID", "ws-123")
    monkeypatch.setattr(changetech, "FABRIC_LAKEHOUSE_ID", "lh-456")

    source = """
let
    Source = Sql.Database("legacy-server", "legacy-db"),
    Sales = Source{[Schema="dbo",Item="Sales"]}[Data]
in
    Sales
"""

    migrated = changetech.migrate_to_fabric(source)

    assert "Lakehouse.Contents" in migrated
    assert "ws-123" in migrated
    assert "lh-456" in migrated
    assert "Sql.Database" not in migrated


def test_migrate_to_fabric_keeps_non_supported_connectors():
    source = """
let
    Source = Excel.Workbook(File.Contents("C:/data.xlsx"), null, true)
in
    Source
"""

    migrated = changetech.migrate_to_fabric(source)

    assert migrated == source


def test_process_tables_only_updates_supported_files(tmp_path, monkeypatch):
    tables_dir = tmp_path / "definition" / "tables"
    tables_dir.mkdir(parents=True)

    sql_file = tables_dir / "sql_table.tmdl"
    sql_file.write_text(
        """
let
    Source = Sql.Database("old-server", "old-db")
in
    Source
""",
        encoding="utf-8",
    )

    excel_file = tables_dir / "excel_table.tmdl"
    excel_file.write_text(
        """
let
    Source = Excel.Workbook(File.Contents("C:/data.xlsx"), null, true)
in
    Source
""",
        encoding="utf-8",
    )

    monkeypatch.setattr(changetech, "BASE_PATH", tables_dir)
    monkeypatch.setattr(changetech, "FABRIC_WORKSPACE_ID", "ws-id")
    monkeypatch.setattr(changetech, "FABRIC_LAKEHOUSE_ID", "lh-id")

    changetech.process_tables()

    updated_sql = sql_file.read_text(encoding="utf-8")
    unchanged_excel = excel_file.read_text(encoding="utf-8")

    assert "Lakehouse.Contents" in updated_sql
    assert "Sql.Database" not in updated_sql
    assert "Excel.Workbook" in unchanged_excel
