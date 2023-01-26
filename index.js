// REQUIRE
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const { v4: uuid } = require("uuid");
require("dotenv").config();
const stripe = require("stripe")(
  "sk_test_51KD7J8JE5np8TvxNiHIUayuWdJYZRfu8VUr4H4HiN2fdAA94zWD4FdxkErKs535D84fpcY3kO0zWrJ4a2LGvSfs800bolyozu4"
);

const app = express();
const ObjectId = require("mongodb").ObjectId;

//MIDDLEWARE
app.use(cors());
app.use(express.json());

//checkout
app.post("/checkout", async (req, res) => {
  let error;
  let status;
  try {
    const { product, token } = req.body;

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    const idempotencyKey = uuid();
    const charge = await stripe.charges.create(
      {
        amount: product.price * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the ${product.name}`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip,
          },
        },
      },
      {
        idempotencyKey,
      }
    );

    status = "success";
  } catch (error) {
    status = "failure";
  }

  res.json({ error, status });
});

// OPEN API
app.get("/", async (req, res) => {
  res.send("server is running!");
});

// CONNECTION URI
const uri =
  "mongodb+srv://e_eommarce:Pp1n56HAf9GzOXbU@cluster0.dv4ff.mongodb.net";
// const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//DB CONNECTION
async function run() {
  try {
    await client.connect();
    const database = client.db("etechhouse");
    const user_collection = database.collection("users");
    const product_collection = database.collection("products");
    const order_collection = database.collection("orders");
    const review_collection = database.collection("review");

    app.put("/checkout/update", async (req, res) => {
      try {
        const id = req.body.id;
        const result = await order_collection.updateOne(
          { _id: ObjectId(id) },
          {
            $set: { isPaid: true },
          }
        );
        console.log(result);
        res.json(result.modifiedCount);
      } catch (error) {
        console.log(error);
      }
    });

    //#user add: post api
    app.post("/users", async (req, res) => {
      try {
        const result = await user_collection.insertOne(req.body);
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //#user add: post api
    app.get("/admin/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await user_collection.findOne({ email: email });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# add a new admin: post api
    app.put("/addAdmin", async (req, res) => {
      try {
        const email = req.body.email;
        const result = await user_collection.updateOne(
          { email },
          {
            $set: { role: "admin" },
          }
        );
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //#all products load: get api
    app.get("/products", async (req, res) => {
      try {
        const result = await product_collection.find({}).toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //#single data load: get api
    app.get("/placeorder/:id", async (req, res) => {
      try {
        const result = await product_collection.findOne({
          _id: ObjectId(req.params.id),
        });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# place order: post api
    app.post("/placeorder", async (req, res) => {
      try {
        const order = req.body;
        order.status = "Pending";
        delete order._id;
        const result = await order_collection.insertOne(order);
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# load all orders: get api
    app.get("/orders", async (req, res) => {
      try {
        const email = req.query.email;
        let result;
        if (email) {
          result = await order_collection.find({ email }).toArray();
        } else {
          result = await order_collection.find({}).toArray();
        }
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# Change status: put api
    app.put("/updateOrderStatus", async (req, res) => {
      try {
        const id = req.body.id;
        const status = req.body.status;
        const result = await order_collection.updateOne(
          { _id: ObjectId(id) },
          {
            $set: { status: status },
          }
        );
        res.json(result.modifiedCount);
      } catch (error) {
        console.log(error);
      }
    });

    //# update a product: put api
    app.put("/updateProduct", async (req, res) => {
      try {
        const id = req.query.id;
        const product = req.body;
        const result = await product_collection.updateOne(
          { _id: ObjectId(id) },
          {
            $set: product,
          }
        );
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# delete specific order: delete api
    app.delete("/placeorder/:id", async (req, res) => {
      try {
        const result = await order_collection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# add a new product: post api
    app.post("/addProduct", async (req, res) => {
      try {
        const result = await product_collection.insertOne(req.body);
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });

    //# add a review: post api
    app.post("/addReview", async (req, res) => {
      try {
        const result = await review_collection.insertOne(req.body);
        res.json(result);
      } catch (error) {
        console.log("🚀 ~ file: index.js:252 ~ app.post ~ error", error);
      }
    });

    //# load all review: get api
    app.get("/reviews", async (req, res) => {
      try {
        const result = await review_collection.find({}).toArray();
        res.json(result);
      } catch (error) {
        console.log("🚀 ~ file: index.js:263 ~ app.get ~ error", error);
      }
    });

    //# delete a product: delete api
    app.delete("/deleteProduct/:id", async (req, res) => {
      try {
        const result = await product_collection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.json(result);
      } catch (error) {
        console.log("🚀 ~ file: index.js:276 ~ app.delete ~ error", error);
      }
    });

    //#single order load: get api
    app.get("/updateOne/:id", async (req, res) => {
      try {
        const result = await product_collection.findOne({
          _id: ObjectId(req.params.id),
        });
        res.json(result);
      } catch (error) {
        console.log("🚀 ~ file: index.js:289 ~ app.get ~ error", error);
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(3456, console.log("running @3456"));
