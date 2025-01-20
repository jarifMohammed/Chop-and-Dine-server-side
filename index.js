// Import required modules
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config(); // Load environment variables

// Server port configuration
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.trszs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance with Stable API version settings
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB server
    await client.connect();

    // Database and collections setup
    const userCollection = client.db("dineDB").collection("users");
    const menuCollection = client.db("dineDB").collection("menu");
    const reviewCollection = client.db("dineDB").collection("reviews");
    const cartCollection = client.db("dineDB").collection("cart");

    // Middleware for verifying JWT token
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;

      // Check if the Authorization header is present
      if (!authHeader) {
        return res
          .status(401)
          .send({ message: "Unauthorized: No Authorization header provided" });
      }

      const token = authHeader.split(" ")[1]; // Extract the token
      if (!token) {
        return res
          .status(401)
          .send({ message: "Unauthorized: No token provided" });
      }

      // Verify the token
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "Unauthorized: Invalid token" });
        }
        req.decoded = decoded; // Attach decoded data to the request
        next();
      });
    };

    // Generate a JWT token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "2h" });
      res.send({ token });
    });

    // Middleware to verify admin access
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // API to get all users (only accessible to admin)
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // API to check if a user is an admin
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized access" });
      }
      const user = await userCollection.findOne({ email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    // API to add a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // API to delete a user
    app.delete("/users/:id", verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // API to promote a user to admin
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    // API to get the menu items
    
    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });
    app.post('/menu',verifyToken,verifyAdmin, async(req,res) => {
      const item = req.body
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })
    app.delete('/menu/:id' , verifyToken,verifyAdmin, async (req,res) => {
      const id = req.params.id 
      const query = {_id : new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })

    // API to get reviews
    app.get("/review", async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });

    // Cart APIs

    // Get all cart items for a specific user
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const cartItems = await cartCollection.find({ email }).toArray();
      res.send(cartItems);
    });

    // Add an item to the cart
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // Delete an item from the cart
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Confirm connection to the MongoDB server
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // Ensure the client will close when finished or on error
  }
}

// Run the server
run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("Server running");
});

// Start listening on the specified port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
