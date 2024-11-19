const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s2waoee.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [`${process.env.BASE_URL}`],
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

// mongoDB
const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db("glamour-lush");

async function run() {
  try {
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Glamour Lush is Running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
