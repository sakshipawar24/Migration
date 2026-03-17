const { exec } = require("child_process");

function convertPbixToPbip(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

module.exports = {
  convertPbixToPbip
};
