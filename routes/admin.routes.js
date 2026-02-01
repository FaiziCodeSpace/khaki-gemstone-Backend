import express from "express";
import { 
  adminLogin, 
  adminLogout, 
  refreshAccessToken,
  createAdmin, 
  editAdmin, 
  getUsers,
  updateInvestorStatus
} from "../controllers/auth.Controller.js";
import { protectAdmin, superAdminOnly } from "../middleware/admin.middleware.js";

const router = express.Router();

// --- Public Routes ---
router.post("/login", adminLogin);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", adminLogout); 

// --- Protected Routes ---
router.get("/getUsers", protectAdmin, getUsers);
router.post("/update-investor-status", protectAdmin, superAdminOnly, updateInvestorStatus);

// --- Super Admin Only Routes ---
router.post("/create", protectAdmin, superAdminOnly, createAdmin); 
router.post("/editAdmin/:id", protectAdmin, superAdminOnly, editAdmin);

export default router;