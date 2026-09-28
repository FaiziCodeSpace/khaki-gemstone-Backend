import jwt from "jsonwebtoken";
import Admin from "../models/users/Admin.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: "Admin not found or disabled" });
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};


export const superAdminOnly = (req, res, next) => {
  if (req.admin && req.admin.role === "SUPER_ADMIN") {
    next();
  } else {
    res.status(403).json({ message: "Only Super Admins can perform this action" });
  }
};