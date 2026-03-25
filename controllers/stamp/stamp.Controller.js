// controllers/stamp/stamp.Controller.js
import path from "path";
import fs from "fs";
import StampContract from "../../models/stamp/StampContract.js";

// ── POST /api/stamps/upload ──────────────────────────────────────────
// Receives multipart/form-data:
//   pdf          — the contract PDF
//   chassisImg   — chassis photo (optional)
//   carImg       — car photo (optional)
//   engineImg    — engine photo (optional)
//   sellerFp     — seller fingerprint (optional)
//   buyerFp      — buyer fingerprint (optional)
//   witness1Fp   — witness 1 fingerprint (optional)
//   witness2Fp   — witness 2 fingerprint (optional)
//   metadata     — JSON string of all contract fields
//
export const uploadStampContract = async (req, res) => {
  try {
    if (!req.files?.pdf?.[0]) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }

    let metadata = {};
    try { metadata = JSON.parse(req.body.metadata || "{}"); } catch { metadata = {}; }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const files   = req.files;

    const pdfFile = files.pdf[0];
    const pdfPath = pdfFile.path;
    const pdfUrl  = `${baseUrl}/uploads/stamps/${pdfFile.filename}`;

    // Helper to get path + url for optional image files
    const imgInfo = (fieldName, folder) => {
      const f = files[fieldName]?.[0];
      if (!f) return { path: "", url: "" };
      return {
        path: f.path,
        url:  `${baseUrl}/uploads/${folder}/${f.filename}`,
      };
    };

    const chassis   = imgInfo("chassisImg",  "chassis");
    const car       = imgInfo("carImg",      "car");
    const engine    = imgInfo("engineImg",   "engine");
    const sellerFp  = imgInfo("sellerFp",    "fingerprints");
    const buyerFp   = imgInfo("buyerFp",     "fingerprints");
    const w1Fp      = imgInfo("witness1Fp",  "fingerprints");
    const w2Fp      = imgInfo("witness2Fp",  "fingerprints");

    const contract = await StampContract.create({
      chassisNo:  metadata.chassisNo  || "",
      modelYear:  metadata.modelYear  || "",
      regNo:      metadata.regNo      || "",
      carModel:   metadata.carModel   || "",
      carColor:   metadata.carColor   || "",
      engineNo:   metadata.engineNo   || "",
      sellerName:   metadata.sellerName   || "",
      sellerCnic:   metadata.sellerCnic   || "",
      sellerTehsil: metadata.sellerTehsil || "",
      buyerName:    metadata.buyerName    || "",
      buyerCnic:    metadata.buyerCnic    || "",
      buyerTehsil:  metadata.buyerTehsil  || "",
      paymentMode:  metadata.paymentMode  || "full",
      priceNum:     metadata.priceNum     || "",
      priceWords:   metadata.priceWords   || "",
      advanceNum:   metadata.advanceNum   || "",
      remainingNum: metadata.remainingNum || "",
      dueDate:      metadata.dueDate      || "",
      witness1Name: metadata.witness1Name || "",
      witness1Cnic: metadata.witness1Cnic || "",
      witness2Name: metadata.witness2Name || "",
      witness2Cnic: metadata.witness2Cnic || "",
      date:         metadata.date         || "",
      pdfPath,
      pdfUrl,
      chassisImgPath: chassis.path,  chassisImgUrl: chassis.url,
      carImgPath:     car.path,      carImgUrl:     car.url,
      engineImgPath:  engine.path,   engineImgUrl:  engine.url,
      sellerFpPath:   sellerFp.path, sellerFpUrl:   sellerFp.url,
      buyerFpPath:    buyerFp.path,  buyerFpUrl:    buyerFp.url,
      witness1FpPath: w1Fp.path,     witness1FpUrl: w1Fp.url,
      witness2FpPath: w2Fp.path,     witness2FpUrl: w2Fp.url,
    });

    return res.status(201).json({
      success:  true,
      message:  "Contract saved successfully",
      contract: {
        _id:       contract._id,
        pdfUrl:    contract.pdfUrl,
        chassisNo: contract.chassisNo,
        modelYear: contract.modelYear,
        createdAt: contract.createdAt,
      },
    });
  } catch (err) {
    console.error("[StampUpload]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/stamps/search ──────────────────────────────────────────
export const searchStampContracts = async (req, res) => {
  try {
    const { q = "", year = "" } = req.query;
    if (!q && !year)
      return res.status(400).json({ success: false, message: "Provide q or year" });

    const filter = {};
    if (q && year) {
      filter.$and = [
        { $or: [
          { chassisNo:  { $regex: q, $options: "i" } },
          { regNo:      { $regex: q, $options: "i" } },
          { sellerName: { $regex: q, $options: "i" } },
          { buyerName:  { $regex: q, $options: "i" } },
          { carModel:   { $regex: q, $options: "i" } },
        ]},
        { modelYear: { $regex: year, $options: "i" } },
      ];
    } else if (q) {
      filter.$or = [
        { chassisNo:  { $regex: q, $options: "i" } },
        { regNo:      { $regex: q, $options: "i" } },
        { sellerName: { $regex: q, $options: "i" } },
        { buyerName:  { $regex: q, $options: "i" } },
        { carModel:   { $regex: q, $options: "i" } },
      ];
    } else {
      filter.modelYear = { $regex: year, $options: "i" };
    }

    const contracts = await StampContract.find(filter)
      .select("chassisNo modelYear regNo carModel sellerName buyerName date pdfUrl chassisImgUrl carImgUrl engineImgUrl sellerFpUrl buyerFpUrl witness1FpUrl witness2FpUrl createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, count: contracts.length, contracts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/stamps/:id ─────────────────────────────────────────────
export const getStampContract = async (req, res) => {
  try {
    const contract = await StampContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, contract });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};