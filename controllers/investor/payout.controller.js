import mongoose from 'mongoose';
import User from '../../models/users/User.js';
import Payout from '../../models/investment/Payout.js';

/**
 * INVESTOR: Request Payout
 * Earnings are NOT updated here (as requested).
 */
export const requestPayout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { method, accountDetails } = req.body;

    // 1. Security Check: Prevent multiple active requests
    const activePayout = await Payout.findOne({
      investorId: userId,
      status: { $in: ['pending', 'processing'] }
    }).session(session);

    if (activePayout) {
      return res.status(400).json({
        success: false,
        message: "You already have a payout request in progress. Please wait for it to complete."
      });
    }

    // 2. Fetch User & Verify Balance
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const payoutAmount = user.investor?.totalEarnings || 0;

    if (payoutAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No earnings available for payout." 
      });
    }

    // 3. Create Payout Record
    const newPayout = new Payout({
      investorId: userId,
      method,
      accountDetails,
      amount: payoutAmount,
      status: 'pending'
    });

    await newPayout.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Payout request submitted successfully. It will be reviewed by an admin.",
      transactionId: newPayout._id
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message || "Payout failed" });
  }
};

/**
 * ADMIN: Get all requests
 */
export const getAllPayoutRequests = async (req, res) => {
  try {
    const { status, investorId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (investorId) query.investorId = investorId;

    const payouts = await Payout.find(query)
      .populate('investorId', 'firstName lastName email investor.totalEarnings') 
      .sort({ createdAt: -1 }) 
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Payout.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: payouts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payout requests" });
  }
};

/**
 * ADMIN: Update Status
 * Deducts earnings only when status is 'completed'
 */
export const updatePayoutStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { payoutId } = req.params;
    const { status } = req.body; 

    const payout = await Payout.findById(payoutId).session(session);
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }

    if (payout.status === 'completed') {
      return res.status(400).json({ success: false, message: "This payout has already been finalized." });
    }

    if (status === 'completed') {
      const user = await User.findById(payout.investorId).session(session);
      
      if (!user) throw new Error("Investor not found");
      
      if (user.investor.totalEarnings < payout.amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient balance. User spent earnings after requesting payout." 
        });
      }

      // Deduct the balance
      user.investor.totalEarnings -= payout.amount;
      await user.save({ session });
    }

    // Update payout document
    payout.status = status;
    payout.processedAt = status === 'completed' ? Date.now() : undefined;
    await payout.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Payout successfully marked as ${status}`,
      data: payout
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};