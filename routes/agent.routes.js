// routes/agent.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
    createAgent, loginAgent, logoutAgent, refreshAgentToken,
    getMe, listAgents, updateStatus, uploadVehicleImages,
} from "../controllers/agent/agent.Controller.js";
import { protectAgent } from "../middleware/agent.auth.middleware.js";
import { protectAdmin } from "../middleware/admin.middleware.js";
import { superAdminOnly } from "../middleware/admin.middleware.js";

const router = express.Router();

// ── Ensure upload directories exist ──
["agentPfp", "chassis", "car", "engine"].forEach((dir) => {
    const p = path.join(process.cwd(), "uploads", dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── Multer for agent profile picture ──
const pfpStorage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, path.join(process.cwd(), "uploads", "agentPfp")),
    filename: (_, file, cb) => cb(null, `agent_${Date.now()}${path.extname(file.originalname)}`),
});
const pfpUpload = multer({
    storage: pfpStorage, limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"))
});

// ── Multer for vehicle images (temp storage — renamed in controller) ──
const vehicleTmp = multer.diskStorage({
    destination: (_, file, cb) => {
        const folder = { chassis: "chassis", car: "car", engine: "engine" }[file.fieldname] || "chassis";
        cb(null, path.join(process.cwd(), "uploads", folder));
    },
    filename: (_, file, cb) => cb(null, `tmp_${Date.now()}_${file.originalname}`),
});
const vehicleUpload = multer({
    storage: vehicleTmp, limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"))
});

// ── Public routes ──
router.post("/login", loginAgent);
router.post("/logout", logoutAgent);
router.post("/refresh-token", refreshAgentToken);

// ── Agent protected ──
router.get("/me", protectAgent, getMe);
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