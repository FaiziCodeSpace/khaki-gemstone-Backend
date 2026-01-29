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
    const { role } = req.query;
    let query = {};

    if (role === "investor") {
      query.isInvestor = true;
      query["investor.status"] = "pending";
    } else if (role === "user") {
      query.isInvestor = false;
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// =============== ADMIN AUTH ===================

export const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const admin = await Admin.findOne({ phone }).select("+password");

    if (!admin) return res.status(401).json({ message: "Admin not found" });
    if (!admin.isActive) return res.status(403).json({ message: "Admin is deactivated" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role);

    res.json({
      token,
      admin: { name: admin.name, phone: admin.phone, role: admin.role, city: admin.city },
    });
  } catch (error) {
    res.status(500).json({ message: "Admin login failed", error: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, phone, city, password, role } = req.body;

    const newAdmin = await Admin.create({
      name,
      phone,
      city,
      password,
      role
    });

    const adminData = newAdmin.toObject();
    delete adminData.password;

    res.status(201).json({
      message: "Admin created successfully",
      admin: adminData
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Phone number already registered to another admin" });
    }

    res.status(400).json({
      message: "Admin creation failed",
      error: error.message
    });
  }
};

export const toggleAdminStatus = async (req, res) => {
  const { adminId, isActive } = req.body;
  const admin = await Admin.findById(adminId);
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  if (admin.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot deactivate SUPER_ADMIN" });

  admin.isActive = isActive;
  await admin.save();
  res.json({ message: "Admin status updated", admin });
};

export const assignCity = async (req, res) => {
  const { adminId, city } = req.body;
  const admin = await Admin.findById(adminId);
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  admin.city = city;
  await admin.save();
  res.json({ message: "City assigned", admin });
};