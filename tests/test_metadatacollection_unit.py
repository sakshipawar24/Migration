import csv
from pathlib import Path

import metadatacollection


def test_extract_m_block_from_partition_stops_on_annotation():
    text = """
partition Sales = m
    source =
        let
            Source = Sql.Database("server-a", "db-a"),
            Sales = Source{[Schema="dbo",Item="Sales"]}[Data]
        in
            Sales
    annotation PBI_NavigationStepName = Navigation
"""

    m_query = metadatacollection.extract_m_block_from_partition(text)

    assert "Sql.Database(\"server-a\", \"db-a\")" in m_query
    assert "annotation" not in m_query.lower()


def test_find_connections_returns_sql_server_connector():
    source, conn = metadatacollection.find_connections('let Source = Sql.Database("s", "d") in Source')

    assert source == "SQL Server"
    assert conn == "Sql.Database"


def test_extract_connection_details_supports_sql_and_lakehouse():
    sql_server, sql_db = metadatacollection.extract_connection_details(
        'let Source = Sql.Database("my-server", "my-db") in Source'
    )
    lh_server, lh_db = metadatacollection.extract_connection_details(
        'Source = Lakehouse.Contents("https://api.fabric.microsoft.com", [WorkspaceId = "ws-id", LakehouseId = "lh-id"])'
    )

    assert (sql_server, sql_db) == ("my-server", "my-db")
    assert (lh_server, lh_db) == ("ws-id", "lh-id")


def test_collect_metadata_creates_csv_for_before_mode(tmp_path, monkeypatch):
    pbip_path = tmp_path / "Sample.SemanticModel"
    tables_dir = pbip_path / "definition" / "tables"
    tables_dir.mkdir(parents=True)

    table_file = tables_dir / "Sales.tmdl"
    table_file.write_text(
        """
table 'Sales'
partition Sales = m
    mode: DirectQuery
    source =
        let
            Source = Sql.Database("sql-server", "sales-db")
        in
            Source
    annotation PBI_NavigationStepName = Navigation
""",
        encoding="utf-8",
    )

    monkeypatch.chdir(tmp_path)

    output_file = metadatacollection.collect_metadata(str(pbip_path), mode="before")

    assert output_file == "pbip_before_metadata.csv"
    output_path = tmp_path / output_file
    assert output_path.exists()

    with output_path.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    assert len(rows) == 1
    row = rows[0]
    assert row["Name"] == "Sales"
    assert row["Connection_Type"] == "Sql.Database"
    assert row["Server"] == "sql-server"
    assert row["Database_Name"] == "sales-db"
    assert row["After_Server"] == "dummy_server"
    assert row["After_Database"] == "dummy_database"
