import mongoose from "mongoose";

const investorSchema = new mongoose.Schema(
  {
    investorId: {
      type: String,
      unique: true,
      default: () => `INV-${Math.floor(10000 + Math.random() * 90000)}`
    },
    phone: String,
    cnic: String,
    city: String,
    address: String,
    dob: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    status: {
      type: String,
      enum: ["not_applied", "pending", "approved", "rejected"],
      default: "not_applied",
    },
    appliedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    balance: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    productsInvested: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        amountInvested: Number,
        investedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    isInvestor: { type: Boolean, default: false },
    investor: investorSchema,
    isActive: { type: Boolean, default: true },
    lastInvestorVisitAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
