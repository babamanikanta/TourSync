import { useState, useEffect } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

export default function GuideDashboard() {
  const [guideName, setGuideName] = useState("");
  const [tourId, setTourId] = useState("");
  const [created, setCreated] = useState(false);
  const [duration, setDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [meetingPoint, setMeetingPoint] = useState(null);
  const [passengerLocations, setPassengerLocations] = useState({}); // socketId -> payload
  const navigate = useNavigate();

  const createTour = () => {
    if (!guideName.trim()) {
      alert("Please enter your name");
      return;
    }

    socket.emit("create-tour", { guideName });
  };

  const startBreak = () => {
    if (duration <= 0) {
      alert("Duration must be greater than 0");
      return;
    }
    socket.emit("start-break", {
      tourId,
      duration,
    });
    setTimerRunning(true);
  };

  const pauseBreak = () => {
    socket.emit("pause-break", { tourId });
    setTimerRunning(false);
  };

  const resumeBreak = () => {
    socket.emit("resume-break", { tourId });
    setTimerRunning(true);
  };

  const endBreak = () => {
    socket.emit("end-break", { tourId });
    setTimerRunning(false);
    setTimeLeft(null);
  };

  const modifyTime = (seconds) => {
    socket.emit("modify-time", { tourId, change: seconds });
  };

  const approvePassenger = (socketId) => {
    socket.emit("approve-passenger", { tourId, passengerSocketId: socketId });
  };

  const approveAllPassengers = () => {
    socket.emit("approve-all-passengers", { tourId });
  };

  const rejectPassenger = (socketId) => {
    socket.emit("reject-passenger", { tourId, passengerSocketId: socketId });
  };

  useEffect(() => {
    socket.on("tour-created", ({ tourId: newTourId }) => {
      setTourId(newTourId);
      setCreated(true);
    });

    socket.on("join-requests-update", ({ participants: updatedParticipants }) => {
      const pending = updatedParticipants.filter((p) => p.status === "pending");
      const approved = updatedParticipants.filter((p) => p.status === "approved");
      setPendingRequests(pending);
      setParticipants(approved);
    });

    socket.on("timer-update", ({ remainingTime }) => {
      setTimeLeft(remainingTime);
    });

    socket.on("break-started", ({ duration }) => {
      setTimeLeft(duration);
      setTimerRunning(true);
    });

    socket.on("break-ended", () => {
      setTimeLeft(null);
      setTimerRunning(false);
      alert("✅ Break session completed!");
    });

    socket.on("break-paused", () => {
      setTimerRunning(false);
    });

    socket.on("break-resumed", () => {
      setTimerRunning(true);
    });

    // Receive live passenger location updates (detailed for guide)
    socket.on("passenger-location-update", (payload) => {
      setPassengerLocations((prev) => ({ ...prev, [payload.socketId]: payload }));
    });

    // brief updates to room (optional) - keep summary
    socket.on("passenger-location-brief", (brief) => {
      setPassengerLocations((prev) => {
        const existing = prev[brief.socketId] || {};
        return {
          ...prev,
          [brief.socketId]: {
            socketId: brief.socketId,
            name: brief.name,
            distanceMeters: brief.distanceMeters,
            distanceKm: brief.distanceKm,
            statusLabel: brief.statusLabel,
            timestamp: existing.timestamp || new Date(),
          },
        };
      });
    });

    // Clear transient locations when sharing stops
    socket.on("stop-location-sharing", () => {
      setPassengerLocations({});
    });

    socket.on("error", ({ message }) => {
      alert("Error: " + message);
    });

    return () => {
      socket.off("tour-created");
      socket.off("join-requests-update");
      socket.off("timer-update");
      socket.off("break-started");
      socket.off("break-ended");
      socket.off("break-paused");
      socket.off("break-resumed");
      socket.off("error");
      socket.off("passenger-location-update");
      socket.off("passenger-location-brief");
      socket.off("stop-location-sharing");
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const setMeetingPointFromGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMeetingPoint({ lat, lng });
        socket.emit("set-meeting-point", { tourId, lat, lng });
      },
      (err) => {
        console.error("Unable to fetch location:", err);
        alert("Unable to fetch your location. Please allow location access.");
      },
      { enableHighAccuracy: true }
    );
  };

  const clearMeetingPoint = () => {
    setMeetingPoint(null);
    // setting null on server isn't implemented — meeting point is just unset locally for the guide
  };

  const liveLocationsList = Object.values(passengerLocations).sort((a, b) => {
    const da = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const db = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
      >
        ← Back Home
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-indigo-900 mb-8">🎯 Guide Dashboard</h1>

        {!created ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Create Your Tour</h2>
            <div className="mb-6">
              <input
                type="text"
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={createTour}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Create Tour
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tour ID Display */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm uppercase tracking-wide">Your Tour ID</p>
                <div className="text-3xl font-mono font-bold bg-indigo-100 text-indigo-800 px-6 py-4 rounded-lg mt-2 select-all">
                  {tourId}
                </div>
                <p className="text-gray-500 text-sm mt-2">Share this ID with passengers to join</p>
              </div>
            </div>

            {/* Pending Join Requests */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Join Requests ({pendingRequests.length})</h3>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending requests</p>
              ) : (
                <>
                  <div className="mb-3 text-right">
                    <button
                      onClick={approveAllPassengers}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                    >
                      ✅ Approve All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.socketId}
                        className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                      >
                        <span className="font-medium text-gray-800">{req.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approvePassenger(req.socketId)}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => rejectPassenger(req.socketId)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-medium"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Approved Participants */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">✅ Participants ({participants.length})</h3>
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No approved participants yet</p>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div key={p.socketId} className="flex items-center bg-green-50 border border-green-200 rounded-lg p-3">
                      <span className="font-medium text-gray-800">👤 {p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Break Session Control */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">⏱️ Break Session</h3>

              {timeLeft === null ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={startBreak}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    ▶️ Start Break
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Time Remaining</p>
                    <div className="text-5xl font-bold text-indigo-600 font-mono">{formatTime(timeLeft)}</div>
                  </div>

                  <div className="flex gap-3">
                    {!timerRunning ? (
                      <button
                        onClick={resumeBreak}
                        className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
                      >
                        ▶️ Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseBreak}
                        className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition"
                      >
                        ⏸️ Pause
                      </button>
                    )}
                    <button
                      onClick={endBreak}
                      className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
                    >
                      ⏹️ End Break
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => modifyTime(300)}
                      className="flex-1 px-3 py-2 bg-blue-300 text-white rounded hover:bg-blue-400 transition text-sm font-medium"
                    >
                      +5 min
                    </button>
                    <button
                      onClick={() => modifyTime(600)}
                      className="flex-1 px-3 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition text-sm font-medium"
                    >
                      +10 min
                    </button>
                    <button
                      onClick={() => modifyTime(-120)}
                      className="flex-1 px-3 py-2 bg-red-300 text-white rounded hover:bg-red-400 transition text-sm font-medium"
                    >
                      -2 min
                    </button>
                    <button
                      onClick={() => modifyTime(-300)}
                      className="flex-1 px-3 py-2 bg-red-400 text-white rounded hover:bg-red-500 transition text-sm font-medium"
                    >
                      -5 min
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Meeting Point & Live Locations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📍 Meeting Point & Live Locations</h3>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={setMeetingPointFromGeolocation}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  📌 Set Meeting Point (My Location)
                </button>
                <button
                  onClick={clearMeetingPoint}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  ✖ Clear
                </button>
                <div className="ml-auto text-sm text-gray-600 self-center">
                  {meetingPoint ? `Meeting: ${meetingPoint.lat.toFixed(5)}, ${meetingPoint.lng.toFixed(5)}` : 'No meeting point set'}
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-600 mb-2">Live passenger locations (transient, in-memory only)</h4>
                {liveLocationsList.length === 0 ? (
                  <p className="text-gray-500">No live locations yet. Passengers can share location during the break.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {liveLocationsList.map((pl) => (
                      <div key={pl.socketId} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div>
                          <div className="font-medium text-gray-800">{pl.name || 'Passenger'}</div>
                          <div className="text-sm text-gray-600">{pl.timestamp ? new Date(pl.timestamp).toLocaleTimeString() : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-700">{pl.distanceMeters != null ? `${pl.distanceMeters} m` : '—'}</div>
                          <div className="text-sm text-gray-600">{pl.statusLabel || ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
