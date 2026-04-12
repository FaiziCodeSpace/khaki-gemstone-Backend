// models/bargainer/Bargainer.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const bargainerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone:    { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    city:     { type: String, trim: true, default: "" },
    pfp:      { type: String, default: "" }, 

    // Admin approval flow
    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectedReason: { type: String, default: "" },

    isActive: { type: Boolean, default: false }, // true only after approval
  },
  { timestamps: true }
);

bargainerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
});

bargainerSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

const Bargainer = mongoose.model("Bargainer", bargainerSchema);
export default Bargainer;