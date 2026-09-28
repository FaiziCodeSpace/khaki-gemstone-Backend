import express from "express";
import {getInvestorInvestments, getInvestorPersonalMetrics, investInProduct, refundInvestment} from "../controllers/investor/investment.Controller.js";
import { investorAuth } from "../middleware/investor.middleware.js";
import { requestPayout } from "../controllers/investor/payout.controller.js";

const router = express.Router();

router.post('/invest/:productId', investorAuth, investInProduct);
router.post('/refund/:investmentId', investorAuth, refundInvestment);
router.get("/investments", investorAuth, getInvestorInvestments);
router.get('/metrics', investorAuth, getInvestorPersonalMetrics);

// POST /api/investor/payout
router.post('/payout', investorAuth, requestPayout);

export default router;