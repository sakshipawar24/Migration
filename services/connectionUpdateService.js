const fs = require("fs");
const path = require("path");

async function updateConnection(pbipPath, server, database) {
  const resolved = await resolveModelPaths(pbipPath);

  if (!resolved.databaseFile) {
    throw new Error("database.tmdl not found for connection update.");
  }

  const databaseContent = await fs.promises.readFile(resolved.databaseFile, "utf8");
  let updatedDatabase = replaceKeyValue(databaseContent, "server", server);
  updatedDatabase = replaceKeyValue(updatedDatabase, "database", database);

  if (updatedDatabase !== databaseContent) {
    await fs.promises.writeFile(resolved.databaseFile, updatedDatabase, "utf8");
  }

  const tablesUpdated = await updateTableConnections(resolved.tablesDir, server, database);

  return {
    databaseUpdated: updatedDatabase !== databaseContent,
    tablesUpdated
  };
}

async function resolveModelPaths(pbipPath) {
  const candidates = [
    path.join(pbipPath, "Model"),
    path.join(pbipPath, "definition"),
    pbipPath
  ];

  for (const candidate of candidates) {
    const databaseFile = path.join(candidate, "database.tmdl");
    const tablesDir = path.join(candidate, "tables");

    if (fs.existsSync(databaseFile) || fs.existsSync(tablesDir)) {
      return {
        modelDir: candidate,
        databaseFile: fs.existsSync(databaseFile) ? databaseFile : null,
        tablesDir: fs.existsSync(tablesDir) ? tablesDir : null
      };
    }
  }

  throw new Error(`Unable to locate PBIP model folder for path: ${pbipPath}`);
}

function replaceKeyValue(content, key, value) {
  const regex = new RegExp(`(${key}\\s*[:=]\\s*)([\"']?)([^\"'\r\n]+)\\2`, "i");
  return content.replace(regex, `$1"${value}"`);
}

async function updateTableConnections(tablesDir, server, database) {
  if (!tablesDir || !fs.existsSync(tablesDir)) {
    return 0;
  }

  const files = await fs.promises.readdir(tablesDir);
  let updatedCount = 0;

  for (const file of files) {
    if (!file.toLowerCase().endsWith(".tmdl")) {
      continue;
    }

    const filePath = path.join(tablesDir, file);
    const content = await fs.promises.readFile(filePath, "utf8");
    const sqlDbMatches = [
      ...content.matchAll(/Sql\.Database\s*\(\s*(?:\"[^\"]*\"|[^,\)\r\n]+)\s*,\s*\"([^\"]+)\"/gi)
    ];
    const originalDatabases = [...new Set(sqlDbMatches.map((match) => match[1]).filter(Boolean))];

    // Rewrite first two Sql.Database args whether they are string literals or parameters.
    let updated = content.replace(
      /Sql\.Database\s*\(\s*(?:\"[^\"]*\"|[^,\)\r\n]+)\s*,\s*(?:\"[^\"]*\"|[^,\)\r\n]+)/gi,
      `Sql.Database("${server}", "${database}"`
    );

    for (const oldDatabase of originalDatabases) {
      if (oldDatabase.toLowerCase() === String(database).toLowerCase()) {
        continue;
      }
      updated = replaceDatabaseInQueryLiterals(updated, oldDatabase, database);
    }

    updated = replaceGenericDatabaseConnectorCalls(updated, server, database);
    updated = replaceFabricIds(updated, server, database);

    if (updated !== content) {
      await fs.promises.writeFile(filePath, updated, "utf8");
      updatedCount += 1;
    }
  }

  return updatedCount;
}

function replaceGenericDatabaseConnectorCalls(content, server, database) {
  // Handles Sql/Oracle/PostgreSQL/MySql/etc calls shaped as <Connector>.Database(arg1, arg2, ...)
  return content.replace(
    /(\b[A-Za-z][\w.]*)\.Database\s*\(\s*(?:\"[^\"]*\"|[^,\)\r\n]+)\s*,\s*(?:\"[^\"]*\"|[^,\)\r\n]+)/gi,
    (_, connector) => `${connector}.Database("${server}", "${database}"`
  );
}

function replaceFabricIds(content, server, database) {
  // Keep Fabric connector shape but map identifiers to requested values.
  return content
    .replace(/(WorkspaceId\s*=\s*\")([^\"]*)(\")/gi, `$1${server}$3`)
    .replace(/(LakehouseId\s*=\s*\")([^\"]*)(\")/gi, `$1${database}$3`);
}

function replaceDatabaseInQueryLiterals(content, oldDatabase, newDatabase) {
  const escapedOld = escapeRegExp(oldDatabase);
  const bracketedDb = new RegExp(`\\[${escapedOld}\\]`, "gi");
  const qualifiedDb = new RegExp(`\\b${escapedOld}\\b(?=\\s*\\.)`, "gi");

  return content.replace(/(Query\s*=\s*\")((?:[^\"]|\"\")*)(\")/gi, (full, prefix, queryBody, suffix) => {
    const replacedBody = queryBody
      .replace(bracketedDb, `[${newDatabase}]`)
      .replace(qualifiedDb, newDatabase);
    return `${prefix}${replacedBody}${suffix}`;
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  updateConnection
};
