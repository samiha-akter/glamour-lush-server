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

const corsOptions = {
  origin: [
    "https://glamour-lush-client.vercel.app",
    "http://localhost:5173",
    "glamour-lush.web.app",
  ], // Frontend domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// token verification
const verifyJWT = (req, res, next) => {
  // console.log("Authorization Header:", req.headers);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No Token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decoded) => {
    if (err) {
      return res.send({ message: "Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

// seller verification
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "seller" && user?.status === "pending") {
    return res.send({ message: "Forbidden Access" });
  }
  next();
};

// admin verification
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "admin") {
    return res.send({ message: "Forbidden Access" });
  }
  next();
};

// mongoDB
const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db("glamour-lush");
const contactCollection = db.collection("contact");
const userCollection = db.collection("users");
const productCollection = db.collection("products");

async function run() {
  try {
    // Insert Contact Message
    app.post("/contact", async (req, res) => {
      const messageData = req.body;
      const result = await contactCollection.insertOne(messageData);
      res.send(result);
    });

    // Insert Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Getting User Info
    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // Add Products
    app.post("/add-products", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // Route to get product by ID
    app.get("/products", async (req, res) => {
      const { id } = req.query; // Get the ID from query parameters
      const product = await productCollection.findOne({
        _id: new ObjectId(String(id)),
      });
      res.json({ product });
    });

    // Getting All Products
    app.get("/all-products", async (req, res) => {
      const { title, brand, sort, category, page = 1, limit = 6 } = req.query;
      const query = {};
      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }
      if (brand) {
        query.brand = brand;
      }

      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const sortOption = sort === "asc" ? 1 : -1;

      const products = await productCollection
        .find(query)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .sort({ price: sortOption })
        .toArray();

      // const productInfo = await productCollection
      //   .find({}, { projection: { category: 1, brand: 1 } })
      //   .toArray();

      const totalProducts = await productCollection.countDocuments(query);
      const brands = [...new Set(products.map((product) => product.brand))];
      const categories = [
        ...new Set(products.map((product) => product.category)),
      ];

      res.json({ products, brands, categories, totalProducts });
    });

    // Wishlist Add
    app.patch("/wishlist/add", verifyJWT, async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
        { email: userEmail },
        {
          $addToSet: { wishlist: new ObjectId(String(productId)) },
        }
      );
      res.send(result);
    });

    // Get Wishlist Data
    app.get("/wishlist/:userId", verifyJWT, async (req, res) => {
      const { userId } = req.params;
      const user = await userCollection.findOne({
        _id: new ObjectId(String(userId)),
      });
      if (!user) {
        return res.send({ message: "User Not Found" });
      }
      const wishlist = await productCollection
        .find({
          _id: { $in: user.wishlist || [] },
        })
        .toArray();

      res.send(wishlist);
    });

    // Wishlist Remove
    app.patch("/wishlist/remove", verifyJWT, async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
        { email: userEmail },
        {
          $pull: { wishlist: new ObjectId(String(productId)) },
        }
      );
      res.send(result);
    });

    // Cart Add
    app.patch("/cart/add", verifyJWT, async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
        { email: userEmail },
        {
          $addToSet: { cart: new ObjectId(String(productId)) },
        }
      );
      res.send(result);
    });

    // Get Cart Data
    app.get("/cart/:userId", verifyJWT, async (req, res) => {
      const { userId } = req.params;
      const user = await userCollection.findOne({
        _id: new ObjectId(String(userId)),
      });
      if (!user) {
        return res.send({ message: "User Not Found" });
      }
      const cart = await productCollection
        .find({
          _id: { $in: user.cart || [] },
        })
        .toArray();

      res.send(cart);
    });

    // Cart Remove
    app.patch("/cart/remove", verifyJWT, async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
        { email: userEmail },
        {
          $pull: { cart: new ObjectId(String(productId)) },
        }
      );
      res.send(result);
    });

    // Get Products by Seller
    app.get("/my-products", verifyJWT, verifySeller, async (req, res) => {
      const email = req.decoded.email;
      const products = await productCollection
        .find({ sellerEmail: email })
        .toArray();
      res.send(products);
    });

    // Delete Product by ID
    app.delete(
      "/my-products/:id",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const { id } = req.params;

        const result = await productCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      }
    );

    // Update Product by ID
    app.patch("/my-products/:id", verifyJWT, verifySeller, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // Get Users for Admin
    app.get("/all-users", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // Delete User
    app.delete("/all-users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      const sellerEmail = user.email;
      const userDeletionResult = await userCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (userDeletionResult.deletedCount === 0) {
        return res.status(500).send({ message: "Failed to delete user" });
      }

      // Delete all products associated with the sellerEmail
      const productDeletionResult = await productCollection.deleteMany({
        sellerEmail: sellerEmail,
      });

      res.send({
        message: "User and associated products deleted successfully",
        userDeletionCount: userDeletionResult.deletedCount,
        productDeletionCount: productDeletionResult.deletedCount,
      });
    });

    // Update User Role or Status
    app.patch("/all-users/:id", verifyJWT, verifySeller, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

// JWT Authentication
app.post("/authentication", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  res.send({ token });
});

// Basic Get
app.get("/", (req, res) => {
  res.send("Glamour Lush is Running");
});

// App Listen
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
