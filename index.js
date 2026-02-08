import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let videosCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("videosDB");
  videosCollection = db.collection("videos");
  console.log("MongoDB Connected");
}
connectDB();

app.get("/", (req, res) => {
  res.send("Hello Mr. Amir! Welcome to the Movies API!");
});

/* ================= CREATE ================= */

app.post("/videos", async (req, res) => {
  const data = {
    title: req.body.title,
    youtubeUrl: req.body.youtubeUrl,
    createdAt: new Date(),
  };

  const result = await videosCollection.insertOne(data);
  res.json(result);
});

/* ================= GET + PAGINATION + SEARCH ================= */

app.get("/videos", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const search = req.query.search || "";

  const query = {
    title: { $regex: search, $options: "i" },
  };

  const total = await videosCollection.countDocuments(query);

  const videos = await videosCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.json({
    videos,
    totalPages: Math.ceil(total / limit),
  });
});

/* ================= DELETE ================= */

app.delete("/videos/:id", async (req, res) => {
  await videosCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.json({ message: "Deleted" });
});

app.listen(3001, () => console.log("Server running on 3001"));
