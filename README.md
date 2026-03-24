# Tour Sync 🎯

A real-time tour group coordination web application that helps tour guides manage on-ground tourist groups efficiently during active trips. Tour guides create tours and approve/reject participant requests, while passengers receive live synchronized countdown timers for break sessions.

## 🎯 Project Overview

**Tour Sync** is a full-stack real-time application built with:
- **Frontend**: React + Tailwind CSS (Mobile-first UI)
- **Backend**: Node.js + Express + Socket.IO (Real-time communication)
- **Database**: MongoDB (Persistent storage)

### Core Features

#### 🎯 For Tour Guides
- ✅ Create tours with a unique Tour ID (auto-generated)
- ✅ Receive and manage participant join requests in real-time
- ✅ Approve or reject participants
- ✅ Create, start, pause, resume, and end multiple break sessions
- ✅ Modify session duration on-the-fly (+/- minutes)
- ✅ View all approved participants
- ✅ Real-time participant list updates

#### 👥 For Passengers
- ✅ Join tours using shared Tour ID
- ✅ Wait for guide approval
- ✅ View live synchronized countdown timer during breaks
- ✅ See real-time participant list
- ✅ Receive instant session status updates (waiting, active, paused, completed)
- ✅ Auto-syncing timer across all connected devices

#### 🔌 Real-Time Features (Socket.IO)
- ✅ Instant participant approval/rejection notifications
- ✅ Live countdown timer synchronized across all users
- ✅ Real-time participant list updates
- ✅ Session status broadcasting (active, paused, completed)
- ✅ Break pause/resume with timer preservation
- ✅ Guide disconnect detection and cleanup
- ✅ Secure Socket.IO rooms mapped to Tour IDs

#### 💾 Data Persistence (MongoDB)
- ✅ Tour records with full session history
- ✅ Participant tracking (pending, approved, rejected)
- ✅ Session logs with timestamps
- ✅ Tour history and analytics ready

## 📁 Project Structure

```
Tour_Sync/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Landing page (Create/Join options)
│   │   │   ├── GuideDashboard.jsx   # Guide control panel
│   │   │   ├── JoinTour.jsx         # Passenger join form
│   │   │   └── PassengerView.jsx    # Live countdown view
│   │   ├── App.jsx                  # Router setup
│   │   ├── socket.js                # Socket.IO client config
│   │   ├── App.css                  # Global styles
│   │   ├── index.css                # Tailwind setup
│   │   └── main.jsx                 # Entry point
│   ├── public/                      # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── server/                          # Node.js Backend
    ├── models/
    │   ├── Tour.js                  # Tour schema
    │   └── Participant.js           # Participant schema
    ├── index.js                     # Main server file
    ├── package.json
    └── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (running locally or Atlas)
- npm or yarn

### Backend Setup

```bash
cd server

# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

Server runs on `http://localhost:5000`

**Required Environment:**
- MongoDB must be running on `mongodb://localhost:27017`

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📡 Socket.IO Events Reference

### Guide Events (Emit)
| Event | Payload | Description |
|-------|---------|-------------|
| `create-tour` | `{guideName}` | Create new tour |
| `start-break` | `{tourId, duration}` | Start break session (duration in minutes) |
| `pause-break` | `{tourId}` | Pause active break |
| `resume-break` | `{tourId}` | Resume paused break |
| `end-break` | `{tourId}` | End break session |
| `modify-time` | `{tourId, change}` | Add/subtract time (change in seconds) |
| `approve-passenger` | `{tourId, passengerSocketId}` | Approve join request |
| `reject-passenger` | `{tourId, passengerSocketId}` | Reject join request |

### Guide Events (Receive)
| Event | Payload | Description |
|-------|---------|-------------|
| `tour-created` | `{tourId}` | Tour created successfully |
| `join-requests-update` | `{tourId, participants[]}` | Pending requests updated |
| `timer-update` | `{remainingTime, sessionId}` | Timer tick |
| `break-started` | `{tourId, duration, sessionId}` | Break started |
| `break-ended` | `{sessionId}` | Break completed |
| `break-paused` | `{sessionId}` | Break paused |
| `break-resumed` | `{sessionId}` | Break resumed |

