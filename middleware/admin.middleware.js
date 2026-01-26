import jwt from "jsonwebtoken";
import Admin from "../models/users/Admin.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Not authorized, no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify role from token payload
    if (!["ADMIN", "SUPER_ADMIN"].includes(decoded.role)) {
      return res.status(403).json({ message: "Not authorized as an admin" });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: "Admin not found or account disabled" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed", error: error.message });
  }
};

// Middleware to restrict certain actions to SUPER_ADMIN only
export const superAdminOnly = (req, res, next) => {
  if (req.admin && req.admin.role === "SUPER_ADMIN") {
    next();
  } else {
    res.status(403).json({ message: "Only Super Admins can perform this action" });
  }
};