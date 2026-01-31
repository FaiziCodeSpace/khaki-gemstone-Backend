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

// --- Protected Routes (Any Admin) ---
router.use(protectAdmin);

router.get("/getUsers", getUsers);
router.post("/update-investor-status", updateInvestorStatus);

// --- Super Admin Only Routes ---
router.post("/create", superAdminOnly, createAdmin); 
router.post("/editAdmin/:id", superAdminOnly, editAdmin);

export default router;