import express from "express";
import { 
  adminLogin, 
  createAdmin, 
  toggleAdminStatus, 
  assignCity, 
  getUsers,
  updateInvestorStatus
} from "../controllers/auth.Controller.js";
import { protectAdmin, superAdminOnly } from "../middleware/admin.middleware.js";

const router = express.Router();

// Public login
router.post("/login", adminLogin);

// Secure all management routes
// router.use(protectAdmin); 

// Super Admin Only Actions
router.post("/create", superAdminOnly, createAdmin);
router.patch("/toggle-status", superAdminOnly, toggleAdminStatus);
router.patch("/assign-city", superAdminOnly, assignCity);

// Get User & Investor
router.get("/getUsers", getUsers);
// Approve Investors Applications
router.post("/update-investor-status", updateInvestorStatus)



export default router;