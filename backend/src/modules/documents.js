import { HttpError, jsonResponse, normalizeId } from "../runtime.js";
import { assertCan, hasAllAccess } from "../policy.js";
import { repositories } from "../repositories.js";

const DECISIONS = new Set(["approved", "rejected", "needs_correction"]);

export async function listReviewQueue(context) {
  assertCan(context.user, "read", "documents", context.user.department);
  const items = await repositories(context).reviewQueue.listPending({
    allAccess: hasAllAccess(context.user),
    department: context.user.department,
  });
  return jsonResponse({ items, requestId: context.requestId });
}

export async function approveReview(context) {
  const reviewId = context.params.id;
  const decision = DECISIONS.has(context.body.decision) ? context.body.decision : "";
  if (!decision) throw new HttpError(400, "decision must be approved, rejected, or needs_correction");

  const repo = repositories(context);
  const review = await repo.reviewQueue.get(reviewId);
  if (!review) throw new HttpError(404, "review item not found");

  assertCan(
    context.user,
    decision === "approved" ? "approve" : "update",
    normalizeId(review.destination_resource, "documents"),
    normalizeId(review.assigned_department_id, context.user.department)
  );

  await repo.reviewQueue.decide({
    id: reviewId,
    decision,
    notes: context.body.notes || "",
    reviewerId: context.user.id,
  });

  return jsonResponse({ ok: true, decision, requestId: context.requestId });
}
