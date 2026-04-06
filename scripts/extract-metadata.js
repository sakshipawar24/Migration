const { extractMetadata } = require("../services/metadataService");

async function main() {
  const pbipPath = process.argv[2];
  const usePython = process.argv.includes("--python");

  if (!pbipPath) {
    console.error("Usage: node extract-metadata.js <pbip_path>");
    process.exit(1);
  }

  try {
    const metadata = await extractMetadata(pbipPath, { usePython });
    process.stdout.write(JSON.stringify(metadata));
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
