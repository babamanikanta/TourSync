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
    currentSession: {
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
      meetingPoint: {
        lat: Number,
        lng: Number,
      },
    },
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
        meetingPoint: {
          lat: Number,
          lng: Number,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tour", TourSchema);
