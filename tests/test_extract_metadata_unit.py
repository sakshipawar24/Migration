from pathlib import Path

import extract_metadata


def test_resolve_model_paths_finds_definition_folder(tmp_path):
    pbip_path = tmp_path / "Report"
    definition = pbip_path / "definition"
    tables_dir = definition / "tables"
    tables_dir.mkdir(parents=True)

    (definition / "database.tmdl").write_text("server: test-server", encoding="utf-8")

    paths = extract_metadata.resolve_model_paths(pbip_path)

    assert paths["tables_dir"] == tables_dir
    assert paths["database_file"] == definition / "database.tmdl"


def test_extract_connection_details_sql_and_lakehouse():
    sql_server, sql_db = extract_metadata.extract_connection_details(
        'let Source = Sql.Database("server1", "db1") in Source'
    )
    lh_server, lh_db = extract_metadata.extract_connection_details(
        'Source = Lakehouse.Contents("https://api.fabric.microsoft.com", [WorkspaceId = "ws1", LakehouseId = "lh1"])'
    )

    assert (sql_server, sql_db) == ("server1", "db1")
    assert (lh_server, lh_db) == ("ws1", "lh1")


def test_extract_connection_details_sql_parameterized_arguments():
    server, database = extract_metadata.extract_connection_details(
        'let Source = Sql.Database(SqlServerInstance, SqlServerDatabase) in Source'
    )

    assert (server, database) == ("SqlServerInstance", "SqlServerDatabase")


def test_collect_metadata_returns_model_and_table_details(tmp_path):
    pbip_path = tmp_path / "Report"
    definition = pbip_path / "definition"
    tables_dir = definition / "tables"
    tables_dir.mkdir(parents=True)

    (definition / "database.tmdl").write_text(
        """
server: default-server
database: default-db
protocol: tds
provider: sql
connectionType: Sql.Database
dataSourceType: Structured
""",
        encoding="utf-8",
    )

    (definition / "model.tmdl").write_text(
        """
model SalesModel
""",
        encoding="utf-8",
    )

    (tables_dir / "Sales.tmdl").write_text(
        """
table 'Sales'
partition Sales = m
    mode: DirectQuery
    source =
        let
            Source = Sql.Database("table-server", "table-db")
        in
            Source
    annotation PBI_NavigationStepName = Navigation
""",
        encoding="utf-8",
    )

    metadata = extract_metadata.collect_metadata(pbip_path)

    assert metadata["modelName"] == "SalesModel"
    assert metadata["protocol"] == "tds"
    assert len(metadata["tables"]) == 1
    table = metadata["tables"][0]
    assert table["name"] == "Sales"
    assert table["mode"] == "DirectQuery"
    assert table["source"] == "SQL Server"
    assert table["connectionType"] == "Sql.Database"
    assert table["server"] == "table-server"
    assert table["database"] == "table-db"


def test_collect_metadata_extracts_inline_source_query(tmp_path):
    pbip_path = tmp_path / "Report"
    definition = pbip_path / "definition"
    tables_dir = definition / "tables"
    tables_dir.mkdir(parents=True)

    (definition / "database.tmdl").write_text(
        "server: fallback-server\ndatabase: fallback-db\n",
        encoding="utf-8",
    )

    (tables_dir / "InlineQuery.tmdl").write_text(
        """
table 'InlineQuery'
partition InlineQuery = m
    mode: DirectQuery
    source = Sql.Database("inline-server", "inline-db", [Query="SELECT * FROM [inline-db].[dbo].[DimDate]"])
    annotation PBI_NavigationStepName = Navigation
""",
        encoding="utf-8",
    )

    metadata = extract_metadata.collect_metadata(pbip_path)

    assert len(metadata["tables"]) == 1
    table = metadata["tables"][0]
    assert "Sql.Database(\"inline-server\", \"inline-db\"" in table["mQuery"]
    assert table["server"] == "inline-server"
    assert table["database"] == "inline-db"
