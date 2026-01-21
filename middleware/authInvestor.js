import jwt from "jsonwebtoken";
import User from "../models/users/CommonUser.js";

export const investorAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isInvestor) {
      return res.status(403).json({ message: "Not authorized as investor" });
    }
    if (user.investor.status !== "approved") {
      return res.status(403).json({ message: "Investor application not approved" });
    }

    req.user = user; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
