import express from "express";
import { addEvent, getLatestEvent } from "../controllers/public/event.Controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/event", getLatestEvent);
router.post("/addEvent", protect, addEvent);

export default router;