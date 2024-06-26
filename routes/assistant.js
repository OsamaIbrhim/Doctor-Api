import express from "express";
import Assistant from "../models/Assistant.js";
import Doctor from "../models/Doctor.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";
import dotenv from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
dotenv.config({ path: resolve(__dirname, ".env") });

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// function to handle the sensitive data for the patient , doctor , assistant and prescription
const handleSensitiveData = (data) => {
  const sanitized = data;

  delete sanitized.password;
  delete sanitized.tokens;
  delete sanitized.verificationCode;
  delete sanitized.isVerified;
  delete sanitized.prescriptions;
  delete sanitized.doctors;
  delete sanitized.nationalityNumber;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  delete sanitized.birthday;
  delete sanitized.patients;
  delete sanitized.assistants;

  return sanitized;
};

// Get the assistant's data
router.get("/", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const assistant = await Assistant.findOne({ "tokens.token": token });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    // Send Assistant without password, tokens, and verification code
    const sanitizedAssistant = handleSensitiveData(assistant.toObject());

    res.send(sanitizedAssistant);
  } catch (error) {
    res.status(500).send("Failed to find Assistant: " + error.message);
  }
});

// Sign up for Assistant >> register
router.post("/signUp", auth, async (req, res) => {
  const assistant = new Assistant(req.body);
  const verificationCode = crs({ length: 6, type: "numeric" });
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ _id: decoded._id });
    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    // push the doctorId to the assistant
    assistant.doctors.push(doctor._id);

    // Check if the assistant already exists
    const existingAssistant = await Assistant.findOne({
      email: assistant.email,
    });
    if (existingAssistant) {
      return res.status(400).send("Assistant already exists");
    }

    // name - email - password
    await assistant.validate();

    // push the assistantId to the doctor
    doctor.assistants.push(assistant._id);

    await doctor.save();
    await assistant.save();

    transporter.sendMail({
      from: process.env.EMAIL,
      to: assistant.email,
      subject: "Verification Code",
      text: `Your verification code is: ${verificationCode}`,
    });
    assistant.verificationCode = verificationCode;

    await assistant.generateAuthToken();
    await assistant.save();

    res.status(201).send({
      id: assistant._id,
      verificationCode: assistant.verificationCode,
    });
  } catch (error) {
    res.status(500).send("Failed to register: " + error.message);
  }
});

// Check the verification code for Assistant >> verify
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const assistant = await Assistant.findOne({ email });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    if (code !== assistant.verificationCode) {
      return res.status(401).send("Invalid verification code");
    }

    assistant.isVerified = true;
    await assistant.save();

    res.status(200).send("Assistant verified successfully");
  } catch (error) {
    res.status(500).send("Failed to verify Assistant: " + error.message);
  }
});

// Sign in for Assistant >> login
router.post("/signIn", async (req, res) => {
  const { email, password } = req.body;

  try {
    const assistant = await Assistant.findByCredentials(email, password);
    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    await assistant.generateAuthToken();

    // save last token before omitting it
    const token = assistant.tokens[assistant.tokens.length - 1].token;

    // omit sensitive data
    const sanitized = handleSensitiveData(assistant.toObject());

    // send the token , name , email and id
    res.status(201).send({ token, ...sanitized });
  } catch (error) {
    res.status(500).send("Failed to login: " + error.message);
  }
});

// Sign out for Assistant >> logout
router.post("/signOut", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const assistant = await Assistant.findOne({ "tokens.token": token });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    assistant.tokens = assistant.tokens.filter((t) => t.token !== token);

    await assistant.save();

    res.send("Logged out successfully");
  } catch (error) {
    res.status(500).send("Failed to logout: " + error.message);
  }
});

// Updating the Assistant's data by token >> update
router.put("/update", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized user");
  }

  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "name",
    "email",
    "password",
    "doctorId",
    "phoneNumber",
    "address",
    "gender",
    "birthday",
    "department",
    "nationalityNumber",
  ];

  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send("Invalid updates");
  }

  try {
    const assistant = await Assistant.findOne({ "tokens.token": token });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    updates.forEach((update) => (assistant[update] = req.body[update]));

    await assistant.save();

    res.send("Assistant updated successfully");
  } catch (error) {
    res.status(500).send("Failed to update Assistant: " + error.message);
  }
});

// Deleting the Assistant account by token >> delete
router.delete("/del", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const assistant = await Assistant.findOne({ "tokens.token": token });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    await assistant.deleteOne();

    res.send("Assistant deleted successfully");
  } catch (error) {
    res.status(500).send("Failed to delete Assistant: " + error.message);
  }
});

const AssistantRoutes = router;
export default AssistantRoutes;
