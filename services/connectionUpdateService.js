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
    const updated = content.replace(
      /Sql\.Database\s*\(\s*\"[^\"]+\"\s*,\s*\"[^\"]+\"/gi,
      `Sql.Database("${server}", "${database}"`
    );

    if (updated !== content) {
      await fs.promises.writeFile(filePath, updated, "utf8");
      updatedCount += 1;
    }
  }

  return updatedCount;
}

module.exports = {
  updateConnection
};
