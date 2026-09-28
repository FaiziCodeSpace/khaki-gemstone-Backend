import express from "express";
import { protectAdmin, superAdminOnly } from "../middleware/admin.middleware.js";
import { getActiveEvent, getStoreMetadata, updateTaxonomy } from "../controllers/Admin/taxonomyControl.Controller.js";

const router = express.Router();

router.get("/metadata", getStoreMetadata);
router.get("/active-event", getActiveEvent);
router.post("/updateTaxonomy", protectAdmin, superAdminOnly, updateTaxonomy);

export default router; 