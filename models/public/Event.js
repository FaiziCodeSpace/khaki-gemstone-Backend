import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true } // optional, but useful to know when event was created/updated
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
