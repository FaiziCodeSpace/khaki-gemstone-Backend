import jwt from "jsonwebtoken";

const generateToken = (id, role = "user") => {
  return jwt.sign(
    { id, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: "30d" }
  );
};

export const generateAccessAndRefreshTokens = (adminId, role) => {
  const accessToken = jwt.sign(
    { id: adminId, role }, 
    process.env.ACCESS_TOKEN_SECRET, 
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: adminId }, 
    process.env.REFRESH_TOKEN_SECRET, 
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};


export default generateToken;