const express = require("express");

const app = express();

const cors = require("cors");

require("dotenv").config();

const port = process.env.PORT || 5000;

// middleware

app.use(cors());

app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.du8ko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect(); // Ensure the client stays connected

    const userCollection = client.db("vidbuddydb").collection("users");

    // Create a new user
    app.post("/users", async (req, res) => {
      try {
        const userInfo = req.body;
        const result = await userCollection.insertOne(userInfo);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to insert user" });
      }
    });

    // Get all users
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ error: "Failed to retrieve users" });
      }
    });

    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("video is running");
});

// app.listen(port, () => {

// console.log(`server running on port ${port}`)}

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
