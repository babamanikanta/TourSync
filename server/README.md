# Tour Sync - Server

Backend server for the Tour Sync real-time tour coordination application.

## 🚀 Setup

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
npm install
```

### Environment Configuration

Ensure MongoDB is accessible at `mongodb://localhost:27017/tour-sync`

To use MongoDB Atlas:
```javascript
// Update connection string in index.js
mongoose.connect("mongodb+srv://username:password@cluster.mongodb.net/tour-sync")
```

### Running the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📡 Architecture

### Technologies
- **Express.js**: REST API framework
- **Socket.IO**: Real-time bidirectional communication
- **Mongoose**: MongoDB ODM
- **CORS**: Cross-Origin Resource Sharing

### Real-Time Features
- Instant tour creation
- Live participant join requests
- Synchronized countdown timers
- Real-time session status updates
- Automatic cleanup on disconnect

## 🗄️ Database Models

### Tour Model
- Tracks all tour sessions
- Stores participant history
- Maintains session timeline

### Participant Model
- Tracks individual participant records
- Records approval/rejection status
- Stores join timestamps

## 🔌 Socket.IO Rooms

Tours are organized into Socket.IO rooms mapped to Tour IDs:
- Guide joins room on tour creation
- Participants join room on approval
- All updates scoped to room (automatic isolation)

## 📊 Data Flow

```
1. Guide creates tour
   ↓
2. Tour stored in MongoDB + Socket.IO room created
   ↓
3. Passenger requests join
   ↓
4. Join request stored + broadcast to guide
   ↓
5. Guide approves passenger
   ↓
6. Passenger receives approval + joins Socket.IO room
   ↓
7. Guide starts break session
   ↓
8. All users in room receive synchronized timer updates every 1s
```

## 🔒 Security Considerations

- Tour IDs are unique identifiers
- Socket.IO rooms prevent cross-tour communication
- Guide identity verified through Socket ID
- Automatic participant cleanup on disconnect
- MongoDB records all tour activities

## 📈 Scalability Notes

**Current Implementation:**
- In-memory state for active timers
- Suitable for development and small-scale deployments
- Timers reset on server restart

**Production Improvements:**
- Redis for distributed timer state
- WebSocket clusters with sticky sessions
- Load balancing across multiple instances
- Database indexing on tourId and socketId

## 🐛 Debugging

### Enable Detailed Logging

```javascript
// In index.js - add after socket connection
io.on("connection", (socket) => {
  console.log("📤 New connection:", socket.id);
  socket.on("*", (event) => {
    console.log("📨 Event:", event);
  });
});
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# View MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

## 📦 Dependencies

- `express` - Web framework
- `socket.io` - Real-time communication
- `mongoose` - MongoDB connection
- `cors` - Cross-origin support
- `uuid` - Unique ID generation
- `nodemon` (dev) - Auto-reload on file changes

## 🧪 Testing Events

### Create Tour
```javascript
socket.emit("create-tour", { guideName: "John Guide" });
```

### Join Request
```javascript
socket.emit("join-request", { tourId: "ABC123XY", name: "Alice" });
```

### Start Break
```javascript
socket.emit("start-break", { tourId: "ABC123XY", duration: 5 });
```

### Modify Time
```javascript
socket.emit("modify-time", { tourId: "ABC123XY", change: 300 }); // +5 min
```

## 📝 API Endpoints

```
GET /api/tours/:tourId
GET /api/tours/:tourId/participants
GET /api/tours/:tourId/pending-requests
```

## 🚀 Deployment

### Heroku
```bash
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to MongoDB" | Ensure MongoDB is running: `mongod` |
| "CORS errors" | Check frontend origin in Socket.IO config |
| "Timer not syncing" | Verify participants are in same Socket.IO room |
| "Server won't start" | Check port 5000 is not in use: `lsof -i :5000` |

## 🤝 Contributing

Follow existing code style and test Socket.IO events thoroughly.

---

**Part of Tour Sync - Real-time Tour Coordination System**
