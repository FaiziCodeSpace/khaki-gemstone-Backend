import express from 'express';
import { getDashboard } from '../controllers/Admin/DashboardMatrics.js';
const router = express.Router();


router.get("/admin/dashboardMatrics", getDashboard);

export default router;