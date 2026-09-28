// models/agent/Agent.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const agentSchema = new mongoose.Schema(
  {
    pfp:           { type: String, default: "" },
    fullName:      { type: String, required: true, trim: true },
    cnic:          { type: String, required: true, unique: true, trim: true },
    address:       { type: String, required: true, trim: true },
    officeAddress: { type: String, required: true, trim: true },
    password:      { type: String, required: true, minlength: 6 },
    isActive:      { type: Boolean, default: true },

    status: {
      type:    String,
      enum:    ["online", "busy", "offline"],
      default: "offline",
    },

    // ── AgentHub additions ──
    whatsapp: { type: String, trim: true, default: "" },

    // Real-time location updated by agent app periodically
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Aggregate stats
    totalContracts: { type: Number, default: 0 },

    // Rating: average of all reviews
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

agentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

agentSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

const Agent = mongoose.model("Agent", agentSchema);
export default Agent;