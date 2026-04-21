const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Create table
pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT,
    image TEXT
  )
`);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Routes
app.get("/", (req, res) => {
  res.send("API running");
});

// Create item with image
app.post("/items", upload.single("image"), async (req, res) => {
  const { name } = req.body;
  const image = req.file ? req.file.filename : null;

  const result = await pool.query(
    "INSERT INTO items (name, image) VALUES ($1, $2) RETURNING *",
    [name, image]
  );

  res.json(result.rows[0]);
});

// Get all items
app.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items");
  res.json(result.rows);
});

// Serve images
app.use("/uploads", express.static("uploads"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});