import express from "express";
import { addEvent, getLatestEvent } from "../controllers/public/event.Controller.js";
import { superAdminOnly } from "../middleware/admin.middleware.js";

const router = express.Router();

router.get("/event", getLatestEvent);
router.post("/addEvent", superAdminOnly, addEvent);

export default router;