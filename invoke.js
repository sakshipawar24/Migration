const { exec } = require("child_process");

function runPython(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${scriptName}...`);

    exec(`python ${scriptName}`, (error, stdout, stderr) => {
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
    // Step 1: Sanitize PBIP files
    await runPython("dummyreplacement.py");

    // Step 2: Extract metadata to CSV
    await runPython("metadatacollection.py");

    console.log("PIPELINE COMPLETED SUCCESSFULLY");
  } catch (err) {
    console.error("PIPELINE FAILED");
  }
}

runPipeline();
