const { exec } = require("child_process");

function runPowerBiScript(command, envOverride = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { env: { ...process.env, ...envOverride } }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

module.exports = {
  runPowerBiScript
};
