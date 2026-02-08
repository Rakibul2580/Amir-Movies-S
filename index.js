import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(
  "mongodb+srv://rh565153_db_user:500KUFenv59ztiV8@cluster0.qk34yqj.mongodb.net",
);

let videosCollection;

async function connectDB() {
  if (!videosCollection) {
    await client.connect();
    const db = client.db("videosDB");
    videosCollection = db.collection("videos");
  }
}

/* ROUTES */

app.get("/", (req, res) => {
  res.send("Amir brother's movies server");
});

app.post("/videos", async (req, res) => {
  await connectDB();

  const data = {
    title: req.body.title,
    youtubeUrl: req.body.youtubeUrl,
    createdAt: new Date(),
  };

  const result = await videosCollection.insertOne(data);
  res.json(result);
});

app.get("/videos", async (req, res) => {
  await connectDB();

  const page = parseInt(req.query.page) || 1;
  const limit = 6;

  const total = await videosCollection.countDocuments();

  const videos = await videosCollection
    .find()
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.json({
    videos,
    totalPages: Math.ceil(total / limit),
  });
});

app.delete("/videos/:id", async (req, res) => {
  await connectDB();

  await videosCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.json({ message: "Deleted" });
});

/* IMPORTANT */
export default app;
