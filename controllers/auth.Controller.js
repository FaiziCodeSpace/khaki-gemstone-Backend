import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users/CommonUser.js";
import Cart from "../models/public/Cart.js";
import generateToken from "../utils/generateToken.js";
import mongoose from "mongoose";

const mergeCarts = async (userId, guestCart) => {
  if (!guestCart || !Array.isArray(guestCart) || guestCart.length === 0) return;

  try {
    const productIds = guestCart
      .map(item => (item && typeof item === 'object' ? item._id : item))
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

    // 1. Check if user already exists in the system
    let user = await User.findOne({ email });

    if (user) {
      // If user is already an investor, don't let them apply again
      if (user.isInvestor) {
        return res.status(400).json({ message: "This email is already registered as an investor." });
      }

      // 2. Logic for EXISTING Common User -> Upgrading to Investor
      user.isInvestor = true;
      user.investor = {
        ...investorData,
        status: "pending",
        appliedAt: new Date(),
      };

      // Update names if they were empty for some reason
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;

      await user.save();
    } else {
      // 3. Logic for BRAND NEW User
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
        }
      });
    }

    // Merge cart items regardless of registration path
    await mergeCarts(user._id, guestCart);

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isInvestor: user.isInvestor
      },
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

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isInvestor: user.isInvestor
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// Apply to become an investor
export const applyInvestor = async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, 
      phone, cnic, city, address, dob, gender 
    } = req.body;

    // 1. Check if user exists by email (the unique identifier)
    let user = await User.findOne({ email });

    if (user) {
      // 2. If user exists, check if they are already an investor
      if (user.isInvestor) {
        return res.status(400).json({ message: "This email is already registered as an investor." });
      }
      // 3. Update existing common user to investor status
      user.isInvestor = true;
    } else {
      // 4. Create a brand new user if email doesn't exist
      const hashedPassword = await bcrypt.hash(password, 12);
      user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isInvestor: true,
      });
    }

    // 5. Attach/Update investor details (This works for both New and Existing users)
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
      isNewUser: !user.createdAt // Simple flag for frontend if needed
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
