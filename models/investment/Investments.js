import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema({
    investmentNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        unique: true
    },

    investmentAmount: {
        type: Number,
        required: true,
        min: 1
    },

    profitMargin: {
        type: Number,
        required: true
    },

    estimatedProfit: { type: Number, required: true },
    totalExpectedReturn: { type: Number, required: true },
    sharingPercentage: {
        type: Number, 
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

investmentSchema.index({ product: 1 }, { unique: true });

const Investment = mongoose.models.Investment || mongoose.model("Investment", investmentSchema);
export default Investment;