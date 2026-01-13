import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users/CommonUser.js";
import Cart from "../models/public/Cart.js";
import generateToken from "../utils/generateToken.js";

const mergeCarts = async (userId, guestCart) => {
  if (Array.isArray(guestCart) && guestCart.length > 0) {
    const productIds = guestCart.map(item => item._id).filter(Boolean);

    if (productIds.length > 0) {
      await Cart.findOneAndUpdate(
        { userId },
        { $addToSet: { items: { $each: productIds } } },
        { upsert: true, new: true }
      );
    }
  }
};

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, guestCart } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    // Merge unique items from guest session
    await mergeCarts(user._id, guestCart);

    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, email: user.email, isInvestor: user.isInvestor },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password, guestCart } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Merge unique items from guest session
    await mergeCarts(user._id, guestCart);

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, email: user.email, isInvestor: user.isInvestor },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};