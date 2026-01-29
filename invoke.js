const { exec } = require("child_process");
const fs = require("fs");

function runPython(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    // Quote arguments that contain spaces
    const quotedArgs = args.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
    const argString = quotedArgs.join(' ');
    const command = argString ? `python ${scriptName} ${argString}` : `python ${scriptName}`;
    
    console.log(`Running: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error in ${scriptName}`);
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

async function runPipeline() {
  try {
    let params = {};
    
    // Load parameters if they exist
    if (fs.existsSync('temp_params.json')) {
      params = JSON.parse(fs.readFileSync('temp_params.json', 'utf8'));
      console.log("Loaded parameters:", params);
    }

    const pbipPath = params.pbip_path || "Synapse 01 (Self-Serve).SemanticModel";

    console.log("\n=== Step 1: Dummy Replacement ===");
    await runPython("dummyreplacement.py");

    // Step 2: Migrate to Fabric (Databricks → Fabric Lakehouse)
    console.log("\n=== Step 2: Technology Migration ===");
    await runPython("changetech.py");

    // Step 3: Extract AFTER metadata
    console.log("\n=== Step 3: Extract AFTER Metadata ===");
    await runPython("metadatacollection.py", [pbipPath, "after"]);

    console.log("\n[OK] PIPELINE COMPLETED SUCCESSFULLY");
  } catch (err) {
    console.error("\n[ERROR] PIPELINE FAILED");
    process.exit(1);
  }
}

runPipeline();
