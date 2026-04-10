// controllers/bargainer/bargainer.Controller.js
import jwt      from "jsonwebtoken";
import Bargainer from "../../models/bargainer/Bargainer.js";

const ACCESS_SECRET  = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const COOKIE_NAME    = "bargainerRefreshToken"; // separate from agentRefreshToken

const signAccess  = (id) => jwt.sign({ id }, ACCESS_SECRET,  { expiresIn: "15m" });
const signRefresh = (id) => jwt.sign({ id }, REFRESH_SECRET, { expiresIn: "7d"  });

const cookieOpts = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const pub = (b) => ({
  _id:      b._id,
  fullName: b.fullName,
  phone:    b.phone,
  city:     b.city,
  status:   b.status,
  isActive: b.isActive,
  pfp:      b.pfp || "",
});

// ── POST /api/bargainers/register  (public, multipart/form-data) ────
export const registerBargainer = async (req, res) => {
  try {
    const { fullName, phone, cnic, password, city } = req.body;
    if (!fullName || !phone || !cnic || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    if (await Bargainer.findOne({ $or: [{ phone }, { cnic }] }))
      return res.status(409).json({ success: false, message: "Account with this phone or CNIC already exists" });

    const pfp       = req.file ? `uploads/bargainerPfp/${req.file.filename}` : "";
    const bargainer = await Bargainer.create({ fullName, phone, cnic, password, city: city || "", pfp });

    return res.status(201).json({
      success:  true,
      message:  "Application submitted. You will be notified once approved by admin.",
      bargainer: { _id: bargainer._id, fullName: bargainer.fullName, status: bargainer.status },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((v) => v.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/bargainers/login  (public) ────────────────────────────
export const loginBargainer = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: "Phone and password are required" });

    const bargainer = await Bargainer.findOne({ phone });
    if (!bargainer || !(await bargainer.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (bargainer.status === "pending")
      return res.status(403).json({
        success: false,
        message: "Your application is under review. Please wait for admin approval.",
        statusCode: "PENDING",
      });

    if (bargainer.status === "rejected")
      return res.status(403).json({
        success: false,
        message: `Your application was rejected${bargainer.rejectedReason ? `: ${bargainer.rejectedReason}` : "."}`,
        statusCode: "REJECTED",
      });

    if (!bargainer.isActive)
      return res.status(403).json({ success: false, message: "Account is disabled." });

    const accessToken  = signAccess(bargainer._id);
    const refreshToken = signRefresh(bargainer._id);
    res.cookie(COOKIE_NAME, refreshToken, cookieOpts);

    return res.status(200).json({ success: true, accessToken, bargainer: pub(bargainer) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/bargainers/logout ─────────────────────────────────────
export const logoutBargainer = async (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: 0 });
  return res.status(200).json({ success: true, message: "Logged out" });
};

// ── POST /api/bargainers/refresh-token ──────────────────────────────
export const refreshBargainerToken = async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ success: false, message: "No refresh token" });

    const decoded   = jwt.verify(token, REFRESH_SECRET);
    const bargainer = await Bargainer.findById(decoded.id).select("-password");
    if (!bargainer || !bargainer.isActive)
      return res.status(401).json({ success: false, message: "Invalid token" });

    const accessToken = signAccess(bargainer._id);
    return res.status(200).json({ success: true, accessToken, bargainer: pub(bargainer) });
  } catch {
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }
};

// ── GET /api/bargainers/me  (bargainer protected) ───────────────────
export const getMeBargainer = async (req, res) => {
  try {
    const bargainer = await Bargainer.findById(req.bargainerId).select("-password");
    if (!bargainer) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, bargainer: pub(bargainer) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bargainers  (Admin) ────────────────────────────────────
export const listBargainers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const bargainers = await Bargainer.find(filter).select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: bargainers.length, bargainers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/bargainers/:id/approve  (Admin) ──────────────────────
export const approveBargainer = async (req, res) => {
  try {
    const bargainer = await Bargainer.findByIdAndUpdate(
      req.params.id,
      { status: "approved", isActive: true, rejectedReason: "" },
      { new: true, select: "-password" }
    );
    if (!bargainer) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, message: "Bargainer approved", bargainer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/bargainers/:id/reject  (Admin) ───────────────────────
export const rejectBargainer = async (req, res) => {
  try {
    const { reason } = req.body;
    const bargainer = await Bargainer.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", isActive: false, rejectedReason: reason || "" },
      { new: true, select: "-password" }
    );
    if (!bargainer) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, message: "Bargainer rejected", bargainer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/bargainers/:id  (Admin) ─────────────────────────────
export const deleteBargainer = async (req, res) => {
  try {
    await Bargainer.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Bargainer deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};