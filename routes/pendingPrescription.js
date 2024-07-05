import express from "express";
import PendingPrescription from "../models/PendingPrescription.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Drug from "../models/Drug.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
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
router.get("/", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized");
  }

  try {
    // Fetch doctor by token
    const doctor = await Doctor.findById(decoded._id);

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

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

  const { patientEmail, doctorEmail, drugs } = req.body;

  try {
    const patient = await Patient.findOne({ email: patientEmail });
    const doctor = await Doctor.findOne({ email: doctorEmail });

    if (!patient || !doctor) {
      return res.status(404).send("Patient or doctor not found");
    }

    var uniqueDrugs;

    // get the drugs and check if the drugs is valid and have the same doctorId
    var drugsId = await Promise.all(
      drugs.map(async (drug) => {
        const drugId = Drug.findOne({
          name: { $regex: new RegExp(drug, "i") },
          doctorId: doctor._id,
        }).select("_id");
        return drugId;
      })
    );

    // remove the null values
    drugsId = drugsId.filter((drugId) => drugId !== null);

    // remove the duplicate values
    var uniqueDrugIds = [...new Set(drugsId.map((drugId) => drugId._id.toString()))];

    // back to object id
    uniqueDrugs = uniqueDrugIds.map((id) => new ObjectId(id));

    const pendingPrescription = new PendingPrescription({
      patientId: patient._id,
      doctorId: doctor._id,
      drugs: uniqueDrugs,
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

  if (userType !== "doctor") {
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

// get pending prescription by id
router.get("/:id", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized");
  }

  const id = req.params.id;

  try {
    const pendingPrescription = await PendingPrescription.findById(id);

    if (!pendingPrescription) {
      return res.status(404).send("Pending prescription not found");
    }

    // Populate patient and drug details for the prescription
    await Promise.all([
      pendingPrescription.populate("patientId"),
      pendingPrescription.populate("drugs"),
      pendingPrescription.populate("doctorId"),
    ]);

    // omit sensitive data
    pendingPrescription.patientId = handleSensitiveData(
      pendingPrescription.patientId.toObject()
    );
    pendingPrescription.doctorId = handleSensitiveData(
      pendingPrescription.doctorId.toObject()
    );

    res.status(200).send(pendingPrescription);
  } catch (error) {
    console.error("Failed to fetch pending prescription:", error);
    res.status(500).send("Failed to fetch pending prescription");
  }
});

export default router;
