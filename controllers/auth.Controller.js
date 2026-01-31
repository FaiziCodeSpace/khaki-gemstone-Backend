import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users/User.js";
import Cart from "../models/public/Cart.js";
import Admin from "../models/users/Admin.js";
import generateToken from "../utils/generateToken.js";
import mongoose from "mongoose";
import { sendInvestorApprovedEmail } from "../utils/mailer.js";
import dotenv from 'dotenv';
dotenv.config();

// ================= MERGE CART =================
const mergeCarts = async (userId, guestCart) => {
  if (!guestCart || !Array.isArray(guestCart) || guestCart.length === 0) return;

  try {
    const productIds = guestCart
      .map((item) => (item && typeof item === "object" ? item._id : item))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

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

    let user = await User.findOne({ email });

    if (user) {
      if (user.isInvestor) {
        return res.status(400).json({ message: "This email is already registered as an investor." });
      }

      user.isInvestor = true;
      user.investor = {
        ...investorData,
        status: "pending",
        appliedAt: new Date(),
      };

      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      await user.save();
    } else {
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

    await mergeCarts(user._id, guestCart);

    res.status(201).json({
      token: generateToken(user._id, "user"),
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

    if (role === "investor") {
      if (!user.isInvestor) {
        return res.status(403).json({ message: "This account is not registered as an investor." });
      }
      user.lastInvestorVisitAt = new Date();
      await user.save();
      if (user.investor?.status !== "approved") {
        const status = user.investor?.status || "pending";
        const messages = {
          pending: "Your investor application is still pending approval.",
          rejected: "Your investor application was rejected.",
        };
        return res.status(403).json({ message: messages[status] || "Account not approved." });
      }
    }

    await mergeCarts(user._id, guestCart);


    res.status(200).json({
      token: generateToken(user._id, user.isInvestor ? "investor" : "user"),
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
    const { firstName, lastName, email, password, phone, cnic, city, address, dob, gender } = req.body;

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
      phone, cnic, city, address, dob, gender,
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

// ============= VERIFY INVESTOR ================ 
export const updateInvestorStatus = async (req, res) => {
  try {
    const { status } = req.query;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Please select the application" });
    }

    if (!["approve", "decline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status action" });
    }

    const updateData =
      status === "approve"
        ? {
          "investor.status": "approved",
          "investor.approvedAt": new Date(),
          isInvestor: true,
        }
        : {
          "investor.status": "rejected",
          "investor.rejectedAt": new Date(),
          isInvestor: false,
        };

    const user = await User.findOneAndUpdate(
      { _id: id, "investor.status": "pending" },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: "Investor application not found or already processed",
      });
    }

    // 📧 Send approval email
    if (status === "approve") {
      await sendInvestorApprovedEmail({
        to: user.email,
        firstName: user.firstName,
      });
    }

    return res.status(200).json({
      message: `Investor application ${status}d successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Update Investor Status Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============= GET USERS =================

export const getUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    let query = {};

    // 1. Determine which Model to use
    let SelectedModel = User; // Default to User model

    switch (role) {
      case "admin":
        SelectedModel = Admin;
        query.role = { $regex: /^admin$/i };
        break;
      case "investor":
        query.isInvestor = true;
        if (status) query["investor.status"] = status;
        break;

      case "user":
        query.isInvestor = false;
        query.role = { $ne: "admin" };
        break;

      default:
        query.role = { $ne: "admin" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 2. Execute Query on the Selected Model
    const users = await SelectedModel.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select("-password");

    const total = await SelectedModel.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// =============== ADMIN AUTH ===================

export const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. Find admin and explicitly select password
    const admin = await Admin.findOne({ phone }).select("+password");
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Account is suspended. Contact Super Admin." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, role: admin.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

// --- PRODUCTION CREATE ---

export const createAdmin = async (req, res) => {
  try {
    const { name, phone, city, password, role } = req.body;

    const newAdmin = await Admin.create({ name, phone, city, password, role });

    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    res.status(201).json({ success: true, admin: adminResponse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Phone number already in use" });
    }
    res.status(400).json({ message: error.message });
  }
};

// --- PRODUCTION EDIT ---
export const editAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedUpdates = ['name', 'phone', 'city', 'role', 'isActive', 'password'];

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    allowedUpdates.forEach((update) => {
      if (updates[update] !== undefined) {
        admin[update] = updates[update];
      }
    });

    await admin.save();

    const adminData = admin.toObject();
    delete adminData.password;

    res.json({ success: true, admin: adminData });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Phone already exists" });
    res.status(500).json({ message: "Update failed" });
  }
};