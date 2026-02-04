import mongoose from 'mongoose';
import User from '../../models/users/User.js';
import Product from '../../models/common/Products.js';
import Investment from '../../models/investment/Investments.js';
import { v4 as uuidv4 } from 'uuid';

export const investInProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const product = await Product.findById(productId).session(session);
        if (!product) throw new Error("Product not found");

        if (product.portal !== "INVESTOR" || product.status !== "Available") {
            throw new Error("Product is no longer available for investment");
        }

        const actualCost = product.price;
        const marginPercent = product.profitMargin || 0;
        const sharingPercent = product.profitSharingModel || 0;

        if (!actualCost || actualCost <= 0) {
            throw new Error("Invalid product price configuration");
        }

        const user = await User.findById(userId).session(session);
        if (!user || !user.isInvestor || user.investor.status !== "approved") {
            throw new Error("Investor account is not approved or active");
        }

        if (user.investor.balance < actualCost) {
            throw new Error(`Insufficient balance. Required: ${actualCost}, Available: ${user.investor.balance}`);
        }

        const existingInvestment = await Investment.findOne({ product: productId }).session(session);
        if (existingInvestment || product.status === "PUBLIC BY INVESTED") {
            throw new Error("This product has just been taken by another investor");
        }

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

        user.investor.balance -= actualCost;
        user.investor.productsInvested.push({
            product: productId,
            amountInvested: actualCost,
        });

        user.investor.totalInvestment = user.investor.productsInvested.reduce(
            (sum, item) => sum + item.amountInvested, 0
        );

        await user.save({ session });

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
        if (investment.user.toString() !== userId.toString()) throw new Error("Unauthorized");
        if (investment.status !== 'ACTIVE') throw new Error("Investment is not in an active state");

        // 7-day time check
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        const timeElapsed = Date.now() - new Date(investment.createdAt).getTime();

        if (timeElapsed < oneWeekInMs) {
            const hoursLeft = Math.ceil((oneWeekInMs - timeElapsed) / (1000 * 60 * 60));
            throw new Error(`Refunds are only available after 7 days. Please wait ${hoursLeft} more hours.`);
        }

        const product = await Product.findById(investment.product).session(session);
        if (!product) throw new Error("Product record no longer exists");
        if (product.status === "Sold") {
            throw new Error("Gemstone already sold. Refund impossible.");
        }

        const user = await User.findById(userId).session(session);
        const refundAmount = investment.investmentAmount;
        user.investor.balance += refundAmount;
        user.investor.productsInvested = user.investor.productsInvested.filter(
            (item) => item.product.toString() !== investment.product.toString()
        );
        user.investor.totalInvestment = user.investor.productsInvested.reduce(
            (sum, item) => sum + item.amountInvested, 0
        );
        await user.save({ session });
        product.status = "Available";
        product.portal = "INVESTOR";
        await product.save({ session });
        await Investment.deleteOne({ _id: investmentId }).session(session);
        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            message: "Investment deleted and funds returned to balance.",
            refundedAmount: refundAmount
        });

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
    // 1. Get User ID from Token (decoded in auth middleware)
    const userId = req.user.id;

    // 2. Fetch the User document for profile info
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3. Aggregate Investment data for 'Sold' profit
    const investmentStats = await Investment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalInvested: { $sum: "$investmentAmount" }
              }
            }
          ],
          realized: [
            { $match: { "productDetails.status": "Sold" } },
            {
              $group: {
                _id: null,
                profitFromSold: { $sum: "$estimatedProfit" }
              }
            }
          ]
        }
      }
    ]);

    const overall = investmentStats[0].overall[0] || { totalProducts: 0, totalInvested: 0 };
    const realized = investmentStats[0].realized[0] || { profitFromSold: 0 };

    // Calculate trend: (Realized Profit / Total Investment) * 100
    const trendPercentage = overall.totalInvested > 0
      ? ((realized.profitFromSold / overall.totalInvested) * 100).toFixed(0)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        // From User Model
        firstName: user.firstName,
        totalBalance: user.investor?.balance || 0,

        // From Aggregation
        yourProducts: overall.totalProducts,
        totalInvestment: overall.totalInvested,
        profitFromSold: realized.profitFromSold,
        trend: `+${trendPercentage}%`
      }
    });
  } catch (error) {
    console.error("Investor Metrics Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};