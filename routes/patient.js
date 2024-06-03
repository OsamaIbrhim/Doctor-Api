import express from "express";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Assistant from "../models/Assistant.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import auth from "../middleware/auth.js";
import Prescription from "../models/Prescription.js";
import jwt from "jsonwebtoken";
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

// get patient's data by token --> patient profile
router.get("/", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const patient = await Patient.findOne({ "tokens.token": token });

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    const sanitizedPatient = patient.toObject();
    delete sanitizedPatient.password;
    delete sanitizedPatient.tokens;
    delete sanitizedPatient.verificationCode;

    res.status(200).send(sanitizedPatient);
  } catch (error) {
    console.error("Failed to get patient:", error);
    res.status(500).send("Failed to get patient");
  }
});

// Get patient data by id
router.get("/get-patient/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    // Omit sensitive data from response
    const sanitizedPatient = patient.toObject();
    delete sanitizedPatient.password;
    delete sanitizedPatient.tokens;
    delete sanitizedPatient.verificationCode;

    res.status(200).send(sanitizedPatient);
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
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const patient = await Patient.findById(decoded._id);

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    await patient.remove();

    res.status(200).send("Patient deleted successfully");
  } catch (error) {
    console.error("Failed to delete patient:", error);
    res.status(500).send("Failed to delete patient");
  }
});

// Update patient's data by token
router.put("/update", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

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

// get patient's doctors --> all doctors that the patient has
router.get("/doctors", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const patient = await Patient.findOne({ "tokens.token": token });

    if (!patient) {
      return res.status(404).send("Patient or doctor not found");
    }

    res.status(200).send(patient.doctors);
  } catch (error) {
    console.error("Failed to get doctor:", error);
    res.status(500).send("Failed to get doctor");
  }
});

// Get all patient's prescriptions by token --> prescriptions with name of drugs and doctor
router.get("/prescriptions", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "patient") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const patient = await Patient.findOne({ "tokens.token": token });

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    const prescriptions = await Prescription.find({
      _id: { $in: patient.prescriptions },
    });

    if (!prescriptions) {
      return res.status(404).send("Prescriptions not found");
    }

    const updatedPrescriptions = await Promise.all(
      prescriptions.map(async (prescription) => {
        const doctor = await Doctor.findById(prescription.doctor);
        if (!doctor) {
          await prescription.remove();
          return null;
        }

        const sanitizedDoctor = doctor.toObject();
        delete sanitizedDoctor.password;
        delete sanitizedDoctor.tokens;
        delete sanitizedDoctor.verificationCode;
        delete sanitizedDoctor.isVerified;
        delete sanitizedDoctor.patients;
        delete sanitizedDoctor.assistants;

        return {
          ...prescription.toObject(),
          patient: { name: patient.name },
          doctor: sanitizedDoctor,
        };
      })
    );

    res.status(200).send(updatedPrescriptions.filter((p) => p !== null));
  } catch (error) {
    console.error("Failed to get prescriptions:", error);
    res.status(500).send("Failed to get prescriptions");
  }
});

// doctor or assistant only routes /////////////////////////////////////////////

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
      const patient = await Patient.findOne({ email: req.body.email });
      if (!patient) return res.status(404).send("Patient not found");
      
      const doctor = await Doctor.findOne({ "tokens.token": token });
      if (doctor && doctor.patients.includes(patient._id)) {
        return res.status(400).send("Patient already exists");
      }

      patient.doctors.push({ id: doctor._id, name: doctor.name });
      doctor.patients.push(patient._id);

      await doctor.save();
      await patient.save();
    } else if (userType === "assistant") {
      const patient = await Patient.findOne({ email: req.body.email });
      if (!patient) return res.status(404).send("Patient not found");

      const assistant = await Assistant.findOne({ "tokens.token": token });
      const doctor = await Doctor.findById(assistant.doctorId);

      if (doctor && doctor.patients.includes(patient._id)) {
        return res.status(400).send("Patient already exists");
      }

      patient.doctors.push({ id: doctor._id, name: doctor.name });
      doctor.patients.push(patient._id);

      await doctor.save();
      await patient.save();
    }

    res.status(201).send("Patient added successfully");
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
      return res.status(404).send("No patients found");
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
