import mongoose from "mongoose";

const taxonomySchema = new mongoose.Schema(
  {
    taxonomy: {
      type: String,
      required: true,
      enum: ["Event", "Filter", "Categories"],
    },
    Filters: {
      type: [String],
      validate: {
        validator: function (v) {
          return this.taxonomy !== "Filter" || (Array.isArray(v) && v.length > 0);
        },
        message: "Filters cannot be empty when taxonomy is 'Filter'.",
      },
    },
    Categories: {
      type: [String],
      validate: {
        validator: function (v) {
          return this.taxonomy !== "Categories" || (Array.isArray(v) && v.length > 0);
        },
        message: "Categories cannot be empty when taxonomy is 'Categories'.",
      },
    },
    subject: {
      type: String,
      required: function () { return this.taxonomy === "Event"; },
      trim: true,
    },
    description: {
      type: String,
      required: function () { return this.taxonomy === "Event"; },
      trim: true,
    },
  },
  { timestamps: true }
);

const Taxonomy = mongoose.model("Taxonomy", taxonomySchema);
export default Taxonomy;