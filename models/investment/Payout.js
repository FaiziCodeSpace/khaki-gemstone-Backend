import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: [
      'bank', 'sadapay', 'nayapay', 'easypaisa', 
      'jazzcash', 'upaisa', 'keenu', 'finja'
    ]
  },
  accountDetails: {
    accountHolderName: {
      type: String,
      required: true,
      trim: true
    },
    iban: {
      type: String,
      required: function() { return this.method === 'bank'; },
      uppercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: function() { return this.method !== 'bank'; },
      trim: true
    }
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Payout amount must be greater than zero']
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  processedAt: {
    type: Date
  }
}, { 
  timestamps: true
});

payoutSchema.index({ status: 1, createdAt: -1 });

const Payout = mongoose.model('Payout', payoutSchema);

export default Payout;