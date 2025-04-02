const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.du8ko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");

    const userCollection = client.db("vidbuddydb").collection("users");

    // Create a new user
    app.post("/users", async (req, res) => {
      try {
        const userInfo = req.body;
        userInfo.online = false;
        userInfo.createdAt = new Date();
        const result = await userCollection.insertOne(userInfo);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).send({ error: "Failed to insert user" });
      }
    });

    // Get all users
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).send({ error: "Failed to retrieve users" });
      }
    });

 
    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Track active users
      socket.on("user-login", async (email) => {
        try {
          await userCollection.updateOne(
            { email },
            { $set: { online: true, socketId: socket.id } }
          );
          const users = await userCollection.find().toArray();
          io.emit("users-updated", users);
        } catch (error) {
          console.error("Error updating user status on login:", error);
        }
      });

      socket.on("disconnect", async () => {
        try {
          await userCollection.updateOne(
            { socketId: socket.id },
            { $set: { online: false, socketId: null } }
          );
          const users = await userCollection.find().toArray();
          io.emit("users-updated", users);
          console.log(`User disconnected: ${socket.id}`);
        } catch (error) {
          console.error("Error updating user status on disconnect:", error);
        }
      });

      // Video call signaling
      socket.on("join-call", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", socket.id);
        console.log(`User ${socket.id} joined call room: ${roomId}`);
      });

      socket.on("offer", (data) => {
        socket.to(data.roomId).emit("offer", {
          offer: data.offer,
          from: socket.id,
        });
      });

      socket.on("answer", (data) => {
        socket.to(data.roomId).emit("answer", {
          answer: data.answer,
          from: socket.id,
        });
      });

      socket.on("ice-candidate", (data) => {
        socket.to(data.roomId).emit("ice-candidate", {
          candidate: data.candidate,
          from: socket.id,
        });
      });

      socket.on("end-call", (roomId) => {
        socket.to(roomId).emit("call-ended");
        socket.leave(roomId);
        console.log(`User ${socket.id} ended call in room: ${roomId}`);
      });
    });

  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

run().catch(console.dir);

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing MongoDB connection');
  await client.close();
  process.exit(0);
});

app.get("/", (req, res) => {
  res.send("Video server is running");
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});