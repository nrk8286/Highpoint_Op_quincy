import { jsonResponse } from "../runtime.js";

function publicAzureConfig(env) {
  return {
    subscription: env.AZURE_SUBSCRIPTION_NAME || "Azure subscription 1",
    primaryResourceGroup: env.AZURE_RESOURCE_GROUP || "Highpoint",
    vmScaleSetResourceGroup: env.AZURE_VMSS_RESOURCE_GROUP || "vmss-rg",
    primaryOrigin: env.AZURE_ORIGIN_URL || "https://server.highpoints.work",
    statusEndpoint: env.AZURE_STATUS_ENDPOINT || "https://server.highpoints.work/azure/status",
    appEndpoint: env.AZURE_APP_ENDPOINT || "https://server.highpoints.work/app",
  };
}

function serviceCatalog(config) {
  return [
    {
      name: "Azure VM origin",
      type: "Microsoft.Compute/virtualMachines",
      resourceGroup: config.primaryResourceGroup,
      endpoint: config.primaryOrigin,
      role: "Hosts the direct Azure website origin and Nginx front door.",
    },
    {
      name: "Application Gateway",
      type: "Microsoft.Network/applicationGateways",
      resourceGroup: config.primaryResourceGroup,
      role: "Available for regional ingress, routing, and future origin failover.",
    },
    {
      name: "Cognitive Services",
      type: "Microsoft.CognitiveServices/accounts",
      resourceGroup: config.primaryResourceGroup,
      role: "Ready for document intelligence and AI-assisted intake workflows.",
    },
    {
      name: "Application Insights",
      type: "Microsoft.Insights/components",
      resourceGroup: config.primaryResourceGroup,
      role: "Telemetry target for application health and operational diagnostics.",
    },
    {
      name: "Log Analytics",
      type: "Microsoft.OperationalInsights/workspaces",
      resourceGroup: config.primaryResourceGroup,
      role: "Central log workspace for Azure-hosted infrastructure.",
    },
    {
      name: "Linux VM scale set",
      type: "Microsoft.Compute/virtualMachineScaleSets",
      resourceGroup: config.vmScaleSetResourceGroup,
      role: "Elastic Linux worker pool for background jobs, desktop access, and future services.",
    },
    {
      name: "Virtual networks and NSGs",
      type: "Microsoft.Network",
      resourceGroup: `${config.primaryResourceGroup}, ${config.vmScaleSetResourceGroup}`,
      role: "Network isolation, inbound rules, and controlled service exposure.",
    },
  ];
}

async function probeAzureOrigin(endpoint) {
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      redirect: "manual",
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const location = response.headers.get("location") || "";
    if ([301, 302, 307, 308].includes(response.status) && location === endpoint) {
      return {
        ok: true,
        status: response.status,
        latencyMs: Date.now() - started,
        redirected: true,
        location,
        note: "Azure origin is reachable but returned an HTTPS redirect to the same status URL.",
      };
    }
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: error.message || "Azure origin probe failed",
    };
  }
}

export async function azureServices(context) {
  const config = publicAzureConfig(context.env);
  const origin = await probeAzureOrigin(config.statusEndpoint);
  return jsonResponse({
    ok: origin.ok,
    service: "highpoints-azure-services",
    requestId: context.requestId,
    generatedAt: new Date().toISOString(),
    config,
    origin,
    services: serviceCatalog(config),
  });
}

export function azureSummary(env) {
  const config = publicAzureConfig(env);
  return {
    origin: config.primaryOrigin,
    statusEndpoint: config.statusEndpoint,
    appEndpoint: config.appEndpoint,
    services: serviceCatalog(config).length,
  };
}
