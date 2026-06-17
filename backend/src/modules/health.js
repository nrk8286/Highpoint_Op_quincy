import { jsonResponse } from "../runtime.js";
import { azureSummary } from "./azure.js";

export async function health(context) {
  return jsonResponse({
    ok: true,
    service: "highpoints-backend-v2",
    requestId: context.requestId,
    bindings: {
      db: Boolean(context.env.DB),
      documents: Boolean(context.env.DOCUMENTS),
    },
    azure: azureSummary(context.env),
  });
}
