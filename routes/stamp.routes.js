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

const router = express.Router();

// ── Multer — save PDFs to uploads/stamps/ ──
const stampsDir = path.join(process.cwd(), "uploads", "stamps");
if (!fs.existsSync(stampsDir)) fs.mkdirSync(stampsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, stampsDir),
  filename: (_req, file, cb) => {
    // e.g. stamp_1710000000000.pdf
    const unique = `stamp_${Date.now()}`;
    const ext    = path.extname(file.originalname) || ".pdf";
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted"), false);
  },
});

// Routes
router.post("/upload",    upload.single("pdf"), uploadStampContract);
router.get("/search",     searchStampContracts);
router.get("/:id",        getStampContract);

export default router;