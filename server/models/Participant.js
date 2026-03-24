const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema(
  {
    tourId: {
      type: String,
      required: true,
    },
    socketId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    rejectedAt: Date,
    approvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Participant", ParticipantSchema);
