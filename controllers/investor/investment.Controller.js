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
    const margin = product.profitMargin || 0;

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

    const estimatedProfit = Number((actualCost * (margin / 100)).toFixed(2));
    const totalExpectedReturn = Number((actualCost + estimatedProfit).toFixed(2));
    const invId = `INV-${uuidv4().split("-")[0].toUpperCase()}`;

    const [investment] = await Investment.create(
      [{
        investmentNumber: invId,
        user: userId,
        product: productId,
        investmentAmount: actualCost,
        profitMargin: margin,
        estimatedProfit,        
        totalExpectedReturn,  
        status: 'ACTIVE'
      }],
      { session }
    );

    user.investor.balance -= actualCost;
    user.investor.totalInvestment += actualCost;
    user.investor.productsInvested.push({
      product: productId,
      amountInvested: actualCost,
    });

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