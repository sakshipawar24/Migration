function getPowerBiCredentials(env = process.env) {
  return {
    tenantId: env.POWERBI_TENANT_ID || env.PBI_TENANT_ID || "",
    clientId: env.POWERBI_CLIENT_ID || env.PBI_CLIENT_ID || "",
    clientSecret: env.POWERBI_CLIENT_SECRET || env.PBI_CLIENT_SECRET || ""
  };
}

module.exports = {
  getPowerBiCredentials
};
