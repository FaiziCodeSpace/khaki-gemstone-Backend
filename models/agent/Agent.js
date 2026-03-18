import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const agentSchema = new mongoose.Schema(
  {
    pfp: { type: String, default: "" },
    fullName: { type: String, required: true, trim: true },
    cnic: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },
    officeAddress: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["online", "busy", "offline"],
      default: "offline",
    },
  },
  { timestamps: true }
);

agentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
agentSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

const Agent = mongoose.model("Agent", agentSchema);
export default Agent;