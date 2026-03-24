const mongoose = require("mongoose");

const TourSchema = new mongoose.Schema(
  {
    tourId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    guideName: {
      type: String,
      required: true,
      trim: true,
    },
    guideSocketId: {
      type: String,
      required: true,
    },
    participants: [
      {
        socketId: String,
        name: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    sessions: [
      {
        sessionId: String,
        startTime: Date,
        endTime: Date,
        duration: Number, // in seconds
        status: {
          type: String,
          enum: ["active", "completed", "paused"],
          default: "active",
        },
        remainingTime: Number,
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tour", TourSchema);
