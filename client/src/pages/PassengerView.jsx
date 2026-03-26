import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import { useNavigate, useLocation } from "react-router-dom";

export default function PassengerView() {
  const [tourId, setTourId] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [breakActive, setBreakActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [tourStatus, setTourStatus] = useState("active");
  const [sessionStatus, setSessionStatus] = useState("waiting"); // waiting, active, completed, paused
  const [guideInfo, setGuideInfo] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const watchIdRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get tourId and passenger name from navigation state
    if (location.state?.tourId && location.state?.passengerName) {
      const tId = location.state.tourId;
      const pName = location.state.passengerName;
      setTourId(tId);
      setPassengerName(pName);

      console.log("📍 Passenger View: Joining tour room", tId);

      // Emit join event to join the Socket.IO room
      socket.emit("join-passenger-view", {
        tourId: tId,
        name: pName,
      });
    } else {
      // No state - redirect to join page
      navigate("/join");
    }

    // Timer updates
    socket.on("timer-update", ({ remainingTime, sessionId }) => {
      console.log("⏱️ Timer update:", remainingTime);
      setTimeLeft(remainingTime);
      setBreakActive(remainingTime > 0);
    });

    // Break events
    socket.on("break-started", ({ duration, sessionId }) => {
      console.log("🔴 Break started:", duration);
      setTimeLeft(duration);
      setBreakActive(true);
      setSessionStatus("active");
    });

    socket.on("break-ended", ({ sessionId }) => {
      console.log("✅ Break ended");
      setTimeLeft(null);
      setBreakActive(false);
      setSessionStatus("completed");
    });

    socket.on("break-paused", ({ sessionId }) => {
      console.log("⏸️ Break paused");
      setBreakActive(false);
      setSessionStatus("paused");
    });

    socket.on("break-resumed", ({ sessionId }) => {
      console.log("▶️ Break resumed");
      setBreakActive(true);
      setSessionStatus("active");
    });

    // Participant list updates
    socket.on("join-requests-update", ({ participants: updatedParticipants }) => {
      const approved = updatedParticipants.filter((p) => p.status === "approved");
      setParticipants(approved);
    });

    // Tour status
    socket.on("tour-status", ({ status, guideName }) => {
      setTourStatus(status);
      setGuideInfo({ guideName });
    });

    socket.on("guide-disconnected", ({ message }) => {
      alert("⚠️ " + message);
      navigate("/");
    });

    socket.on("rejected", () => {
      alert("❌ Your join request was rejected");
      navigate("/join");
    });

    socket.on("error", ({ message }) => {
      alert("Error: " + message);
    });

    // Stop location sharing when server tells clients to stop
    socket.on("stop-location-sharing", () => {
      stopSharing();
    });

    return () => {
      socket.off("timer-update");
      socket.off("break-started");
      socket.off("break-ended");
      socket.off("break-paused");
      socket.off("break-resumed");
      socket.off("join-requests-update");
      socket.off("tour-status");
      socket.off("guide-disconnected");
      socket.off("rejected");
      socket.off("error");
      socket.off("stop-location-sharing");
    };
  }, [navigate, location]);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (!breakActive) return "text-gray-400";
    if (timeLeft > 300) return "text-green-600"; // > 5 min
    if (timeLeft > 60) return "text-yellow-600"; // > 1 min
    return "text-red-600"; // <= 1 min
  };

  const getSessionStatusBadge = () => {
    const statusConfig = {
      waiting: { bg: "bg-gray-100", text: "text-gray-800", label: "⏳ Waiting for break..." },
      active: { bg: "bg-green-100", text: "text-green-800", label: "🔴 Break In Progress" },
      paused: { bg: "bg-yellow-100", text: "text-yellow-800", label: "⏸️ Break Paused" },
      completed: { bg: "bg-blue-100", text: "text-blue-800", label: "✅ Break Completed" },
    };
    const config = statusConfig[sessionStatus];
    return config;
  };

  const statusBadge = getSessionStatusBadge();

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    if (isSharing) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        socket.emit("share-location", {
          tourId,
          lat,
          lng,
          name: passengerName,
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    watchIdRef.current = watchId;
    setIsSharing(true);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch (e) {
        // ignore
      }
      watchIdRef.current = null;
    }
    setIsSharing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
      >
        ← Leave Tour
      </button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-purple-900 mb-8">👥 Passenger View</h1>

        {/* Tour Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-gray-600 text-sm uppercase tracking-wide">Your Name</p>
              <p className="text-2xl font-bold text-purple-700">{passengerName}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm uppercase tracking-wide">Tour ID</p>
              <p className="text-2xl font-bold text-purple-700 font-mono">{tourId}</p>
            </div>
          </div>
        </div>

        {/* Location Sharing Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📍 Passenger Location (optional)</h3>
          <p className="text-sm text-gray-600 mb-3">Share your live location during the break so the guide can see how far you are from the meeting point. No location is stored permanently.</p>
          <div className="flex gap-3">
            {!isSharing ? (
              <button
                onClick={startSharing}
                disabled={!breakActive}
                className={`px-4 py-2 rounded-lg text-white ${breakActive ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                📡 Share My Location
              </button>
            ) : (
              <button
                onClick={stopSharing}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                ✖ Stop Sharing
              </button>
            )}
            <div className="flex-1 text-sm text-gray-500 self-center">
              {isSharing ? 'Sharing live location…' : 'Location sharing is optional and privacy-friendly.'}
            </div>
          </div>
        </div>

        {/* Session Status */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${statusBadge.bg}`}>
          <div className="text-center">
            <p className={`text-lg font-semibold ${statusBadge.text}`}>{statusBadge.label}</p>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="bg-gradient-to-b from-purple-600 to-purple-800 rounded-lg shadow-xl p-12 mb-6 text-center">
          <p className="text-white text-sm uppercase tracking-widest opacity-90 mb-4">
            {breakActive ? "⏱️ Break Time Remaining" : "⏳ Waiting for Break to Start"}
          </p>
          <div className={`text-7xl font-bold font-mono mb-4 ${getTimerColor()}`}>
            {formatTime(timeLeft)}
          </div>
          {breakActive && (
            <div className="flex justify-center gap-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-white text-sm">Live countdown synchronized with other passengers</p>
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">👥 Participants ({participants.length})</h3>
          {participants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Waiting for participants to join...</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participants.map((p, idx) => (
                <div key={p.socketId} className="flex items-center bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full text-sm font-bold mr-3">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800">{p.name}</span>
                  {p.socketId === socket.id && (
                    <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded">You</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tour Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">ℹ️ Tour Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Tour Status:</span>
              <span className={`font-semibold ${tourStatus === "active" ? "text-green-600" : "text-gray-600"}`}>
                {tourStatus === "active" ? "🟢 Active" : "⏹️ Ended"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Guide:</span>
              <span className="font-semibold text-gray-800">{guideInfo?.guideName || "Loading..."}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-900 text-sm">
            💡 <strong>Tip:</strong> Stay on this page to receive real-time break timer updates. The countdown is synchronized across all passengers.
          </p>
        </div>
      </div>
    </div>
  );
}
