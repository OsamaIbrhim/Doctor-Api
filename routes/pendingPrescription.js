import express from "express";
import PendingPrescription from "../models/PendingPrescription.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// function to handle the sensitive data for the patient , doctor , assistant and prescription
const handleSensitiveData = (data) => {
  const sanitized = data;

  delete sanitized.password;
  delete sanitized.tokens;
  delete sanitized.verificationCode;
  delete sanitized.isVerified;
  delete sanitized.prescriptions;
  delete sanitized.doctors;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  delete sanitized.patients;
  delete sanitized.assistants;

  return sanitized;
};

// Get all pending prescriptions
router.get("/:token", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;
  const doctorToken = req.params.token;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized");
  }

  try {
    // Fetch doctor by token
    const doctor = await Doctor.findOne({
      tokens: { $elemMatch: { token: doctorToken } },
    });

    const pendingPrescriptions = await PendingPrescription.find({
      doctorId: doctor._id,
    });

    if (!pendingPrescriptions || pendingPrescriptions.length === 0) {
      return res.status(404).send("No pending prescriptions found");
    }

    // Populate patient and drug details for each prescription
    await Promise.all(
      pendingPrescriptions.map(async (prescription) => {
        await prescription.populate("patientId");
        await prescription.populate("drugs");
        await prescription.populate("doctorId");

        // omit sensitive data
        prescription.patientId = handleSensitiveData(
          prescription.patientId.toObject()
        );
        prescription.doctorId = handleSensitiveData(
          prescription.doctorId.toObject()
        );
      })
    );

    res.status(200).send(pendingPrescriptions);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).send("Invalid token");
    }
    console.error("Failed to fetch pending prescriptions:", error);
    res.status(500).send("Failed to fetch pending prescriptions");
  }
});

// Add pending prescription
router.post("/add", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized");
  }

  const { patientId, doctorId, drugs } = req.body;

  try {
    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (!patient || !doctor) {
      return res.status(404).send("Patient or doctor not found");
    }

    const pendingPrescription = new PendingPrescription({
      patientId: patientId,
      doctorId: doctorId,
      drugs,
    });

    await pendingPrescription.save();

    res.status(201).send(pendingPrescription);
  } catch (error) {
    console.error("Failed to add prescription:", error);
    res.status(500).send("Failed to add prescription");
  }
});

// Delete pending prescription
router.delete("/del/:id", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "assistant") {
    return res.status(401).send("Unauthorized");
  }

  const id = req.params.id;

  try {
    const pendingPrescription = await PendingPrescription.findByIdAndDelete(id);

    if (!pendingPrescription) {
      return res.status(404).send("Pending prescription not found");
    }

    res.status(200).send(pendingPrescription);
  } catch (error) {
    console.error("Failed to delete pending prescription:", error);
    res.status(500).send("Failed to delete pending prescription");
  }
});

export default router;
