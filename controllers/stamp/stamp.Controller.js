// controllers/stamp/stamp.Controller.js
import path from "path";
import fs from "fs";
import StampContract from "../../models/stamp/StampContract.js";

// ── POST /api/stamps/upload ──────────────────────────────────────────
// Receives: multipart/form-data
//   - pdf      : the PDF file (field name "pdf")
//   - metadata : JSON string of contract data fields
//
export const uploadStampContract = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }

    let metadata = {};
    try {
      metadata = JSON.parse(req.body.metadata || "{}");
    } catch {
      metadata = {};
    }

    // Build the public URL for this file
    const pdfUrl  = `${req.protocol}://${req.get("host")}/uploads/stamps/${req.file.filename}`;
    const pdfPath = req.file.path;

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
    });

    return res.status(201).json({
      success: true,
      message: "Contract uploaded successfully",
      contract: {
        _id:      contract._id,
        pdfUrl:   contract.pdfUrl,
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

// ── GET /api/stamps/search?q=RA410PK&year=2010 ───────────────────────
// Search by chassisNo, modelYear, regNo, sellerName, or buyerName
//
export const searchStampContracts = async (req, res) => {
  try {
    const { q = "", year = "" } = req.query;

    if (!q && !year) {
      return res.status(400).json({ success: false, message: "Provide q or year query param" });
    }

    const filter = {};

    if (q && year) {
      filter.$and = [
        {
          $or: [
            { chassisNo:  { $regex: q,    $options: "i" } },
            { regNo:      { $regex: q,    $options: "i" } },
            { sellerName: { $regex: q,    $options: "i" } },
            { buyerName:  { $regex: q,    $options: "i" } },
            { carModel:   { $regex: q,    $options: "i" } },
          ],
        },
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
      .select("chassisNo modelYear regNo carModel sellerName buyerName date pdfUrl createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, count: contracts.length, contracts });
  } catch (err) {
    console.error("[StampSearch]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/stamps/:id ──────────────────────────────────────────────
// Get full contract record by ID
//
export const getStampContract = async (req, res) => {
  try {
    const contract = await StampContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    return res.status(200).json({ success: true, contract });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};