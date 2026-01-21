import express from "express";
import { register, login, applyInvestor } from "../controllers/auth.Controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);  
router.post("/investor-register", applyInvestor);

export default router;
