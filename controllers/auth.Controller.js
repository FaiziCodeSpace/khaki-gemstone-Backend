import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users/CommonUser.js";
import Cart from "../models/public/Cart.js";
import generateToken from "../utils/generateToken.js";
import mongoose from "mongoose";

// ================= MERGE CART =================
const mergeCarts = async (userId, guestCart) => {
  if (!guestCart || !Array.isArray(guestCart) || guestCart.length === 0) return;

  try {
    const productIds = guestCart
      .map(item => (item && typeof item === "object" ? item._id : item))
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    if (productIds.length > 0) {
      await Cart.findOneAndUpdate(
        { userId },
        { $addToSet: { items: { $each: productIds } } },
        { upsert: true, new: true }
      );
      console.log(`Successfully merged ${productIds.length} items for user ${userId}`);
    }
  } catch (error) {
    console.error("Cart Merge Error:", error.message);
  }
};

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, guestCart, ...investorData } = req.body;

    // 1. Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Already an investor?
      if (user.isInvestor) {
        return res.status(400).json({ message: "This email is already registered as an investor." });
      }

      // EXISTING COMMON USER -> Upgrade to Investor
      user.isInvestor = true;
      user.investor = {
        ...investorData,
        status: "pending",
        appliedAt: new Date(),
      };

      // Update names if empty
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;

      await user.save();
    } else {
      // BRAND NEW USER
      if (!password) return res.status(400).json({ message: "Password is required for new users" });

      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isInvestor: false,
        investor: {
          ...investorData,
          status: "pending",
          appliedAt: new Date(),
        },
      });
    }

    // Merge cart items
    await mergeCarts(user._id, guestCart);

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isInvestor: user.isInvestor,
        status: user.isInvestor ? user.investor?.status : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password, guestCart, role } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Role check
    if (role === "investor") {
      if (!user.isInvestor) {
        return res.status(403).json({ message: "This account is not registered as an investor." });
      }

      if (user.investor?.status !== "approved") {
        const status = user.investor?.status || "pending";
        const messages = {
          pending: "Your investor application is still pending approval.",
          rejected: "Your investor application was rejected.",
        };
        return res.status(403).json({ message: messages[status] || "Account not approved." });
      }
    }

    // Merge cart
    await mergeCarts(user._id, guestCart);

    res.status(200).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isInvestor: user.isInvestor,
        status: user.isInvestor ? user.investor?.status : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// ================= APPLY INVESTOR =================
export const applyInvestor = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      phone, cnic, city, address, dob, gender,
    } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      if (user.isInvestor) {
        return res.status(400).json({ message: "This email is already registered as an investor." });
      }
      user.isInvestor = true;
    } else {
      if (!password) return res.status(400).json({ message: "Password is required for new users" });
      const hashedPassword = await bcrypt.hash(password, 12);
      user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isInvestor: true,
      });
    }

    user.investor = {
      phone,
      cnic,
      city,
      address,
      dob,
      gender,
      status: "pending",
      appliedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Investor application processed successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isInvestor: user.isInvestor,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
