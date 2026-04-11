// routes/bargainer.routes.js
import express from "express";
import multer  from "multer";
import path    from "path";
import fs      from "fs";
import {
  registerBargainer, loginBargainer, logoutBargainer,
  refreshBargainerToken, getMeBargainer,
  listBargainers, approveBargainer, rejectBargainer, deleteBargainer,
} from "../controllers/bargainer/Bargainer.Controller.js";
import { protectAdmin, superAdminOnly } from "../middleware/admin.middleware.js";
import { protectBargainer }             from "../middleware/bargainer.auth.middleware.js";

const router = express.Router();

// Ensure upload folder exists
const pfpDir = path.join(process.cwd(), "uploads", "bargainerPfp");
if (!fs.existsSync(pfpDir)) fs.mkdirSync(pfpDir, { recursive: true });

const pfpStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, pfpDir),
  filename:    (_, file, cb) => cb(null, `bargainer_${Date.now()}${path.extname(file.originalname)}`),
});
const pfpUpload = multer({
  storage:    pfpStorage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) =>
    f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only")),
});

// ── Public ──
router.post("/register",      pfpUpload.single("pfp"), registerBargainer);
router.post("/login",         loginBargainer);
router.post("/logout",        logoutBargainer);
router.post("/refresh-token", refreshBargainerToken);

// ── Bargainer protected ──
router.get("/me", protectBargainer, getMeBargainer);

// ── Admin only ──
router.get("/",              protectAdmin, superAdminOnly, listBargainers);
router.patch("/:id/approve", protectAdmin, superAdminOnly, approveBargainer);
router.patch("/:id/reject",  protectAdmin, superAdminOnly, rejectBargainer);
router.delete("/:id",        protectAdmin, superAdminOnly, deleteBargainer);

export default router;