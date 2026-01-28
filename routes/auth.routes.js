import express from "express";
import { register, login, applyInvestor, getUsers } from "../controllers/auth.Controller.js";
import protect from "../middleware/auth.middleware.js";
const router = express.Router();

// User Auth
router.post("/register", register);
router.post("/login", login);
// User Investor  
router.post("/investor-register", applyInvestor);

export default router;
