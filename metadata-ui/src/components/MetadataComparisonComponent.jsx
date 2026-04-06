import React, { useEffect, useMemo, useState } from "react";

function MetadataComparisonComponent({
  externalBeforeData,
  externalAfterData,
  selectedReport,
  targetTechnology
}) {
  const [beforeData, setBeforeData] = useState([]);
  const [afterData, setAfterData] = useState([]);
  const [queryModal, setQueryModal] = useState({
    isOpen: false,
    query: "",
    title: ""
  });

  useEffect(() => {
    if (externalBeforeData !== undefined) {
      setBeforeData(externalBeforeData || []);
    }
  }, [externalBeforeData]);

  useEffect(() => {
    if (externalAfterData !== undefined) {
      setAfterData(externalAfterData || []);
    }
  }, [externalAfterData]);

  const filteredBefore = useMemo(() => {
    if (!selectedReport || selectedReport === "All") {
      return beforeData;
    }

    return beforeData.filter((row) => matchesReport(row, selectedReport));
  }, [beforeData, selectedReport]);

  const filteredAfter = useMemo(() => {
    if (!selectedReport || selectedReport === "All") {
      return afterData;
    }

    return afterData.filter((row) => matchesReport(row, selectedReport));
  }, [afterData, selectedReport]);

  const closeModal = () => {
    setQueryModal({ isOpen: false, query: "", title: "" });
  };

  const openModal = (query, title) => {
    if (!query) {
      return;
    }
    setQueryModal({ isOpen: true, query, title });
  };

  const isFabricLakehouse = (value = "") => /fabric/i.test(value);

  const afterOverrides = isFabricLakehouse(targetTechnology)
    ? {
        mode: "DirectQuery",
        source: "Fabric Lakehouse",
        connectionType: "Lakehouse.Contents"
      }
    : null;

  const getAfterValue = (key, rowValue) => {
    if (!afterOverrides) {
      return rowValue;
    }
    return afterOverrides[key] || rowValue;
  };

  return (
    <section className="metadata-section">
      <div className="metadata-header">
        <div>
          <h2>PBIP Metadata Comparison</h2>
          <p>Inspect table metadata before and after connection updates.</p>
        </div>
      </div>

      <div className="metadata-tables">
        <div className="metadata-table-block">
          <h3>Before Metadata Table</h3>
          {filteredBefore.length === 0 ? (
            <div className="no-data">No before metadata loaded.</div>
          ) : (
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Source</th>
                  <th>Connection Type</th>
                  <th>Server</th>
                  <th>Database</th>
                  <th>M Query</th>
                </tr>
              </thead>
              <tbody>
                {filteredBefore.map((row) => {
                  const tableName = getRowTableName(row);
                  const query = row.mQuery || "";
                  const derived = extractConnectionFromQuery(query);

                  return (
                    <tr key={row.name}>
                      <td>Table</td>
                      <td>{tableName}</td>
                      <td>{row.mode || ""}</td>
                      <td>{row.source || ""}</td>
                      <td>{row.connectionType || ""}</td>
                      <td>{row.server || derived.server || ""}</td>
                      <td>{row.database || derived.database || ""}</td>
                      <td className="mono-cell">
                        {query ? (
                          <button
                            type="button"
                            className="mquery-link"
                            onClick={() => openModal(query, tableName)}
                          >
                            {query.slice(0, 80)}...
                          </button>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="metadata-table-block">
          <h3>After Metadata Table</h3>
          {filteredAfter.length === 0 ? (
            <div className="no-data">No after metadata loaded.</div>
          ) : (
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Source</th>
                  <th>Connection Type</th>
                  <th>Server</th>
                  <th>Database</th>
                  <th>M Query</th>
                </tr>
              </thead>
              <tbody>
                {filteredAfter.map((row) => {
                  const query = row.mQuery || "";
                  const derived = extractConnectionFromQuery(query);

                  return (
                  <tr key={row.name}>
                    <td>Table</td>
                    <td>{getRowTableName(row)}</td>
                    <td>{getAfterValue("mode", row.mode)}</td>
                    <td>{getAfterValue("source", row.source)}</td>
                    <td>{getAfterValue("connectionType", row.connectionType)}</td>
                    <td>{row.server || derived.server || ""}</td>
                    <td>{row.database || derived.database || ""}</td>
                    <td className="mono-cell">
                      {row.mQuery ? (
                        <button
                          type="button"
                          className="mquery-link"
                          onClick={() => openModal(row.mQuery, getTableName(row.name))}
                        >
                          {row.mQuery.slice(0, 80)}...
                        </button>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {queryModal.isOpen && (
        <div className="modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="M Query"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>M Query</h3>
                {queryModal.title && (
                  <p className="modal-subtitle">{queryModal.title}</p>
                )}
              </div>
              <button type="button" className="modal-close" onClick={closeModal}>
                Close
              </button>
            </div>
            <pre className="modal-body">{queryModal.query}</pre>
          </div>
        </div>
      )}
    </section>
  );
}

function getReportName(fullName = "") {
  if (!fullName || !fullName.includes("::")) {
    return "";
  }
  const parts = fullName.split("::");
  return parts[0] || "";
}

function getTableName(fullName = "") {
  if (!fullName || !fullName.includes("::")) {
    return fullName;
  }
  const parts = fullName.split("::").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : fullName;
}

function getRowTableName(row = {}) {
  const candidate = row.name || row.tableName || row.table || row.Name || row.Table || "";
  const cleaned = getTableName(candidate);
  if (cleaned) {
    return cleaned;
  }
  return row.reportDisplay || row.reportName || "";
}

function matchesReport(row, selectedReport) {
  const report = row.reportDisplay || row.reportName || getReportName(row.name || "");
  return report === selectedReport;
}

function normalizeSqlArg(value = "") {
  const token = String(value).trim();
  if (!token) {
    return "";
  }

  const hashQuoted = token.match(/^#"([^"]+)"$/);
  if (hashQuoted) {
    return hashQuoted[1].trim();
  }

  const quoted = token.match(/^["'](.+)["']$/);
  if (quoted) {
    return quoted[1].trim();
  }

  return token;
}

function extractConnectionFromQuery(query = "") {
  if (!query) {
    return { server: "", database: "" };
  }

  const sqlQuoted = query.match(/Sql\.Database\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/i);
  if (sqlQuoted) {
    return { server: sqlQuoted[1], database: sqlQuoted[2] };
  }

  const sqlParam = query.match(/Sql\.Database\s*\(\s*([^,)\r\n]+)\s*,\s*([^,)\r\n]+)/i);
  if (sqlParam) {
    return { server: normalizeSqlArg(sqlParam[1]), database: normalizeSqlArg(sqlParam[2]) };
  }

  const lakehouse = query.match(/WorkspaceId\s*=\s*"([^"]+)"[\s\S]*?LakehouseId\s*=\s*"([^"]+)"/i);
  if (lakehouse) {
    return { server: lakehouse[1], database: lakehouse[2] };
  }

  return { server: "", database: "" };
}

export default MetadataComparisonComponent;
