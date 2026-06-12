const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userrouter = require("./routes/Userroutes");
const categoryrouter = require("./routes/Categoryroutes");
const productrouter = require("./routes/Productroutes");
const Bagroutes = require("./routes/Bagroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const OrderRoutes = require("./routes/OrderRoutes");
const recentlyViewedRouter = require('./routes/recentlyViewed');
const notificationRouter = require('./routes/notifications');
const transactionRouter = require("./routes/TransactionRoutes");
const { startWorker } = require("./services/notificationQueue");
const cors = require('cors');
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', 
  credentials: true, 
}));
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} - Body:`, req.body);
  next();
});
app.get("/", (req, res) => {
  res.send("✅ Myntra backend in working");
});
app.use("/user", userrouter);
app.use("/category", categoryrouter);
app.use("/product", productrouter);
app.use("/bag", Bagroutes);
app.use("/cart", require("./routes/CartRoutes"));
app.use("/wishlist", Wishlistroutes);
app.use("/Order", OrderRoutes);
app.use("/recently-viewed", recentlyViewedRouter);
app.use("/notifications", notificationRouter);
app.use("/transactions", transactionRouter);


mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("Mongodb connected");
    // Start background notification queue worker polling every 5 seconds
    startWorker(5000);
  })
  .catch((err) => console.log(err));

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

