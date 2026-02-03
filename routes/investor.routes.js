import express from "express";
import {getInvestorInvestments, investInProduct} from "../controllers/investor/investment.Controller.js";
import { investorAuth } from "../middleware/investor.middleware.js";
const router = express.Router();

router.post('/invest/:productId', investorAuth, investInProduct);
router.get("/investments", investorAuth, getInvestorInvestments);

export default router;