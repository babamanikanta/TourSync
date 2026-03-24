import { useState, useEffect } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

export default function JoinTour() {
  const [name, setName] = useState("");
  const [tourId, setTourId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const requestJoin = () => {
    setError("");

    if (!tourId.trim()) {
      setError("Please enter a tour ID");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    socket.emit("join-request", { tourId: tourId.toUpperCase(), name });
    setWaiting(true);
  };

  useEffect(() => {
    socket.on("approved", ({ tourId: approvedTourId }) => {
      socket.off("approved");
      socket.off("rejected");
      navigate("/passenger", {
        state: { tourId: approvedTourId, passengerName: name },
      });
    });

    socket.on("rejected", () => {
      setError("❌ Your join request was rejected by the guide");
      setWaiting(false);
    });

    socket.on("error", ({ message }) => {
      setError("Error: " + message);
      setWaiting(false);
    });

    return () => {
      socket.off("approved");
      socket.off("rejected");
      socket.off("error");
    };
  }, [name, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-green-900 mb-2">🎟️ Join Tour</h1>
          <p className="text-gray-600 text-center mb-8 text-sm">Enter the tour ID shared by your guide</p>

          {!waiting ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={waiting}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Tour ID</label>
                <input
                  type="text"
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value.toUpperCase())}
                  placeholder="E.g., ABC123XY"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-center"
                  disabled={waiting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={requestJoin}
                disabled={waiting}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
              >
                📤 Request to Join
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-300 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-400 transition text-sm"
              >
                ← Back Home
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center animate-spin">
                  <div className="w-12 h-12 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-2">Waiting for approval...</p>
              <p className="text-gray-600 text-sm">The tour guide will review and approve your request</p>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                💡 <strong>Tip:</strong> Keep this page open. You'll be notified once the guide approves your request.
              </div>

              <button
                onClick={() => {
                  setWaiting(false);
                  setError("");
                }}
                className="mt-6 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          🔐 Tour IDs are unique and secure. Only authorized passengers can join.
        </p>
      </div>
    </div>
  );
}
