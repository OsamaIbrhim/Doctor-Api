import express from "express";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Assistant from "../models/Assistant.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import auth from "../middleware/auth.js";
import Prescription from "../models/Prescription.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
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
router.get("/", auth, async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  try {
    const patient = await Patient.findOne({ "tokens.token": token });

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
router.post("/signOut", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const patien = await Patient.findOne({ "tokens.token": token });

    if (!patien) {
      return res.status(404).send("Assistant not found");
    }

    patien.tokens = req.assistant.tokens.filter((t) => t.token !== token);

    await patien.save();

    res.send("Logged out successfully");
  } catch (error) {
    res.status(500).send("Failed to logout: " + error.message);
  }
});

// Delete patient account by token
router.delete("/delete", auth, async (req, res) => {
  try {
    await req.patient.deleteOne();

    res.status(200).send("Patient deleted successfully");
  } catch (error) {
    console.error("Failed to delete patient:", error);
    res.status(500).send("Failed to delete patient");
  }
});

// Update patient's data by token
router.put("/update", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "name",
    "email",
    "password",
    "phoneNumber",
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
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();

    res.status(200).send("Patient updated successfully");
  } catch (error) {
    console.error("Failed to update patient:", error);
    res.status(500).send("Failed to update patient");
  }
});

// Get all patient's prescriptions by token
router.get("/prescriptions", auth, async (req, res) => {
  try {
    // TODO: Populate prescriptions with doctor's and drug's data
    const populatedPrescriptions = await Prescription.find({
      patient: req.user._id,
    });

    res.status(200).send(populatedPrescriptions);
  } catch (error) {
    console.error("Failed to get prescriptions:", error);
    res.status(500).send("Failed to get prescriptions");
  }
});

// add patient to doctor's patients list by token >> addPatient
router.post("/addPatient", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType === "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    if (userType === "doctor") {
      const doctor = await Doctor.findOne({ "tokens.token": token });

      if (doctor && doctor.patients.includes(req.body.email)) {
        return res.status(400).send("Patient already exists");
      }

      const patient = await Patient.findOne({ email: req.body.email });

      if (!patient) return res.status(404).send("Patient not found");

      doctor.patients.push(patient._id);
      await doctor.save();
    } else if (userType === "assistant") {
      const assistant = await Assistant.findOne({ "tokens.token": token });
      const doctor = await Doctor.findById(assistant.doctorId);

      if (doctor && doctor.patients.includes(req.body.email)) {
        return res.status(400).send("Patient already exists");
      }

      const patient = await Patient.findOne({ email: req.body.email });

      if (!patient) return res.status(404).send("Patient not found");

      doctor.patients.push(patient._id);

      await doctor.save();
    }

    res.send("Patient added successfully");
  } catch (error) {
    res.status(500).send("Failed to add patient " + error.message);
  }
});

// get doctor's patients list by token >> patients
router.get("/patients", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType === "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    let doctor;

    if (userType === "assistant") {
      const assistant = await Assistant.findOne({ "tokens.token": token });
      doctor = await Doctor.findById(assistant.doctorId).populate("patients");
    } else {
      doctor = await Doctor.findOne({ "tokens.token": token }).populate(
        "patients"
      );
    }

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    if (doctor.patients.length === 0) {
      return res.status(201).send("No patients found");
    }

    const patients = doctor.patients.map((patient) => {
      const sanitizedPatient = patient.toObject();
      delete sanitizedPatient.password;
      delete sanitizedPatient.tokens;
      delete sanitizedPatient.verificationCode;
      delete sanitizedPatient.isVerified;
      delete sanitizedPatient.prescriptions;
      return sanitizedPatient;
    });

    res.status(201).send(patients);
  } catch (error) {
    res.status(500).send("Failed to get patients " + error.message);
  }
});

const patientRoutes = router;
export default patientRoutes;
