const express = require("express");
const { Pool } = require("pg");
const QueryStream = require("pg-query-stream");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

console.log({ env: process.env });

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env["POSTGRES_URI"],
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Stream all products (with delay to demonstrate streaming)
app.get("/api/products/stream", async (req, res) => {
  const client = await pool.connect();

  console.log("Starting product stream...");

  let clientReleased = false;

  // Helper function to safely release the client
  const safelyReleaseClient = () => {
    if (!clientReleased) {
      clientReleased = true;
      client.release();
    }
  };

  try {
    // Set headers for streaming
    res.setHeader("Content-Type", "application/json");

    // Start the array
    res.write("[\n");

    // Create query for streaming
    const query = new QueryStream("SELECT * FROM products ORDER BY id");
    const stream = client.query(query);

    let first = true;
    let rowCount = 0;

    // Process each row with artificial delay
    stream.on("data", (row) => {
      // Small artificial delay (5ms) to simulate processing time
      setTimeout(() => {
        rowCount++;

        // Log every 100th row to avoid flooding the console
        if (rowCount % 100 === 0) {
          console.log(`Streaming row ${rowCount}: Product ${row.id}`);
        }

        // Add comma between objects, but not before the first one
        if (!first) {
          res.write(",\n");
        } else {
          first = false;
        }

        // Stream the JSON object
        res.write(JSON.stringify(row));
      }, 10); // Small delay to make streaming visible
    });

    // End the array when done
    stream.on("end", () => {
      res.write("\n]");
      res.end();
      console.log(`Finished streaming all ${rowCount} products`);
      client.release();
    });

    // Handle errors
    stream.on("error", (err) => {
      // ... handle error ...
      safelyReleaseClient();
    });

    // Handle client disconnect
    req.on("close", () => {
      console.log("Client disconnected, stopping stream");
      stream.destroy();
      client.release();
    });
  } catch (err) {
    client.release();
    console.error("Error:", err);
    res.status(500).json({ error: "An error occurred while streaming products" });
  }
});

// Get products with pagination (traditional approach for comparison)
app.get("/api/products", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2", [limit, offset]);

    const countResult = await pool.query("SELECT COUNT(*) FROM products");
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "An error occurred while fetching products" });
  }
});

app.listen(process.env["PORT"], () => {
  console.log(`Server running on port`);
});
