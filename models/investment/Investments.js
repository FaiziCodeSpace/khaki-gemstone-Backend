import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
    {
        investmentNumber: {
            type: String,
            unique: true,
            index: true,
            required: true
        },

        investor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        profitMargin: {
            type: Number,
            required: true,
            min: 0
        },

        expectedReturn: {
            type: Number
        },

        earnedAmount: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["ACTIVE", "COMPLETED", "RETURN"],
            default: "ACTIVE",
            index: true
        },

        investedAt: {
            type: Date,
            default: Date.now
        },

        completedAt: Date
    },
    {
        timestamps: true
    }
);

investmentSchema.pre("save", function (next) {
    if (!this.expectedReturn) {
        this.expectedReturn =
            this.amount + (this.amount * this.profitMargin) / 100;
    }
    next();
});

const Investment = mongoose.models.Investment || mongoose.model("Investment", investmentSchema);
export default Investment;
