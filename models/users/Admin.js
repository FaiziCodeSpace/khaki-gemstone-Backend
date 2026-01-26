import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      unique: true
    },

    city: {
      type: String,
      required: true,
      index: true
    },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN"],
      default: "ADMIN",
      index: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

/* Hash password */
adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

/* Ensure only one SUPER_ADMIN */
adminSchema.pre("save", async function () {
  if (this.role === "SUPER_ADMIN") {
    const existingSuperAdmin = await mongoose.models.Admin.findOne({
      role: "SUPER_ADMIN"
    });

    if (existingSuperAdmin && !existingSuperAdmin._id.equals(this._id)) {
      throw new Error("Only one Super Admin is allowed");
    }
  }
});

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
