import mongoose from 'mongoose';
import User from '../../models/users/User.js';
import Product from '../../models/common/Products.js';
import Investment from '../../models/investment/Investments.js';
import { v4 as uuidv4 } from 'uuid';
import Order from '../../models/common/Orders.js';

export const investInProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const product = await Product.findById(productId).session(session);
    if (!product || product.portal !== "INVESTOR" || product.status !== "Available") {
      throw new Error("Product is no longer available for investment");
    }

    const actualCost = product.price;
    const marginPercent = product.profitMargin || 0;
    const sharingPercent = product.profitSharingModel || 0;

    const user = await User.findById(userId).session(session);
    if (!user || !user.isInvestor || user.investor.status !== "approved") {
      throw new Error("Investor account is not approved or active");
    }

    if (user.investor.balance < actualCost) {
      throw new Error(`Insufficient balance.`);
    }

    // Atomic check for existing investment
    const existingInvestment = await Investment.findOne({ product: productId, status: 'ACTIVE' }).session(session);
    if (existingInvestment) throw new Error("Product already invested");

    const totalMarkup = actualCost * (marginPercent / 100);
    const estimatedProfit = Number(((totalMarkup * sharingPercent) / 100).toFixed(2));
    const totalExpectedReturn = Number((actualCost + estimatedProfit).toFixed(2));

    const invId = `INV-${uuidv4().split("-")[0].toUpperCase()}`;

    const [investment] = await Investment.create(
      [{
        investmentNumber: invId,
        user: userId,
        product: productId,
        investmentAmount: actualCost,
        profitMargin: marginPercent,
        sharingPercentage: sharingPercent,
        estimatedProfit,
        totalExpectedReturn,
        status: 'ACTIVE'
      }],
      { session }
    );

    // ATOMIC UPDATE: Use $inc and $push instead of manual calculation
    await User.findByIdAndUpdate(userId, {
      $inc: {
        "investor.balance": -actualCost,
        "investor.totalInvestment": actualCost // Incrementing total active capital
      },
      $push: {
        "investor.productsInvested": {
          product: productId,
          amountInvested: actualCost,
        }
      }
    }, { session });

    product.status = "For Sale";
    product.portal = "PUBLIC BY INVESTED";
    await product.save({ session });

    await session.commitTransaction();
    return res.status(201).json(investment);

  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

export const refundInvestment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { investmentId } = req.params;
    const userId = req.user._id;

    const investment = await Investment.findById(investmentId).session(session);
    if (!investment) throw new Error("Investment record not found");
    if (investment.status !== 'ACTIVE') throw new Error("Only active investments can be refunded");

    const activeOrder = await Order.findOne({
      "items.product": investment.product,
      status: { $in: ["PENDING", "PAID", "DISPATCHED"] }
    }).session(session);

    if (activeOrder) throw new Error("Cannot refund. Product is currently in an active order.");

    await User.findByIdAndUpdate(userId, {
      $inc: {
        "investor.balance": investment.investmentAmount,
        "investor.totalInvestment": -investment.investmentAmount
      },
      $pull: { "investor.productsInvested": { product: investment.product } }
    }, { session });

    // 3. Reset Product to original state
    await Product.findByIdAndUpdate(investment.product, {
      status: "Available",
      portal: "INVESTOR"
    }, { session });

    // 4. Remove the investment record
    await Investment.findByIdAndDelete(investmentId).session(session);

    await session.commitTransaction();
    return res.status(200).json({ success: true, message: "Investment refunded to balance" });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

export const getInvestorInvestments = async (req, res) => {
  try {
    const userId = req.user._id;

    const investments = await Investment.find({ user: userId })
      .populate("product")
      .sort({ createdAt: -1 });

    if (!investments || investments.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(investments);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching investments", error: error.message });
  }
};

export const getInvestorPersonalMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const stats = await Investment.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId), 
          status: { $in: ["ACTIVE", "COMPLETED"] } 
        } 
      },
      {
        $group: {
          _id: null,
          activeCount: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
          totalPrincipalDeployed: { $sum: "$investmentAmount" }
        }
      }
    ]);

    const investmentData = stats[0] || { activeCount: 0, totalPrincipalDeployed: 0 };

    // Use the new stored pureProfit field
    const pureProfit = user.investor?.pureProfit || 0;
    const totalEarnings = user.investor?.totalEarnings || 0; 
    const activeInvestment = user.investor?.totalInvestment || 0;

    // 3. Trend: (Actual Profit / Everything ever spent)
    // This now shows real growth (e.g., 10%) rather than payout ratio (e.g., 110%)
    const trendValue = investmentData.totalPrincipalDeployed > 0
      ? (pureProfit / investmentData.totalPrincipalDeployed) * 100
      : 0;
      res.status(200).json({
      success: true,
      data: {
        firstName: user.firstName,
        totalBalance: user.investor?.balance || 0,
        yourProducts: investmentData.activeCount,
        totalInvestment: activeInvestment,
        pureProfit: pureProfit,
        profitFromSold: totalEarnings, 
        trend: `${trendValue >= 0 ? '+' : ''}${trendValue.toFixed(0)}%`
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};