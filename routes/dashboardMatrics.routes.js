import express from 'express';
import { getDashboard } from '../controllers/Admin/DashboardMatrics.js';
// import { protectAdmin } from '../middleware/admin.middleware.js'; 

const router = express.Router();

// This route is now public and won't trigger the 401 Unauthorized error
router.get("/dashboardMatrics", getDashboard);

// router.use(protectAdmin); // Disabled

export default router;