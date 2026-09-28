import express from 'express';
import { getDashboard } from '../controllers/Admin/DashboardMatrics.js';
import { protectAdmin } from '../middleware/admin.middleware.js'; 

const router = express.Router();

router.get("/dashboardMatrics", protectAdmin, getDashboard);


export default router;