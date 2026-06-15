const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in env variables.");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, { family: 4 });
    console.log("Connected to MongoDB successfully.");

    const adminEmail = "admin@myntra.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin user with email ${adminEmail} already exists. Setting role to 'admin' just in case.`);
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log("Admin user role verified successfully.");
    } else {
      console.log("Creating new Admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const adminUser = new User({
        fullName: "Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });

      await adminUser.save();
      console.log("Admin user seeded successfully!");
      console.log(`Email: ${adminEmail}`);
      console.log("Password: admin123");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding Admin user:", error);
    process.exit(1);
  }
};

seedAdmin();
