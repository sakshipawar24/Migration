const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const CONNECTOR_MAP = [
  { key: "Sql.Database", source: "SQL Server" },
  { key: "lakehouse.contents", source: "Fabric Lakehouse" },
  { key: "Databricks.", source: "Databricks" },
  { key: "Oracle.Database", source: "Oracle" },
  { key: "PostgreSQL.Database", source: "PostgreSQL" },
  { key: "MySql.Database", source: "MySQL" },
  { key: "Odbc.DataSource", source: "ODBC" },
  { key: "Web.Contents", source: "Web" },
  { key: "AzureStorage.", source: "Azure Storage" },
  { key: "Excel.Workbook", source: "Excel" },
  { key: "Csv.Document", source: "CSV" }
];

async function extractMetadata(pbipPath, options = {}) {
  if (options.usePython) {
    return extractMetadataWithPython(pbipPath);
  }

  const resolved = await resolveModelPaths(pbipPath);
  const databaseContent = await readTextSafe(resolved.databaseFile);
  const modelContent = await readTextSafe(resolved.modelFile);

  const databaseMeta = parseDatabaseMetadata(databaseContent || "");
  const modelName = parseModelName(modelContent || "");

  const tables = [];
  const tableFiles = await listTmdlFiles(resolved.tablesDir);

  for (const tableFile of tableFiles) {
    const content = await readTextSafe(tableFile);
    const tableName = parseTableName(content, path.basename(tableFile, ".tmdl"));
    const mode = parseStorageMode(content);
    const mQuery = extractMQuery(content);
    const connector = detectConnector(mQuery);
    const connectionDetails = extractConnectionDetails(mQuery);

    tables.push({
      name: tableName,
      mode,
      source: connector.source,
      connectionType: connector.connectionType,
      server: connectionDetails.server || databaseMeta.server || "",
      database: connectionDetails.database || databaseMeta.database || "",
      mQuery
    });
  }

  return {
    modelName,
    protocol: databaseMeta.protocol || "",
    provider: databaseMeta.provider || "",
    dataSourceType: databaseMeta.dataSourceType || connectorFallback(tables),
    connectionType: databaseMeta.connectionType || "",
    server: databaseMeta.server || "",
    database: databaseMeta.database || "",
    tables
  };
}

function extractMetadataWithPython(pbipPath) {
  return new Promise((resolve, reject) => {
    const command = `python extract_metadata.py "${pbipPath}"`;
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error("Failed to parse metadata JSON from Python."));
      }
    });
  });
}

async function resolveModelPaths(pbipPath) {
  const candidates = [
    path.join(pbipPath, "Model"),
    path.join(pbipPath, "definition"),
    pbipPath
  ];

  for (const candidate of candidates) {
    const databaseFile = path.join(candidate, "database.tmdl");
    const modelFile = path.join(candidate, "model.tmdl");
    const tablesDir = path.join(candidate, "tables");

    if (fs.existsSync(databaseFile) || fs.existsSync(modelFile) || fs.existsSync(tablesDir)) {
      return {
        modelDir: candidate,
        databaseFile: fs.existsSync(databaseFile) ? databaseFile : null,
        modelFile: fs.existsSync(modelFile) ? modelFile : null,
        tablesDir: fs.existsSync(tablesDir) ? tablesDir : null
      };
    }
  }

  throw new Error(`Unable to locate PBIP model folder for path: ${pbipPath}`);
}

async function readTextSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return "";
  }
  return fs.promises.readFile(filePath, "utf8");
}

async function listTmdlFiles(tablesDir) {
  if (!tablesDir || !fs.existsSync(tablesDir)) {
    return [];
  }
  const files = await fs.promises.readdir(tablesDir);
  return files
    .filter((file) => file.toLowerCase().endsWith(".tmdl"))
    .map((file) => path.join(tablesDir, file));
}

function parseModelName(content) {
  const match = content.match(/^model\s+([^\r\n]+)/i);
  if (!match) {
    return "";
  }
  return match[1].trim().replace(/^"|"$/g, "");
}

