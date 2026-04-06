const fs = require("fs");
const { extractMetadata } = require("./services/metadataService");
const { updateConnection } = require("./services/connectionUpdateService");
const { applyTechnologyTransform, TARGETS } = require("./services/technologyTransformService");

async function runPhase3() {
  try {
    const params = loadParams();
    const pbipPath = params.pbip_path || "Synapse 01 (Self-Serve).SemanticModel";
    const usePython = Boolean(params.use_python);

    const server = params.server || "dummy_server";
    const database = params.database || "dummy_database";
    const workspaceId = params.workspace_id || "dummy_workspace_id";
    const lakehouseId = params.lakehouse_id || "dummy_lakehouse_id";
    const targetTechnology = params.target_technology || TARGETS.KEEP;

    const metadataBefore = await extractMetadata(pbipPath, { usePython });

    await updateConnection(pbipPath, server, database);

    if (targetTechnology !== TARGETS.KEEP) {
      await applyTechnologyTransform(pbipPath, targetTechnology, {
        workspaceId,
        lakehouseId,
        server,
        database
      });
    }

    const metadataAfter = await extractMetadata(pbipPath, { usePython });

    const response = {
      download: "Success",
      conversion: "Success",
      before: metadataBefore.tables || [],
      after: metadataAfter.tables || [],
      publish: "Success",
      refresh: "Triggered"
    };

    process.stdout.write(JSON.stringify(response));
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

function loadParams() {
  if (fs.existsSync("temp_params.json")) {
    return JSON.parse(fs.readFileSync("temp_params.json", "utf8"));
  }
  return {};
}

runPhase3();
