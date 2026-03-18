import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.AGENT_ACCESS_SECRET || process.env.JWT_SECRET;

export const protectAgent = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.agentId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};