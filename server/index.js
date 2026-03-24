const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// In-memory storage
const tours = {};
const participants = {};
// Transient location data per tour (not persisted)
const participantsLocations = {};

console.log("📌 Running in IN-MEMORY mode (no MongoDB)");

io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  // ✅ GUIDE creates a tour
  socket.on("create-tour", ({ guideName }) => {
    try {
      const tourId = uuidv4().slice(0, 8).toUpperCase();

      // Create tour in memory
      tours[tourId] = {
        tourId,
        guideName,
        guideSocketId: socket.id,
        participants: [],
        sessions: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      socket.join(tourId);
      socket.emit("tour-created", { tourId, message: `Tour ${tourId} created successfully` });
      console.log(`✅ Tour created: ${tourId} by guide: ${guideName}`);
    } catch (error) {
      console.error("Error creating tour:", error);
      socket.emit("error", { message: "Failed to create tour" });
    }
  });

  // ✅ Passenger requests to join
  socket.on("join-request", ({ tourId, name }) => {
    try {
      const tour = tours[tourId];
      if (!tour) {
        socket.emit("error", { message: "Tour not found" });
        return;
      }

      // Store participant in memory
      const participant = {
        socketId: socket.id,
        name,
        tourId,
        status: "pending",
        joinedAt: new Date(),
      };

      if (!participants[tourId]) {
        participants[tourId] = [];
      }
      participants[tourId].push(participant);

      // Add to tour's participant list
      tour.participants.push({
        socketId: socket.id,
        name,
        status: "pending",
      });

      // Notify guide about join request
      io.to(tour.guideSocketId).emit("join-requests-update", {
        tourId,
        participants: tour.participants,
      });

      console.log(`📢 Join request from ${name} for tour ${tourId}`);
    } catch (error) {
      console.error("Error processing join request:", error);
      socket.emit("error", { message: "Failed to process join request" });
    }
  });

  // ✅ Guide approves passenger
  socket.on("approve-passenger", ({ tourId, passengerSocketId }) => {
    try {
      const tour = tours[tourId];
      if (!tour) return;

      // Update in-memory storage
      const passenger = tour.participants.find((p) => p.socketId === passengerSocketId);
      if (passenger) passenger.status = "approved";

      // Join passenger to tour room
      io.to(passengerSocketId).emit("approved", { tourId });

      // Notify all clients in tour room
      io.to(tourId).emit("join-requests-update", {
        tourId,
        participants: tour.participants,
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
  socket.on("reject-passenger", ({ tourId, passengerSocketId }) => {
    try {
      const tour = tours[tourId];
      if (!tour) return;

      // Remove from in-memory storage
      tour.participants = tour.participants.filter((p) => p.socketId !== passengerSocketId);

      // Notify passenger
      io.to(passengerSocketId).emit("rejected", { tourId });

      // Update guide's request list
      io.to(tour.guideSocketId).emit("join-requests-update", {
        tourId,
        participants: tour.participants,
      });

      console.log(`❌ Passenger ${passengerSocketId} rejected for tour ${tourId}`);
    } catch (error) {
      console.error("Error rejecting passenger:", error);
    }
  });

  // 🔥 START BREAK SESSION (GUIDE ONLY)
  socket.on("start-break", ({ tourId, duration }) => {
    try {
      const tour = tours[tourId];
      if (!tour) return;

      const sessionId = uuidv4();
      const startTime = new Date();

      // Create session in-memory
      tour.currentSession = {
        sessionId,
        startTime,
        duration: duration * 60, // convert to seconds
        remainingTime: duration * 60,
        status: "active",
      };

      tour.timerRunning = true;
      tour.breakEnded = false;

      // Add to sessions history
      tour.sessions.push(tour.currentSession);

      // Broadcast to all users in tour room
      io.to(tourId).emit("break-started", {
        tourId,
        sessionId,
        duration: duration * 60,
        remainingTime: duration * 60,
      });

      // initialize transient locations map for this tour
      participantsLocations[tourId] = {};

      // Start countdown timer
      tour.interval = setInterval(() => {
        tour.currentSession.remainingTime--;

        // Broadcast timer update
        io.to(tourId).emit("timer-update", {
          remainingTime: tour.currentSession.remainingTime,
          sessionId,
        });

        // When break ends
        if (tour.currentSession.remainingTime <= 0) {
          clearInterval(tour.interval);
          tour.timerRunning = false;
          tour.breakEnded = true;
          tour.currentSession.status = "completed";
          tour.currentSession.endTime = new Date();

          // notify clients that break ended and stop location sharing
          io.to(tourId).emit("break-ended", { sessionId });
          io.to(tourId).emit("stop-location-sharing", { sessionId });
          // clear transient location data for this tour
          if (participantsLocations[tourId]) delete participantsLocations[tourId];
        }
      }, 1000);

      console.log(`⏱️ Break started for tour ${tourId} - Duration: ${duration} minutes`);
    } catch (error) {
      console.error("Error starting break:", error);
      socket.emit("error", { message: "Failed to start break" });
    }
  });

  // Guide sets meeting point (latitude, longitude) during break
  socket.on("set-meeting-point", ({ tourId, lat, lng }) => {
    try {
      const tour = tours[tourId];
      if (!tour || !tour.currentSession) return;

      tour.currentSession.meetingPoint = { lat, lng };

      // Notify all participants of meeting point (no storage beyond memory)
      io.to(tourId).emit("meeting-point-set", { lat, lng });
      console.log(`📍 Meeting point set for tour ${tourId}: (${lat}, ${lng})`);
    } catch (error) {
      console.error("Error setting meeting point:", error);
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
  socket.on("share-location", ({ tourId, lat, lng, name }) => {
    try {
      const tour = tours[tourId];
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

  // ⏫ / ⏬ MODIFY TIME
  socket.on("modify-time", ({ tourId, change }) => {
    try {
      const tour = tours[tourId];
      if (!tour || !tour.timerRunning || !tour.currentSession) return;

      tour.currentSession.remainingTime += change;
      if (tour.currentSession.remainingTime < 0) tour.currentSession.remainingTime = 0;

      // Broadcast updated time
      io.to(tourId).emit("timer-update", {
        remainingTime: tour.currentSession.remainingTime,
        sessionId: tour.currentSession.sessionId,
      });

      console.log(`⏱️ Time modified for tour ${tourId} - Change: ${change}s`);
    } catch (error) {
      console.error("Error modifying time:", error);
    }
  });

  // ❌ PAUSE BREAK SESSION
  socket.on("pause-break", ({ tourId }) => {
    try {
      const tour = tours[tourId];
      if (!tour || !tour.timerRunning) return;

      clearInterval(tour.interval);
      tour.timerRunning = false;

      // Update session status
      if (tour.currentSession) {
        tour.currentSession.status = "paused";
      }

      io.to(tourId).emit("break-paused", { sessionId: tour.currentSession?.sessionId });
      console.log(`⏸️ Break paused for tour ${tourId}`);
    } catch (error) {
      console.error("Error pausing break:", error);
    }
  });

  // ▶️ RESUME BREAK SESSION
  socket.on("resume-break", ({ tourId }) => {
    try {
      const tour = tours[tourId];
      if (!tour || tour.timerRunning || !tour.currentSession) return;

      tour.timerRunning = true;
      tour.currentSession.status = "active";

      // Resume countdown
      tour.interval = setInterval(() => {
        tour.currentSession.remainingTime--;

        io.to(tourId).emit("timer-update", {
          remainingTime: tour.currentSession.remainingTime,
          sessionId: tour.currentSession.sessionId,
        });

        if (tour.currentSession.remainingTime <= 0) {
          clearInterval(tour.interval);
          tour.timerRunning = false;
          tour.breakEnded = true;
          tour.currentSession.status = "completed";
          tour.currentSession.endTime = new Date();

          // notify clients and clear transient location data
          io.to(tourId).emit("break-ended", { sessionId: tour.currentSession.sessionId });
          io.to(tourId).emit("stop-location-sharing", { sessionId: tour.currentSession.sessionId });
          if (participantsLocations[tourId]) delete participantsLocations[tourId];
        }
      }, 1000);

      io.to(tourId).emit("break-resumed", { sessionId: tour.currentSession.sessionId });
      console.log(`▶️ Break resumed for tour ${tourId}`);
    } catch (error) {
      console.error("Error resuming break:", error);
    }
  });

  // ❌ END BREAK (CONFIRMATION FROM GUIDE)
  socket.on("end-break", ({ tourId }) => {
    try {
      const tour = tours[tourId];
      if (!tour) return;

      clearInterval(tour.interval);
      tour.timerRunning = false;
      tour.breakEnded = true;

      // Update session
      if (tour.currentSession) {
        tour.currentSession.status = "completed";
        tour.currentSession.endTime = new Date();
      }

      io.to(tourId).emit("break-ended", { sessionId: tour.currentSession?.sessionId });
        io.to(tourId).emit("stop-location-sharing", { sessionId: tour.currentSession?.sessionId });
        if (participantsLocations[tourId]) delete participantsLocations[tourId];
      console.log(`✅ Break ended for tour ${tourId}`);
    } catch (error) {
      console.error("Error ending break:", error);
    }
  });

  // ✅ PASSENGER JOINS LIVE VIEW
  socket.on("join-passenger-view", ({ tourId, name }) => {
    try {
      const tour = tours[tourId];
      if (!tour) {
        socket.emit("error", { message: "Tour not found" });
        return;
      }

      // Join the passenger's socket to the tour room
      socket.join(tourId);

      // Update participant status to verified
      const passenger = tour.participants.find((p) => p.socketId === socket.id);
      if (passenger) {
        passenger.status = "approved";
      }

      // Send current session state to the passenger
      if (tour.currentSession && tour.currentSession.remainingTime > 0) {
        socket.emit("timer-update", {
          remainingTime: tour.currentSession.remainingTime,
          sessionId: tour.currentSession.sessionId,
        });

        if (tour.timerRunning) {
          socket.emit("break-started", {
            tourId,
            sessionId: tour.currentSession.sessionId,
            duration: tour.currentSession.duration,
            remainingTime: tour.currentSession.remainingTime,
          });
        }
      }

      // Notify all users that participant joined
      io.to(tourId).emit("join-requests-update", {
        tourId,
        participants: tour.participants,
      });

      console.log(`✅ Passenger ${name} (${socket.id}) joined live view for tour ${tourId}`);
    } catch (error) {
      console.error("Error joining passenger view:", error);
      socket.emit("error", { message: "Failed to join tour" });
    }
  });

  // 📊 GET TOUR DETAILS (For passenger to verify tour status)
  socket.on("get-tour-details", ({ tourId }, callback) => {
    try {
      const tour = tours[tourId];
      if (tour) {
        callback({ success: true, tour });
      } else {
        callback({ success: false, message: "Tour not found" });
      }
    } catch (error) {
      console.error("Error fetching tour details:", error);
      callback({ success: false, message: "Error fetching tour" });
    }
  });

  // 📊 GET ALL PARTICIPANTS FOR TOUR
  socket.on("get-participants", ({ tourId }, callback) => {
    try {
      const tour = tours[tourId];
      if (tour) {
        const approvedParticipants = tour.participants.filter((p) => p.status === "approved");
        callback({ success: true, participants: approvedParticipants });
      } else {
        callback({ success: false, message: "Tour not found" });
      }
    } catch (error) {
      callback({ success: false, message: "Error fetching participants" });
    }
  });

  // 🚪 DISCONNECT CLEANUP
  socket.on("disconnect", () => {
    console.log("👤 User disconnected:", socket.id);

    // Clean up participant from tour
    for (const tourId in tours) {
      const tour = tours[tourId];
      if (tour.guideSocketId === socket.id) {
        // Guide disconnected - end the tour
        tour.status = "completed";
        delete tours[tourId];
        io.to(tourId).emit("guide-disconnected", { message: "Tour guide has left" });
        console.log(`🔴 Guide disconnected from tour ${tourId}`);
      } else {
        // Participant disconnected
        tour.participants = tour.participants.filter((p) => p.socketId !== socket.id);
      }
    }
  });
});

// 🌐 REST ENDPOINTS

// Get tour by ID
app.get("/api/tours/:tourId", (req, res) => {
  try {
    const tour = tours[req.params.tourId];
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all participants for a tour
app.get("/api/tours/:tourId/participants", (req, res) => {
  try {
    const tour = tours[req.params.tourId];
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour.participants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending join requests for a guide
app.get("/api/tours/:tourId/pending-requests", (req, res) => {
  try {
    const tour = tours[req.params.tourId];
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    const pending = tour.participants.filter((p) => p.status === "pending");
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tours (for debugging)
app.get("/api/tours", (req, res) => {
  try {
    const tourList = Object.values(tours).map((tour) => ({
      tourId: tour.tourId,
      guideName: tour.guideName,
      participantCount: tour.participants.length,
      status: tour.status,
      createdAt: tour.createdAt,
    }));
    res.json(tourList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  console.log("💾 Using IN-MEMORY storage (development mode)");
  console.log("🔌 Socket.IO enabled for real-time communication");
});
