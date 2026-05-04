import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import claimsRouter from "./claims.js";
import patientsRouter from "./patients.js";
import dashboardRouter from "./dashboard.js";
import agentsRouter from "./agents.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(claimsRouter);
router.use(patientsRouter);
router.use(dashboardRouter);
router.use(agentsRouter);

export default router;
