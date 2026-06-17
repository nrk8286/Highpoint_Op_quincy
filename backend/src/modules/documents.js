import { HttpError, jsonResponse, readJson, normalizeId } from "../runtime.js";
import { assertCan, hasAllAccess } from "../policy.js";
import { repositories } from "../repositories.js";
import { reviewDecisionOperation } from "../graph/operations.js";
import { scheduleGraphWrite } from "../graph/sync.js";

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
  scheduleGraphWrite(context, reviewDecisionOperation({
    review,
    decision,
    notes: context.body.notes || "",
    user: context.user,
  }));

  return jsonResponse({ ok: true, decision, requestId: context.requestId });
}

export async function batchApproveReview(context) {
  context.body = await readJson(context.request);
  const ids = Array.isArray(context.body.ids) ? context.body.ids : [];
  const decision = DECISIONS.has(context.body.decision) ? context.body.decision : "";
  if (!decision) throw new HttpError(400, "decision must be approved, rejected, or needs_correction");
  if (ids.length === 0) return jsonResponse({ ok: true, processed: 0, requestId: context.requestId });

  const repo = repositories(context);
  const results = [];

  for (const id of ids) {
    try {
      const review = await repo.reviewQueue.get(id);
      if (!review) continue;

      assertCan(
        context.user,
        decision === "approved" ? "approve" : "update",
        normalizeId(review.destination_resource, "documents"),
        normalizeId(review.assigned_department_id, context.user.department)
      );

      await repo.reviewQueue.decide({
        id,
        decision,
        notes: context.body.notes || "Bulk action",
        reviewerId: context.user.id,
      });
      scheduleGraphWrite(context, reviewDecisionOperation({
        review,
        decision,
        notes: context.body.notes || "Bulk action",
        user: context.user,
      }));
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error.message });
    }
  }

  return jsonResponse({ ok: true, processed: results.length, results, requestId: context.requestId });
}
