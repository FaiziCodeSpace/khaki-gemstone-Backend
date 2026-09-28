// routes/agent.routes.js
import express from "express";
import multer from "multer";
import {
    createAgent, loginAgent, logoutAgent, refreshAgentToken,
    getMe, listAgents, updateStatus, uploadVehicleImages,
    listPublicAgents,
    rateAgent,
    updateLocation,
} from "../controllers/agent/agent.Controller.js";
import { protectAgent } from "../middleware/agent.auth.middleware.js";
import { protectAdmin } from "../middleware/admin.middleware.js";
import { superAdminOnly } from "../middleware/admin.middleware.js";

const router = express.Router();

// Files are held in memory only; the controller uploads them to Cloudinary
// explicitly (see utils/uploadToCloudinary.js). Nothing touches disk.
const pfpUpload = multer({
    storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"))
});

const vehicleUpload = multer({
    storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"))
});

// ── Public routes ──
router.post("/login", loginAgent);
router.post("/logout", logoutAgent);
router.post("/refresh-token", refreshAgentToken);
router.get("/public", listPublicAgents);         // AgentHub listing
router.post("/rate/:id", rateAgent);                // Rate an agent

// ── Agent protected ──
router.get("/me", protectAgent, getMe);
router.patch("/location", protectAgent, updateLocation);  
router.patch("/status", protectAgent, updateStatus);
router.post("/vehicle-images", protectAgent,
    vehicleUpload.fields([
        { name: "chassis", maxCount: 1 },
        { name: "car", maxCount: 1 },
        { name: "engine", maxCount: 1 },
    ]),
    uploadVehicleImages
);

// ── Admin only ──
router.post("/create", protectAdmin, superAdminOnly, pfpUpload.single("pfp"), createAgent);
router.get("/", protectAdmin, superAdminOnly, listAgents);

export default router;