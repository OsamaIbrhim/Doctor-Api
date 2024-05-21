import express from "express";
import Patient from "../models/Patient.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import patientAuth from "../middleware/patientAuth.js";
import Prescription from "../models/Prescription.js";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const router = express.Router();

// Get patient data by token
router.get("/", patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findOne({ "tokens.token": req.token });

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    // Omit sensitive data from response
    patient.password = undefined;
    patient.tokens = undefined;
    patient.verificationCode = undefined;

    res.status(200).send(patient);
  } catch (error) {
    console.error("Failed to find patient:", error);
    res.status(500).send("Failed to find patient");
  }
});

// Sign up for patient
router.post("/signUp", async (req, res) => {
  const patient = new Patient(req.body);
  const verificationCode = crs({ length: 6, type: "numeric" });

  try {
    // name, email, password and birthday are required
    await patient.validate();

    const existingPatient = await Patient.findOne({ email: patient.email });
    if (existingPatient) {
      return res.status(400).send("Patient already exists");
    }

    transporter.sendMail({
      from: process.env.EMAIL,
      to: patient.email,
      subject: "Verification Code",
      text: `Your verification code is: ${verificationCode}`,
    });

    patient.verificationCode = verificationCode;
    await patient.generateAuthToken();
    await patient.save();

    res.status(201).send({
      id: patient._id,
      verificationCode: patient.verificationCode,
    });
  } catch (error) {
    console.error("Failed to register patient:", error);
    res.status(500).send("Failed to register patient");
  }
});

// Verify patient with verification code
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const patient = await Patient.findOne({ email });

    if (!patient || patient.verificationCode !== code) {
      return res.status(401).send("Invalid verification code");
    }

    patient.isVerified = true;
    await patient.save();

    res.status(200).send("Patient verified successfully");
  } catch (error) {
    console.error("Failed to verify patient:", error);
    res.status(500).send("Failed to verify patient");
  }
});

// Sign in for patient
router.post("/signIn", async (req, res) => {
  const { email, password } = req.body;

  try {
    const patient = await Patient.findByCredentials(email, password);

    await patient.generateAuthToken();

    res.status(200).send(patient);
  } catch (error) {
    console.error("Failed to sign in patient:", error);
    res.status(401).send("Failed to sign in patient");
  }
});

// Sign out for patient
router.post("/signOut", patientAuth, async (req, res) => {
  try {
    req.patient.tokens = req.patient.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.patient.save();

    res.status(200).send("Patient signed out successfully");
  } catch (error) {
    console.error("Failed to sign out patient:", error);
    res.status(500).send("Failed to sign out patient");
  }
});

// Delete patient account by token
router.delete("/delete", patientAuth, async (req, res) => {
  try {
    await req.patient.deleteOne();

    res.status(200).send("Patient deleted successfully");
  } catch (error) {
    console.error("Failed to delete patient:", error);
    res.status(500).send("Failed to delete patient");
  }
});

// Update patient's data by token
router.put("/update", patientAuth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "name",
    "email",
    "password",
    "phone",
    "address",
    "gender",
    "birthday",
    "department",
    "nationalityNumber",
    "age",
  ];

  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send("Invalid updates");
  }

  try {
    updates.forEach((update) => (req.patient[update] = req.body[update]));
    await req.patient.save();

    res.status(200).send("Patient updated successfully");
  } catch (error) {
    console.error("Failed to update patient:", error);
    res.status(500).send("Failed to update patient");
  }
});

// Get all patient's prescriptions by token
router.get("/prescriptions", patientAuth, async (req, res) => {
  try {
    const populatedPrescriptions = await Prescription.find({
      _id: { $in: req.patient.prescriptions },
    });

    res.status(200).send(populatedPrescriptions);
  } catch (error) {
    console.error("Failed to get prescriptions:", error);
    res.status(500).send("Failed to get prescriptions");
  }
});

export default router;
