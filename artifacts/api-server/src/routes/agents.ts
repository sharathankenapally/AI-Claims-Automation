import { Router } from "express";
import { RunAgentPipelineBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { claimsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runFullPipeline } from "../agents/orchestrator.js";

const router = Router();

router.post("/agents/run", async (req, res) => {
  const body = RunAgentPipelineBody.parse(req.body);

  const claim = await db.query.claimsTable.findFirst({
    where: eq(claimsTable.id, body.claimId),
  });

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  setImmediate(() => {
    runFullPipeline(body.claimId).catch((err) => {
      req.log.error({ claimId: body.claimId, err }, "Agent pipeline error");
    });
  });

  res.json({
    claimId: body.claimId,
    status: "PROCESSING",
    riskScore: claim.riskScore,
    issuesDetected: claim.issuesDetected,
    actionsTaken: claim.actionsTaken,
    paymentStatus: claim.paymentStatus,
  });
});

export default router;
