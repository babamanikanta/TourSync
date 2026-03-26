const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const mongoose = require("mongoose");

const Tour = require("./models/Tour");
const Participant = require("./models/Participant");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory storage
const inMemoryTours = {};
const inMemoryParticipants = {};

let USE_DB = false;

async function startServer() {
  try {
    if (process.env.USE_DATABASE === "true") {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connected");
        USE_DB = true;
      } catch (dbErr) {
        console.warn("⚠️ MongoDB connection failed, falling back to in-memory storage");
        console.warn("Error:", dbErr.message);
        USE_DB = false;
      }
    } else {
      console.log("⚠️ USE_DATABASE is not enabled; running in in-memory mode");
      USE_DB = false;
    }

    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);
      console.log("🔌 Socket.IO enabled for real-time communication");
      console.log(`💾 Storage mode: ${USE_DB ? "MongoDB" : "In-Memory"}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
}

startServer();

// Transient location data per tour (not persisted)
const participantsLocations = {};
// Store active timer intervals by tourId
const activeTimers = {};

// Database abstraction helpers
async function createTour(tourData) {
  if (USE_DB) {
    const tour = new Tour(tourData);
    return await tour.save();
  } else {
    const tour = { _id: tourData.tourId, ...tourData };
    inMemoryTours[tourData.tourId] = tour;
    return tour;
  }
}

async function findTourById(tourId) {
  if (USE_DB) {
    return await Tour.findOne({ tourId });
  } else {
    return inMemoryTours[tourId];
  }
}

async function saveTour(tour) {
  if (USE_DB) {
    return await tour.save();
  } else {
    inMemoryTours[tour.tourId] = tour;
    return tour;
  }
}

async function createParticipant(participantData) {
  if (USE_DB) {
    const participant = new Participant(participantData);
    return await participant.save();
  } else {
    const participantId = uuidv4();
    const participant = { _id: participantId, ...participantData };
    inMemoryParticipants[participantId] = participant;
    return participant;
  }
}

async function findParticipantsByTourId(tourId) {
  if (USE_DB) {
    return await Participant.find({ tourId });
  } else {
    return Object.values(inMemoryParticipants).filter(p => p.tourId === tourId);
  }
}

async function updateParticipantStatus(socketId, tourId, status) {
  if (USE_DB) {
    return await Participant.findOneAndUpdate(
      { socketId, tourId },
      { status }
    );
  } else {
    const participant = Object.values(inMemoryParticipants).find(p => p.socketId === socketId && p.tourId === tourId);
    if (participant) {
      participant.status = status;
    }
    return participant;
  }
}

async function deleteParticipant(socketId, tourId) {
  if (USE_DB) {
    return await Participant.findOneAndDelete({ socketId, tourId });
  } else {
    const keys = Object.keys(inMemoryParticipants);
    for (const key of keys) {
      const p = inMemoryParticipants[key];
      if (p.socketId === socketId && p.tourId === tourId) {
        delete inMemoryParticipants[key];
        return p;
      }
    }
  }
}

async function updateManyParticipants(filter, update) {
  if (USE_DB) {
    return await Participant.updateMany(filter, update);
  } else {
    const updated = [];
    Object.values(inMemoryParticipants).forEach(p => {
      if (p.tourId === filter.tourId && p.status === filter.status) {
        p.status = update.status;
        updated.push(p);
      }
    });
    return { modifiedCount: updated.length };
  }
}

async function findParticipantBySocketId(socketId) {
  if (USE_DB) {
    return await Participant.findOne({ socketId });
  } else {
    return Object.values(inMemoryParticipants).find(p => p.socketId === socketId);
  }
}


io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  // ✅ GUIDE creates a tour
  socket.on("create-tour", async ({ guideName }) => {
    try {
      const tourId = uuidv4().slice(0, 8).toUpperCase();

      const newTour = await createTour({
        tourId,
        guideName,
        guideSocketId: socket.id,
        status: "active",
        sessions: [],
        currentSession: null,
      });

      socket.join(tourId);
      socket.emit("tour-created", { tourId, message: `Tour ${tourId} created successfully` });
      console.log(`✅ Tour created: ${tourId} by guide: ${guideName}`);
    } catch (error) {
      console.error("Error creating tour:", error);
      socket.emit("error", { message: "Failed to create tour" });
    }
  });

  // ✅ Passenger requests to join
  socket.on("join-request", async ({ tourId, name }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) {
        socket.emit("error", { message: "Tour not found" });
        return;
      }

      // Store participant
      await createParticipant({
        socketId: socket.id,
        name,
        tourId,
        status: "pending",
      });

      // Fetch all participants for the tour
      const tourParticipants = await findParticipantsByTourId(tourId);

      // Notify guide about join request
      io.to(tour.guideSocketId).emit("join-requests-update", {
        tourId,
        participants: tourParticipants.map(p => ({ socketId: p.socketId, name: p.name, status: p.status })),
      });

      console.log(`📢 Join request from ${name} for tour ${tourId}`);
    } catch (error) {
      console.error("Error processing join request:", error);
      socket.emit("error", { message: "Failed to process join request" });
    }
  });

  // ✅ Guide approves passenger
  socket.on("approve-passenger", async ({ tourId, passengerSocketId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) return;

      // Update participant status
      await updateParticipantStatus(passengerSocketId, tourId, "approved");

      // Fetch updated participants
      const updatedParticipants = await findParticipantsByTourId(tourId);

      // Join passenger to tour room
      io.to(passengerSocketId).emit("approved", { tourId });

      // Notify all clients in tour room
      io.to(tourId).emit("join-requests-update", {
        tourId,
        participants: updatedParticipants.map(p => ({ socketId: p.socketId, name: p.name, status: p.status })),
      });

      // Send remaining time if break is running
      if (tour.currentSession && tour.currentSession.remainingTime > 0) {
        io.to(passengerSocketId).emit("timer-update", {
          remainingTime: tour.currentSession.remainingTime,
          sessionId: tour.currentSession.sessionId,
        });
      }

      console.log(`✅ Passenger ${passengerSocketId} approved for tour ${tourId}`);
    } catch (error) {
      console.error("Error approving passenger:", error);
      socket.emit("error", { message: "Failed to approve passenger" });
    }
  });

  // ✅ Guide rejects passenger
  socket.on("reject-passenger", async ({ tourId, passengerSocketId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) return;

      // Remove from DB
      await deleteParticipant(passengerSocketId, tourId);

      // Fetch updated participants
      const updatedParticipants = await findParticipantsByTourId(tourId);

      // Notify passenger
      io.to(passengerSocketId).emit("rejected", { tourId });

      // Update guide's request list
      io.to(tour.guideSocketId).emit("join-requests-update", {
        tourId,
        participants: updatedParticipants.map(p => ({ socketId: p.socketId, name: p.name, status: p.status })),
      });

      console.log(`❌ Passenger ${passengerSocketId} rejected for tour ${tourId}`);
    } catch (error) {
      console.error("Error rejecting passenger:", error);
    }
  });

  // ✅ APPROVE ALL PENDING PASSENGERS
  socket.on("approve-all-passengers", async ({ tourId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) return;

      const pendingPassengers = (await findParticipantsByTourId(tourId)).filter(p => p.status === "pending");
      if (pendingPassengers.length === 0) return;

      if (USE_DB) {
        await updateManyParticipants({ tourId, status: "pending" }, { status: "approved" });
      } else {
        Object.values(inMemoryParticipants).forEach(p => {
          if (p.tourId === tourId && p.status === "pending") {
            p.status = "approved";
          }
        });
      }

      // Notify each approved passenger directly
      pendingPassengers.forEach((p) => {
        io.to(p.socketId).emit("approved", { tourId });
      });

      const updatedParticipants = await findParticipantsByTourId(tourId);
      io.to(tourId).emit("join-requests-update", {
        tourId,
        participants: updatedParticipants.map((p) => ({ socketId: p.socketId, name: p.name, status: p.status })),
      });

      console.log(`✅ All pending passengers approved for tour ${tourId}`);
    } catch (error) {
      console.error("Error approving all passengers:", error);
      socket.emit("error", { message: "Failed to approve all passengers" });
    }
  });

  // 🔥 START BREAK SESSION (GUIDE ONLY)
  socket.on("start-break", async ({ tourId, duration }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) return;

      if ((tour.currentSession && tour.currentSession.status === "active") ||
          (activeTimers[tourId] && activeTimers[tourId].status === "active")) {
        socket.emit("error", { message: "A break is already active" });
        return;
      }

      const sessionId = uuidv4();
      const startTime = new Date();
      const initialRemainingTime = duration * 60;

      const session = {
        sessionId,
        startTime,
        duration: initialRemainingTime,
        remainingTime: initialRemainingTime,
        status: "active",
      };

      tour.currentSession = session;
      if (!tour.sessions) tour.sessions = [];
      tour.sessions.push(session);
      tour.status = "active";
      await saveTour(tour);

      io.to(tourId).emit("break-started", {
        tourId,
        sessionId,
        duration: initialRemainingTime,
        remainingTime: initialRemainingTime,
      });

      participantsLocations[tourId] = {};

      // clear any existing interval if running
      if (activeTimers[tourId] && activeTimers[tourId].intervalId) {
        clearInterval(activeTimers[tourId].intervalId);
      }

      activeTimers[tourId] = {
        sessionId,
        remainingTime: initialRemainingTime,
        status: "active",
        intervalId: null,
      };

      const interval = setInterval(async () => {
        const timerState = activeTimers[tourId];
        if (!timerState || timerState.status !== "active") return;

        timerState.remainingTime = Math.max(0, timerState.remainingTime - 1);

        // CRITICAL: Sync to tour.currentSession for consistency in other handlers
        const syncTour = await findTourById(tourId);
        if (syncTour && syncTour.currentSession && syncTour.currentSession.sessionId === sessionId) {
          syncTour.currentSession.remainingTime = timerState.remainingTime;
        }

        io.to(tourId).emit("timer-update", {
          remainingTime: timerState.remainingTime,
          sessionId,
        });

        if (timerState.remainingTime <= 0) {
          clearInterval(interval);
          delete activeTimers[tourId];

          const endedTour = await findTourById(tourId);
          if (endedTour && endedTour.currentSession && endedTour.currentSession.sessionId === sessionId) {
            endedTour.currentSession.status = "completed";
            endedTour.currentSession.remainingTime = 0;
            endedTour.currentSession.endTime = new Date();
            await saveTour(endedTour);
          }

          io.to(tourId).emit("break-ended", { sessionId });
          io.to(tourId).emit("stop-location-sharing", { sessionId });
          if (participantsLocations[tourId]) delete participantsLocations[tourId];
        }
      }, 1000);

      activeTimers[tourId].intervalId = interval;

      console.log(`⏱️ Break started for tour ${tourId} - Duration: ${duration} minutes`);
    } catch (error) {
      console.error("Error starting break:", error);
      socket.emit("error", { message: "Failed to start break" });
    }
  });

  // ⏫ / ⏬ MODIFY TIME (works during active or paused state)
  socket.on("modify-time", async ({ tourId, change }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour || !tour.currentSession || tour.currentSession.status === "completed") return;

      const sessionId = tour.currentSession.sessionId;
      
      // Use activeTimers.remainingTime as source of truth while running
      let currentTime = tour.currentSession.remainingTime;
      if (activeTimers[tourId] && activeTimers[tourId].status === "active") {
        currentTime = activeTimers[tourId].remainingTime;
      }
      
      let updatedTime = currentTime + change;
      updatedTime = Math.max(0, updatedTime);

      // Update both sources
      if (activeTimers[tourId]) {
        activeTimers[tourId].remainingTime = updatedTime;
      }
      tour.currentSession.remainingTime = updatedTime;
      await saveTour(tour);

      io.to(tourId).emit("timer-update", {
        remainingTime: updatedTime,
        sessionId,
      });

      console.log(`⏱️ Time modified for tour ${tourId} - Change: ${change}s → ${updatedTime}s`);
    } catch (error) {
      console.error("Error modifying time:", error);
    }
  });

  // ❌ PAUSE BREAK SESSION
  socket.on("pause-break", async ({ tourId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour || !tour.currentSession || tour.currentSession.status !== "active") return;

      if (activeTimers[tourId] && activeTimers[tourId].intervalId) {
        clearInterval(activeTimers[tourId].intervalId);
        tour.currentSession.remainingTime = activeTimers[tourId].remainingTime;
      }

      if (activeTimers[tourId]) {
        activeTimers[tourId].status = "paused";
      }

      tour.currentSession.status = "paused";
      await saveTour(tour);

      io.to(tourId).emit("break-paused", { sessionId: tour.currentSession.sessionId });
      console.log(`⏸️ Break paused for tour ${tourId} at ${tour.currentSession.remainingTime}s`);
    } catch (error) {
      console.error("Error pausing break:", error);
    }
  });

  // ▶️ RESUME BREAK SESSION
  socket.on("resume-break", async ({ tourId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour || !tour.currentSession || tour.currentSession.status !== "paused") return;

      const sessionId = tour.currentSession.sessionId;
      let timerState = activeTimers[tourId];
      if (!timerState) {
        timerState = {
          sessionId,
          remainingTime: tour.currentSession.remainingTime,
          status: "active",
          intervalId: null,
        };
      }

      timerState.status = "active";
      timerState.remainingTime = tour.currentSession.remainingTime;

      tour.currentSession.status = "active";
      await saveTour(tour);

      if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
      }

      const interval = setInterval(async () => {
        const currentTimer = activeTimers[tourId];
        if (!currentTimer || currentTimer.status !== "active") return;

        currentTimer.remainingTime = Math.max(0, currentTimer.remainingTime - 1);

        io.to(tourId).emit("timer-update", {
          remainingTime: currentTimer.remainingTime,
          sessionId,
        });

        if (currentTimer.remainingTime <= 0) {
          clearInterval(interval);
          delete activeTimers[tourId];

          const endedTour = await findTourById(tourId);
          if (endedTour && endedTour.currentSession && endedTour.currentSession.sessionId === sessionId) {
            endedTour.currentSession.status = "completed";
            endedTour.currentSession.remainingTime = 0;
            endedTour.currentSession.endTime = new Date();
            await saveTour(endedTour);
          }

          io.to(tourId).emit("break-ended", { sessionId });
          io.to(tourId).emit("stop-location-sharing", { sessionId });
          if (participantsLocations[tourId]) delete participantsLocations[tourId];
        }
      }, 1000);

      timerState.intervalId = interval;
      activeTimers[tourId] = timerState;

      io.to(tourId).emit("break-resumed", { sessionId });
      console.log(`▶️ Break resumed for tour ${tourId}`);
    } catch (error) {
      console.error("Error resuming break:", error);
    }
  });

  // ❌ END BREAK (CONFIRMATION FROM GUIDE)
  socket.on("end-break", async ({ tourId }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) return;

      if (activeTimers[tourId] && activeTimers[tourId].intervalId) {
        clearInterval(activeTimers[tourId].intervalId);
      }
      delete activeTimers[tourId];

      if (tour.currentSession) {
        tour.currentSession.status = "completed";
        tour.currentSession.remainingTime = 0;
        tour.currentSession.endTime = new Date();
        await saveTour(tour);
      }

      io.to(tourId).emit("break-ended", { sessionId: tour.currentSession?.sessionId });
      io.to(tourId).emit("stop-location-sharing", { sessionId: tour.currentSession?.sessionId });
      if (participantsLocations[tourId]) delete participantsLocations[tourId];
      console.log(`✅ Break ended for tour ${tourId}`);
    } catch (error) {
      console.error("Error ending break:", error);
    }
  });

  // ✅ SET MEETING POINT (GUIDE ONLY)
  socket.on("set-meeting-point", async ({ tourId, lat, lng }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour || !tour.currentSession) return;

      tour.currentSession.meetingPoint = { lat, lng };
      await saveTour(tour);

      io.to(tourId).emit("meeting-point-set", { lat, lng });
      console.log(`📍 Meeting point set for tour ${tourId}: (${lat}, ${lng})`);
    } catch (error) {
      console.error("Error setting meeting point:", error);
      socket.emit("error", { message: "Failed to set meeting point" });
    }
  });

  // ✅ PASSENGER JOINS LIVE VIEW
  socket.on("join-passenger-view", async ({ tourId, name }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour) {
        socket.emit("error", { message: "Tour not found" });
        return;
      }

      socket.join(tourId);

      await updateParticipantStatus(socket.id, tourId, "approved");

      if (tour.currentSession) {
        socket.emit("timer-update", {
          remainingTime: tour.currentSession.remainingTime,
          sessionId: tour.currentSession.sessionId,
        });

        if (tour.currentSession.status === "active") {
          socket.emit("break-started", {
            tourId,
            sessionId: tour.currentSession.sessionId,
            duration: tour.currentSession.duration,
            remainingTime: tour.currentSession.remainingTime,
          });
        }
      }

      const updatedParticipants = await findParticipantsByTourId(tourId);
      io.to(tourId).emit("join-requests-update", {
        tourId,
        participants: updatedParticipants.map((p) => ({ socketId: p.socketId, name: p.name, status: p.status })),
      });

      console.log(`✅ Passenger ${name} (${socket.id}) joined live view for tour ${tourId}`);
    } catch (error) {
      console.error("Error joining passenger view:", error);
      socket.emit("error", { message: "Failed to join tour" });
    }
  });
  // Haversine formula to compute distance in meters
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // PASSENGER SHARES LIVE LOCATION
  socket.on("share-location", async ({ tourId, lat, lng, name }) => {
    try {
      const tour = await findTourById(tourId);
      if (!tour || !tour.currentSession || tour.currentSession.status !== "active") return;

      const meeting = tour.currentSession.meetingPoint;
      if (!meeting) {
        // meeting point not set yet; still accept location but mark distance unknown
        const payload = {
          socketId: socket.id,
          name,
          lat,
          lng,
          distanceMeters: null,
          distanceKm: null,
          statusLabel: "Unknown",
          timestamp: new Date(),
        };

        participantsLocations[tourId][socket.id] = payload;
        io.to(tour.guideSocketId).emit("passenger-location-update", payload);
        return;
      }

      const dist = haversineDistance(meeting.lat, meeting.lng, lat, lng);
      const distMeters = Math.round(dist);
      const distKm = +(dist / 1000).toFixed(3);

      // Status thresholds (adjustable)
      let statusLabel = "Far";
      if (distMeters <= 50) statusLabel = "Near";
      else if (distMeters <= 200) statusLabel = "Might be late";

      const payload = {
        socketId: socket.id,
        name,
        lat,
        lng,
        distanceMeters: distMeters,
        distanceKm: distKm,
        statusLabel,
        timestamp: new Date(),
      };

      // keep only transient in-memory
      participantsLocations[tourId][socket.id] = payload;

      // Emit update to guide dashboard and to the tour room for optional display
      io.to(tour.guideSocketId).emit("passenger-location-update", payload);
      io.to(tourId).emit("passenger-location-brief", {
        socketId: socket.id,
        name,
        distanceMeters: distMeters,
        distanceKm: distKm,
        statusLabel,
      });
    } catch (error) {
      console.error("Error sharing location:", error);
    }
  });

  // 🚪 DISCONNECT CLEANUP
  socket.on("disconnect", async () => {
    console.log("👤 User disconnected:", socket.id);

    try {
      // Find if this socket is a guide
      let guideTour = Object.values(inMemoryTours).find(t => t.guideSocketId === socket.id);
      
      if (!guideTour && USE_DB) {
        try {
          guideTour = await Tour.findOne({ guideSocketId: socket.id });
        } catch (e) {
          // Ignore DB errors
        }
      }

      if (guideTour) {
        // Clear any active timer for this tour
        if (activeTimers[guideTour.tourId] && activeTimers[guideTour.tourId].intervalId) {
          clearInterval(activeTimers[guideTour.tourId].intervalId);
          delete activeTimers[guideTour.tourId];
        }

        // Guide disconnected, end tour
        guideTour.status = "completed";
        await saveTour(guideTour);
        io.to(guideTour.tourId).emit("guide-disconnected", { message: "Tour guide has left" });
        console.log(`🔴 Guide disconnected from tour ${guideTour.tourId}`);
      } else {
        // Participant disconnected, remove from DB
        const participantToRemove = await findParticipantBySocketId(socket.id);
        if (participantToRemove) {
          await deleteParticipant(socket.id, participantToRemove.tourId);
        }
      }
    } catch (error) {
      console.error("Error on disconnect:", error);
    }
  });
});

// 🌐 REST ENDPOINTS

// Get tour by ID
app.get("/api/tours/:tourId", async (req, res) => {
  try {
    const tour = await findTourById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all participants for a tour
app.get("/api/tours/:tourId/participants", async (req, res) => {
  try {
    const participants = await findParticipantsByTourId(req.params.tourId);
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending join requests for a guide
app.get("/api/tours/:tourId/pending-requests", async (req, res) => {
  try {
    const participants = (await findParticipantsByTourId(req.params.tourId)).filter(p => p.status === "pending");
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tours (for debugging)
app.get("/api/tours", async (req, res) => {
  try {
    let tourList = [];
    if (USE_DB) {
      const dbTours = await Tour.find({});
      tourList = dbTours.map((tour) => ({
        tourId: tour.tourId,
        guideName: tour.guideName,
        status: tour.status,
        createdAt: tour.createdAt,
      }));
    } else {
      tourList = Object.values(inMemoryTours).map((tour) => ({
        tourId: tour.tourId,
        guideName: tour.guideName,
        status: tour.status,
      }));
    }
    res.json(tourList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Note: server.listen is handled in startServer() to keep DB connection and port config in one place.

