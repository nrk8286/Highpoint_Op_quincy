import { HttpError, jsonResponse } from "../runtime.js";
import { hasAllAccess } from "../policy.js";

export async function getSecurityCameras(context) {
  if (!hasAllAccess(context.user)) throw new HttpError(403, "Admin access required");
  return jsonResponse({
    requestId: context.requestId,
    cameras: [
      {
        id: "work-network-main",
        label: "Security Cameras",
        url: context.env.SECURITY_CAMERA_URL || "https://cameras.highpoints.work",
        network: "work",
        note: "Reachable only from the facility work network.",
      },
    ],
  });
}

export async function openSecurityCameras(context) {
  return Response.redirect(context.env.SECURITY_CAMERA_URL || "https://cameras.highpoints.work", 302);
}
