// controllers/stamp/stamp.Controller.js
import StampContract from "../../models/stamp/StampContract.js";
import { uploadBuffer } from "../../utils/uploadToCloudinary.js";

export const uploadStampContract = async (req, res) => {
  try {
    if (!req.files?.pdf?.[0]) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }

    let metadata = {};
    try { metadata = JSON.parse(req.body.metadata || "{}"); } catch { metadata = {}; }

    const files   = req.files;

    // Upload one field to Cloudinary. path = public_id, url = secure_url
    // (same two fields the model always had: an internal pointer + a public link).
    const send = async (fieldName, folder, resource_type = "image") => {
      const f = files[fieldName]?.[0];
      if (!f) return { path: "", url: "" };
      const up = await uploadBuffer(f.buffer, {
        folder: `khakigemstone/${folder}`,
        public_id: `${fieldName}_${Date.now()}`,
        resource_type,
      });
      return { path: up.public_id, url: up.secure_url };
    };

    const [pdf, chassis, car, engine, sellerFp, buyerFp, w1Fp, w2Fp] = await Promise.all([
      send("pdf",        "stamps",       "raw"),
      send("chassisImg", "chassis"),
      send("carImg",     "car"),
      send("engineImg",  "engine"),
      send("sellerFp",   "fingerprints"),
      send("buyerFp",    "fingerprints"),
      send("witness1Fp", "fingerprints"),
      send("witness2Fp", "fingerprints"),
    ]);
    const pdfPath = pdf.path;
    const pdfUrl  = pdf.url;

    const contract = await StampContract.create({
      // Vehicle
      chassisNo:  metadata.chassisNo  || "",
      modelYear:  metadata.modelYear  || "",
      regNo:      metadata.regNo      || "",
      carModel:   metadata.carModel   || "",
      carColor:   metadata.carColor   || "",
      engineNo:   metadata.engineNo   || "",
      // Seller
      sellerName:    metadata.sellerName    || "",
      sellerFather:  metadata.sellerFather  || "",
      sellerMohalla: metadata.sellerMohalla || "",
      sellerCnic:    metadata.sellerCnic    || "",
      sellerTehsil:  metadata.sellerTehsil  || "",
      // Buyer
      buyerName:    metadata.buyerName    || "",
      buyerFather:  metadata.buyerFather  || "",
      buyerMohalla: metadata.buyerMohalla || "",
      buyerCnic:    metadata.buyerCnic    || "",
      buyerTehsil:  metadata.buyerTehsil  || "",
      // Payment
      paymentMode:    metadata.paymentMode    || "full",
      priceNum:       metadata.priceNum       || "",
      priceWords:     metadata.priceWords     || "",
      advanceNum:     metadata.advanceNum     || "",
      advanceWords:   metadata.advanceWords   || "",
      remainingNum:   metadata.remainingNum   || "",
      remainingWords: metadata.remainingWords || "",
      dueDate:        metadata.dueDate        || "",
      // Dynamic fields
      remainingClause: metadata.remainingClause || "",
      numberPlate:     metadata.numberPlate     ?? "دو عدد نمبر پلیٹ",
      conditions:      metadata.conditions      || "",
      // Witnesses
      witness1Name:   metadata.witness1Name   || "",
      witness1Cnic:   metadata.witness1Cnic   || "",
      witness1Tehsil: metadata.witness1Tehsil || "",
      witness2Name:   metadata.witness2Name   || "",
      witness2Cnic:   metadata.witness2Cnic   || "",
      witness2Tehsil: metadata.witness2Tehsil || "",
      date: metadata.date || "",
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
        _id: contract._id, pdfUrl: contract.pdfUrl,
        chassisNo: contract.chassisNo, modelYear: contract.modelYear,
        createdAt: contract.createdAt,
      },
    });
  } catch (err) {
    console.error("[StampUpload]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

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

export const getStampContract = async (req, res) => {
  try {
    const contract = await StampContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, contract });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};