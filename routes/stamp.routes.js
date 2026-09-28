// routes/stamp.routes.js
import express from "express";
import multer from "multer";
import {
  uploadStampContract,
  searchStampContracts,
  getStampContract,
} from "../controllers/stamp/stamp.Controller.js";
import { protectAgent } from "../middleware/agent.auth.middleware.js";

const router = express.Router();

// Files are held in memory; the controller uploads them to Cloudinary explicitly.
const storage = multer.memoryStorage();

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