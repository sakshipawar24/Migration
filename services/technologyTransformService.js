const fs = require("fs");
const path = require("path");

const TARGETS = {
  KEEP: "Keep Same",
  SQL: "SQL Server",
  FABRIC: "Fabric Lakehouse"
};

async function applyTechnologyTransform(pbipPath, targetType, options = {}) {
  if (!targetType || targetType === TARGETS.KEEP) {
    return { databaseUpdated: false, tablesUpdated: 0 };
  }

  const resolved = await resolveModelPaths(pbipPath);

  if (!resolved.databaseFile) {
    throw new Error("database.tmdl not found for technology transform.");
  }

  const databaseContent = await fs.promises.readFile(resolved.databaseFile, "utf8");
  const updatedDatabase = transformTechnology(databaseContent, targetType, options);

  if (updatedDatabase !== databaseContent) {
    await fs.promises.writeFile(resolved.databaseFile, updatedDatabase, "utf8");
  }

  const tablesUpdated = await updateTableTechnology(resolved.tablesDir, targetType, options);

  return {
    databaseUpdated: updatedDatabase !== databaseContent,
    tablesUpdated
  };
}

function transformTechnology(content, targetType, options = {}) {
  if (targetType === TARGETS.FABRIC) {
    let updated = replaceKeyValue(content, "connectionType", "lakehouse.contents");
    updated = replaceKeyValue(updated, "protocol", "fabric");
    updated = replaceKeyValue(updated, "provider", "MicrosoftFabric");

    if (options.workspaceId) {
      updated = replaceKeyValue(updated, "server", options.workspaceId);
    }
    if (options.lakehouseId) {
      updated = replaceKeyValue(updated, "database", options.lakehouseId);
    }

    return updated;
  }

  if (targetType === TARGETS.SQL) {
    let updated = replaceKeyValue(content, "connectionType", "Sql.Database");
    updated = replaceKeyValue(updated, "protocol", "tds");
    updated = replaceKeyValue(updated, "provider", "Sql");

    if (options.server) {
      updated = replaceKeyValue(updated, "server", options.server);
    }
    if (options.database) {
      updated = replaceKeyValue(updated, "database", options.database);
    }

    return updated;
  }

  return content;
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

async function updateTableTechnology(tablesDir, targetType, options = {}) {
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
    let updated = content;

    if (targetType === TARGETS.FABRIC) {
      updated = replaceWithLakehouse(updated, options.workspaceId, options.lakehouseId);
    } else if (targetType === TARGETS.SQL) {
      updated = replaceWithSqlDatabase(updated, options.server, options.database);
    }

    if (updated !== content) {
      await fs.promises.writeFile(filePath, updated, "utf8");
      updatedCount += 1;
    }
  }

  return updatedCount;
}

function replaceWithLakehouse(content, workspaceId = "dummy_workspace_id", lakehouseId = "dummy_lakehouse_id") {
  const pattern = /(^[ \t]*source\s*=\s*\n[\s\S]*?^[ \t]*in\s*\n[ \t]*Source)/gmi;
  const lakehouseBlock = (indent) => buildLakehouseSourceBlock(indent, workspaceId, lakehouseId);
  let result = "";
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const block = match[0];
    const start = match.index || 0;
    const end = start + block.length;

    result += content.slice(lastIndex, start);

    if (/Sql\.Database|Databricks\.|Lakehouse\.Contents/i.test(block)) {
      const indentMatch = block.match(/^[ \t]*/);
      const indent = indentMatch ? indentMatch[0] : "";
      result += lakehouseBlock(indent);
    } else {
      result += block;
    }

    lastIndex = end;
  }

  result += content.slice(lastIndex);
  return result;
}

function buildLakehouseSourceBlock(indent, workspaceId, lakehouseId) {
  const letIndent = `${indent}\t`;
  const sourceIndent = `${indent}\t\t`;
  const inIndent = `${indent}\t`;
  const inSourceIndent = `${indent}\t\t`;

  return (
    `${indent}source =\n` +
    `${letIndent}let\n` +
    `${sourceIndent}Source = Lakehouse.Contents(\n` +
    `${sourceIndent}    "https://api.fabric.microsoft.com",\n` +
    `${sourceIndent}    [\n` +
    `${sourceIndent}        WorkspaceId = "${workspaceId}",\n` +
    `${sourceIndent}        LakehouseId = "${lakehouseId}"\n` +
    `${sourceIndent}    ]\n` +
    `${sourceIndent})\n` +
    `${inIndent}in\n` +
    `${inSourceIndent}Source`
  );
}

function replaceWithSqlDatabase(content, server = "dummy_server", database = "dummy_database") {
  return content.replace(
    /Lakehouse\.Contents\s*\([\s\S]*?\)/gi,
    `Sql.Database(\"${server}\", \"${database}\")`
  );
}

module.exports = {
  applyTechnologyTransform,
  transformTechnology,
  TARGETS
};
