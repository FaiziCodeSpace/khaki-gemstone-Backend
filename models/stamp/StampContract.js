// models/stamp/StampContract.js
import mongoose from "mongoose";

const stampContractSchema = new mongoose.Schema(
  {
    // Core searchable fields
    chassisNo:  { type: String, required: true, trim: true, index: true },
    modelYear:  { type: String, required: true, trim: true, index: true },
    regNo:      { type: String, trim: true },
    carModel:   { type: String, trim: true },
    carColor:   { type: String, trim: true },
    engineNo:   { type: String, trim: true },
 
    // Parties
    sellerName:   { type: String, trim: true },
    sellerCnic:   { type: String, trim: true },
    sellerTehsil: { type: String, trim: true },
    buyerName:    { type: String, trim: true },
    buyerCnic:    { type: String, trim: true },
    buyerTehsil:  { type: String, trim: true },
 
    // Payment
    paymentMode:  { type: String, enum: ["full", "advance"], default: "full" },
    priceNum:     { type: String, trim: true },
    priceWords:   { type: String, trim: true },
    advanceNum:   { type: String, trim: true },
    remainingNum: { type: String, trim: true },
    dueDate:      { type: String, trim: true },
 
    // Witnesses
    witness1Name: { type: String, trim: true },
    witness1Cnic: { type: String, trim: true },
    witness2Name: { type: String, trim: true },
    witness2Cnic: { type: String, trim: true },
 
    // Contract date
    date: { type: String, trim: true },
 
    // PDF
    pdfPath: { type: String, required: true },
    pdfUrl:  { type: String, required: true },
 
    // ── Vehicle images ──
    chassisImgPath: { type: String, default: "" },
    chassisImgUrl:  { type: String, default: "" },
    carImgPath:     { type: String, default: "" },
    carImgUrl:      { type: String, default: "" },
    engineImgPath:  { type: String, default: "" },
    engineImgUrl:   { type: String, default: "" },
 
    // ── Fingerprint images ──
    sellerFpPath:   { type: String, default: "" },
    sellerFpUrl:    { type: String, default: "" },
    buyerFpPath:    { type: String, default: "" },
    buyerFpUrl:     { type: String, default: "" },
    witness1FpPath: { type: String, default: "" },
    witness1FpUrl:  { type: String, default: "" },
    witness2FpPath: { type: String, default: "" },
    witness2FpUrl:  { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound text index for flexible search
stampContractSchema.index(
  { chassisNo: "text", modelYear: "text", regNo: "text", sellerName: "text", buyerName: "text" },
  { name: "stamp_search_index" }
);

const StampContract = mongoose.model("StampContract", stampContractSchema);
export default StampContract;