### Passenger Events (Emit)
| Event | Payload | Description |
|-------|---------|-------------|
| `join-request` | `{tourId, name}` | Request to join tour |
| `join-passenger-view` | `{tourId, name}` | Enter passenger view |
| `get-participants` | `{tourId}` | Fetch approved participants |
| `get-tour-details` | `{tourId}` | Fetch tour information |

### Passenger Events (Receive)
| Event | Payload | Description |
|-------|---------|-------------|
| `approved` | `{tourId}` | Join request approved |
| `rejected` | `{}` | Join request rejected |
| `timer-update` | `{remainingTime, sessionId}` | Live timer update |
| `break-started` | `{duration, sessionId}` | Break session started |
| `break-ended` | `{sessionId}` | Break session ended |
| `break-paused` | `{sessionId}` | Break paused (timer preserved) |
| `break-resumed` | `{sessionId}` | Break resumed |
| `join-requests-update` | `{participants[]}` | Participant list updated |
| `guide-disconnected` | `{message}` | Guide left the tour |

## 🗄️ MongoDB Schemas

### Tour Schema
```javascript
{
  tourId: String (unique),
  guideName: String,
  guideSocketId: String,
  participants: [{
    socketId: String,
    name: String,
    status: "pending" | "approved" | "rejected",
    joinedAt: Date
  }],
  sessions: [{
    sessionId: String,
    startTime: Date,
    endTime: Date,
    duration: Number (seconds),
    status: "active" | "completed" | "paused",
    remainingTime: Number
  }],
  status: "active" | "completed" | "paused",
  createdAt: Date,
  updatedAt: Date
}
```

### Participant Schema
```javascript
{
  tourId: String,
  socketId: String,
  name: String,
  status: "pending" | "approved" | "rejected",
  joinedAt: Date,
  rejectedAt: Date,
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

- ✅ Socket.IO rooms scoped to Tour IDs (prevents cross-tour communication)
- ✅ Tour ID verification before participant operations
- ✅ Guide identity verification through Socket ID
- ✅ CORS configured for local development
- ✅ Automatic cleanup on guide disconnect

## 🎨 UI/UX Highlights

### Guide Dashboard
- Clean tour ID display for sharing
- Real-time participant request queue
- Visual status indicators (pending, approved)
- Large countdown timer with color indicators
- Quick-access time modification buttons (+/- 2/5/10 min)
- Pause/Resume/End controls during breaks

### Passenger Join Page
- Intuitive Tour ID input field
- Real-time approval waiting state
- Visual feedback (loading spinner, instructions)
- Error messages for rejections or invalid IDs

### Passenger Live View
- Large synchronized countdown timer
- Live participant list
- Session status badges
- Tour information display
- Real-time synchronization indicator

## 📊 API Endpoints

### REST Endpoints
```
GET /api/tours/:tourId
  - Fetch tour details

GET /api/tours/:tourId/participants
  - Get all approved participants

GET /api/tours/:tourId/pending-requests
  - Get pending join requests for guide
```

## 🚀 Future Enhancements

- 📊 **Polls & Surveys**: Real-time voting during tours
- 🚨 **Emergency Alerts**: Broadcast urgent messages to all passengers
- 📸 **Media Sharing**: Share photos/documents with tour group
- 🗺️ **Location Tracking**: Live location sharing (optional)
- 📱 **Mobile App**: Native React Native version
- 🔐 **Authentication**: User login and tour history
- 📈 **Analytics Dashboard**: Tour statistics and insights
- 🌍 **Multi-language Support**: i18n for international tours

## 🛠️ Development Tips

### Running Locally
1. Start MongoDB: `mongod`
2. Start backend: `cd server && npm run dev`
3. Start frontend: `cd client && npm run dev`
4. Open two browser windows: one for guide, one for passenger

### Testing Real-Time Features
- Use browser DevTools to throttle network (simulate slow connection)
- Test multiple passengers by opening multiple browser windows/incognito tabs
- Check Socket.IO rooms in server logs

### Debugging Socket.IO
- Enable Socket.IO debug logs:
  ```javascript
  // In client socket.js
  socket.io.engine.on("packet", (packet) => console.log(packet));
  ```

## 📝 License

This project is part of the Shreyians Frontend learning curriculum.

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ for seamless tour coordination**
