import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config(); // .env থেকে load (local-এর জন্য)

const app = express();
app.use(cors());
app.use(express.json());

// Connection string Vercel env থেকে
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Error: MONGODB_URI is not set in environment variables!");
  // Vercel logs-এ দেখা যাবে
}

// MongoDB options for serverless (timeout + pool)
const options = {
  connectTimeoutMS: 30000, // 30 seconds
  serverSelectionTimeoutMS: 30000, // Server select timeout
  socketTimeoutMS: 45000,
  maxPoolSize: 10, // Pool limit (Atlas free-এর জন্য safe)
  minPoolSize: 1,
  maxIdleTimeMS: 10000, // Idle close
  family: 4, // IPv4 force (কখনো IPv6 issue)
};

let client;
let clientPromise;
let videosCollection;

// Singleton: connection cache (Vercel-এর জন্য best practice)
if (process.env.NODE_ENV === "development") {
  // Development: hot reload এর জন্য global
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client
      .connect()
      .then((connectedClient) => {
        console.log("MongoDB Connected (development mode)");
        return connectedClient;
      })
      .catch((err) => {
        console.error("MongoDB connection failed (dev):", err);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production (Vercel serverless)
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then((connectedClient) => {
      console.log("MongoDB Connected (Vercel production)");
      return connectedClient;
    })
    .catch((err) => {
      console.error("MongoDB connection failed (prod):", err);
      throw err;
    });
}

// DB ready function
async function getVideosCollection() {
  try {
    const connectedClient = await clientPromise;
    const db = connectedClient.db("videosDB");
    videosCollection = db.collection("videos");
    return videosCollection;
  } catch (err) {
    console.error("Failed to get videosCollection:", err);
    throw err;
  }
}

// Root route (no DB needed)
app.get("/", (req, res) => {
  res.send("Hello Mr. Amir! Welcome to the Movies API!");
});

// CREATE
app.post("/videos", async (req, res) => {
  try {
    const collection = await getVideosCollection();

    const data = {
      title: req.body.title,
      youtubeUrl: req.body.youtubeUrl,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(data);
    res.json(result);
  } catch (err) {
    console.error("POST /videos error:", err);
    res
      .status(500)
      .json({ error: "Failed to add video", details: err.message });
  }
});

// GET + pagination + search
app.get("/videos", async (req, res) => {
  try {
    const collection = await getVideosCollection();

    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const search = req.query.search || "";

    const query = {
      title: { $regex: search, $options: "i" },
    };

    const total = await collection.countDocuments(query);

    const videos = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.json({
      videos,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /videos error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch videos", details: err.message });
  }
});

// DELETE
app.delete("/videos/:id", async (req, res) => {
  try {
    const collection = await getVideosCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /videos error:", err);
    res
      .status(500)
      .json({ error: "Failed to delete video", details: err.message });
  }
});

// Vercel-এর জন্য port (process.env.PORT ব্যবহার করো, fixed 3001 না)
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Export for Vercel (serverless function হিসেবে)
export default app;
