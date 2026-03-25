// controllers/agent/agent.Controller.js
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import Agent from "../../models/agent/Agent.js";

const ACCESS_SECRET  = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

const signAccess  = (id) => jwt.sign({ id }, ACCESS_SECRET,  { expiresIn: "15m" });
const signRefresh = (id) => jwt.sign({ id }, REFRESH_SECRET, { expiresIn: "7d"  });

const cookieOpts = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const agentPublic = (agent) => ({
  _id:           agent._id,
  fullName:      agent.fullName,
  cnic:          agent.cnic,
  address:       agent.address,
  officeAddress: agent.officeAddress,
  pfp:           agent.pfp,
  status:        agent.status,
});

// Helper to format Mongoose/MongoDB errors for the frontend
const handleMongooseError = (err, res) => {
  // Mongoose Validation Error (e.g., required field missing, regex fail)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message: messages.join(", "), errors: err.errors });
  }

  // MongoDB Duplicate Key Error (e.g., unique: true constraint violated)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}. Please use another.` });
  }

  // Cast Error (e.g., invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // Fallback for other errors
  return res.status(500).json({ success: false, message: err.message });
};

// ── POST /api/agents/create  (Admin only) ───────────────────────────
export const createAgent = async (req, res) => {
  try {
    const { fullName, cnic, address, officeAddress, password } = req.body;
    if (!fullName || !cnic || !address || !officeAddress || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    if (await Agent.findOne({ cnic }))
      return res.status(409).json({ success: false, message: "Agent with this CNIC already exists" });

    const pfp   = req.file ? `uploads/agentPfp/${req.file.filename}` : "";
    const agent = await Agent.create({ fullName, cnic, address, officeAddress, password, pfp });

    return res.status(201).json({
      success: true,
      message: "Agent created successfully",
      agent:   agentPublic(agent),
    });
  } catch (err) {
    return handleMongooseError(err, res);
  }
};

// ── POST /api/agents/login ──────────────────────────────────────────
export const loginAgent = async (req, res) => {
  try {
    const { cnic, password } = req.body;
    if (!cnic || !password)
      return res.status(400).json({ success: false, message: "CNIC and password are required" });

    const agent = await Agent.findOne({ cnic });
    if (!agent || !(await agent.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!agent.isActive)
      return res.status(403).json({ success: false, message: "Account is disabled" });

    // Set status to online on login
    agent.status = "online";
    await agent.save();

    const accessToken  = signAccess(agent._id);
    const refreshToken = signRefresh(agent._id);
    res.cookie("agentRefreshToken", refreshToken, cookieOpts);

    return res.status(200).json({ success: true, accessToken, agent: agentPublic(agent) });
  } catch (err) {
    return handleMongooseError(err, res);
  }
};

// ── POST /api/agents/logout ─────────────────────────────────────────
export const logoutAgent = async (req, res) => {
  try {
    // Set status to offline on logout
    const token = req.cookies?.agentRefreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        await Agent.findByIdAndUpdate(decoded.id, { status: "offline" });
      } catch (_) {}
    }
  } catch (_) {}
  res.clearCookie("agentRefreshToken", { ...cookieOpts, maxAge: 0 });
  return res.status(200).json({ success: true, message: "Logged out" });
};

// ── POST /api/agents/refresh-token ──────────────────────────────────
export const refreshAgentToken = async (req, res) => {
  try {
    const token = req.cookies?.agentRefreshToken;
    if (!token) return res.status(401).json({ success: false, message: "No refresh token" });

    const decoded = jwt.verify(token, REFRESH_SECRET);
    const agent   = await Agent.findById(decoded.id).select("-password");
    if (!agent || !agent.isActive)
      return res.status(401).json({ success: false, message: "Invalid token" });

    const accessToken = signAccess(agent._id);
    return res.status(200).json({ success: true, accessToken, agent: agentPublic(agent) });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }
};

// ── PATCH /api/agents/status  (agent only) ──────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["online", "busy", "offline"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const agent = await Agent.findByIdAndUpdate(
      req.agentId,
      { status },
      { new: true, runValidators: true, select: "-password" }
    );
    return res.status(200).json({ success: true, agent: agentPublic(agent) });
  } catch (err) {
    return handleMongooseError(err, res);
  }
};

// ── GET /api/agents/me ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const agent = await Agent.findById(req.agentId).select("-password");
    if (!agent) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, agent: agentPublic(agent) });
  } catch (err) {
    return handleMongooseError(err, res);
  }
};

// ── GET /api/agents  (Admin — list all) ─────────────────────────────
export const listAgents = async (req, res) => {
  try {
    const agents = await Agent.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, agents });
  } catch (err) {
    return handleMongooseError(err, res);
  }
};

// ── POST /api/agents/vehicle-images  (agent only) ───────────────────
export const uploadVehicleImages = async (req, res) => {
  try {
    const { chassisNo, regNo, engineNo } = req.body;
    const files  = req.files || {};
    const result = {};

    const renameFile = (file, desiredName, folder) => {
      if (!file) return null;
      const ext     = path.extname(file.originalname) || ".jpg";
      const newName = `${desiredName.replace(/[^a-zA-Z0-9-_]/g, "_")}${ext}`;
      const newPath = path.join(process.cwd(), "uploads", folder, newName);
      fs.renameSync(file.path, newPath);
      return `uploads/${folder}/${newName}`;
    };

    if (files.chassis?.[0] && chassisNo)
      result.chassis = renameFile(files.chassis[0], chassisNo, "chassis");

    if (files.car?.[0] && regNo)
      result.car = renameFile(files.car[0], regNo, "car");

    if (files.engine?.[0] && engineNo)
      result.engine = renameFile(files.engine[0], engineNo, "engine");

    return res.status(200).json({ success: true, files: result });
  } catch (err) {
    console.error("[vehicleImages]", err);
    return handleMongooseError(err, res);
  }
};