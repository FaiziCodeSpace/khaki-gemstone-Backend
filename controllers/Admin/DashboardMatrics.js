import { getDashboardMetrics } from "../../services/dashboardMetrics.service.js"

export const getDashboard = async (req, res) => {
    try{
        const dashboardData = await getDashboardMetrics();
        res.json({dashboardData});
    }catch(err){
        res.status(500).json({message: "(Server Error) Failed to get DashboardMetrics"})
    }
} 