const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const existinguser = await User.findOne({ email });
    if (existinguser)
      return res.status(404).json({ message: "User already exists" });
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      email,
      password: hashedpassword,
      role: role || "user",
    });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "myntra_clone_jwt_secret_key_12345",
      { expiresIn: "7d" }
    );

    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: { ...userData, token, role: user.role } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) return res.status(404).json({ message: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "myntra_clone_jwt_secret_key_12345",
      { expiresIn: "7d" }
    );

    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: { ...userData, token, role: user.role } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;