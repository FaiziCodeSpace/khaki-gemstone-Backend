import express from "express";
import { 
    getAllTransactions, 
    getTransactionById 
} from "../controllers/Admin/transactions.Controller.js";
import { protectAdmin, superAdminOnly } from "../middleware/admin.middleware.js";


const router = express.Router();

router.get("/", protectAdmin, superAdminOnly, getAllTransactions);
router.get("/:id", protectAdmin, superAdminOnly, getTransactionById);

export default router;