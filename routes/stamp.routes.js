// routes/stamp.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  uploadStampContract,
  searchStampContracts,
  getStampContract,
} from "../controllers/stamp/stamp.Controller.js";
import { protectAgent } from "../middleware/agent.auth.middleware.js";

const router = express.Router();

// ── Ensure all upload directories exist ──
["stamps", "chassis", "car", "engine", "fingerprints"].forEach((dir) => {
  const p = path.join(process.cwd(), "uploads", dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── Multer — routes each field to the correct folder ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderMap = {
      pdf:        "stamps",
      chassisImg: "chassis",
      carImg:     "car",
      engineImg:  "engine",
      sellerFp:   "fingerprints",
      buyerFp:    "fingerprints",
      witness1Fp: "fingerprints",
      witness2Fp: "fingerprints",
    };
    cb(null, path.join(process.cwd(), "uploads", folderMap[file.fieldname] || "stamps"));
  },
  filename: (req, file, cb) => {
    // metadata may not be parsed yet at filename time — use a temp name,
    // controller will rename if needed. Or parse body directly:
    const ext  = path.extname(file.originalname) || (file.mimetype === "application/pdf" ? ".pdf" : ".jpg");
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");
    ok ? cb(null, true) : cb(new Error("Only PDF and image files accepted"));
  },
});

const uploadFields = upload.fields([
  { name: "pdf",        maxCount: 1 },
  { name: "chassisImg", maxCount: 1 },
  { name: "carImg",     maxCount: 1 },
  { name: "engineImg",  maxCount: 1 },
  { name: "sellerFp",   maxCount: 1 },
  { name: "buyerFp",    maxCount: 1 },
  { name: "witness1Fp", maxCount: 1 },
  { name: "witness2Fp", maxCount: 1 },
]);

router.post("/upload", protectAgent, uploadFields, uploadStampContract);
router.get("/search",  protectAgent, searchStampContracts);
router.get("/:id",     protectAgent, getStampContract);

export default router;