function parseDatabaseMetadata(content) {
  return {
    server: matchKeyValue(content, "server"),
    database: matchKeyValue(content, "database"),
    protocol: matchKeyValue(content, "protocol"),
    provider: matchKeyValue(content, "provider"),
    connectionType: matchKeyValue(content, "connectionType"),
    dataSourceType: matchDataSourceType(content)
  };
}

function matchKeyValue(content, key) {
  const regex = new RegExp(`${key}\\s*[:=]\\s*[\"']?([^\"'\r\n]+)[\"']?`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function matchDataSourceType(content) {
  const patterns = [
    /dataSourceType\s*[:=]\s*[\"']?([^\"'\r\n]+)[\"']?/i,
    /dataSource\s+type\s*[:=]\s*[\"']?([^\"'\r\n]+)[\"']?/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function parseTableName(content, fallback) {
  const match = content.match(/^table\s+([^\r\n]+)/i);
  if (!match) {
    return fallback;
  }
  return match[1].trim().replace(/^'|'$/g, "");
}

function parseStorageMode(content) {
  if (/mode\s*:\s*directquery/i.test(content)) {
    return "DirectQuery";
  }
  if (/mode\s*:\s*import/i.test(content)) {
    return "Import";
  }
  return "Unknown";
}

function extractMQuery(content) {
  const lines = content.split(/\r?\n/);
  let capture = false;
  const buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (!capture && lower.startsWith("source")) {
      const sourceMatch = trimmed.match(/^source\s*=\s*(.*)$/i);
      if (sourceMatch) {
        capture = true;
        const inlineExpression = (sourceMatch[1] || "").trim();
        if (inlineExpression) {
          buffer.push(inlineExpression);
        }
        continue;
      }
    }

    if (lower === "source =") {
      capture = true;
      continue;
    }

    if (capture) {
      if (lower.startsWith("annotation")) {
        break;
      }
      buffer.push(line);
    }
  }

  return buffer.join("\n").trim();
}

function detectConnector(mQuery) {
  if (!mQuery) {
    return { source: "Unknown", connectionType: "" };
  }

  const normalized = mQuery.toLowerCase();

  for (const connector of CONNECTOR_MAP) {
    if (normalized.includes(connector.key.toLowerCase())) {
      return {
        source: connector.source,
        connectionType: connector.key
      };
    }
  }

  return { source: "Unknown", connectionType: "" };
}

function extractConnectionDetails(mQuery) {
  if (!mQuery) {
    return { server: "", database: "" };
  }

  const sqlMatch = mQuery.match(/Sql\.Database\s*\(\s*\"([^\"]+)\"\s*,\s*\"([^\"]+)\"/i);
  if (sqlMatch) {
    return { server: sqlMatch[1], database: sqlMatch[2] };
  }

  const sqlParamMatch = mQuery.match(/Sql\.Database\s*\(\s*([^,\)\r\n]+)\s*,\s*([^,\)\r\n]+)/i);
  if (sqlParamMatch) {
    return {
      server: normalizeSqlArg(sqlParamMatch[1]),
      database: normalizeSqlArg(sqlParamMatch[2])
    };
  }

  // Match both uppercase WorkspaceId/LakehouseId and lowercase variants
  const lakehouseMatch = mQuery.match(/(?:workspace|lakehouses)[\w.]*\s*=\s*\"([^\"]+)\"[\s\S]*?(?:lakehouses|warehouse)?[\w.]*\s*=\s*\"([^\"]+)\"/i);
  if (lakehouseMatch) {
    return { server: lakehouseMatch[1], database: lakehouseMatch[2] };
  }

  return { server: "", database: "" };
}

function normalizeSqlArg(value) {
  const token = String(value || "").trim();
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

function connectorFallback(tables) {
  const first = tables.find((table) => table.connectionType);
  return first ? first.connectionType : "";
}

module.exports = {
  extractMetadata
};
