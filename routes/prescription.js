import express from "express";
import Doctor from "../models/Doctor.js";
import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Drug from "../models/Drug.js";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";
dotenv.config();

const router = express.Router();

// Get prescriptions by id
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).send("Prescription not found");
    }

    res.send(prescription);
  } catch (error) {
    console.error("Failed to fetch prescription:", error);
    res.status(500).send("Failed to fetch prescription");
  }
});

// Add prescription
router.post("/add", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Only doctors can add prescription.");
  }
  const { patient: patientId, drugs: drugsNames } = req.body;

  try {
    const drugs = [];
    await Promise.all(
      drugsNames.map(async (name) => {
        const drug = await Drug.findOne({ name });
        if (!drug) {
          return res
            .status(404)
            .send(`Drug "${name}" not found, please check the drug name.`);
        }
        drugs.push({ _id: drug._id, name: drug.name });
      })
    );

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res
        .status(404)
        .send("Patient not found, please check if the patient is signed up.");
    }

    const doctorId = decoded._id;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    // create a new prescription
    const prescription = new Prescription({
      patient: { _id: patientId, name: patient.name },
      doctor: { _id: doctorId, name: doctor.name },
      drugs: drugs.map((drug) => ({ _id: drug._id, name: drug.name })),
    });

    // chack if the patient has the same doctor
    const doctorExist = patient.doctors.find(
      (doc) => doc._id.toString() === doctorId.toString()
    );

    if (!doctorExist) {
      patient.doctors.push({ _id: doctorId, name: doctor.name });
    }

    patient.prescriptions.push(prescription._id);
    await prescription.save();
    await patient.save();

    res.status(201).send(prescription);
  } catch (error) {
    console.error("Failed to add prescription:", error);
    res.status(500).send("Failed to add prescription");
  }
});

// Update prescription
router.put("/update/:id", async (req, res) => {
  const { drugs: drugsNames } = req.body;

  try {
    if (!drugsNames || !Array.isArray(drugsNames) || drugsNames.length === 0) {
      return res.status(400).send("Drugs array is required");
    }

    const drugs = [];
    for (const name of drugsNames) {
      const drug = await Drug.findOne({ name });
      if (!drug) {
        return res.status(404).send(`Drug "${name}" not found`);
      }
      drugs.push(drug._id);
    }

    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { drugs },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).send("Prescription not found");
    }

    res.send(prescription);
  } catch (error) {
    console.error("Failed to update prescription:", error);
    res.status(500).send("Failed to update prescription");
  }
});

// Delete prescription
router.delete("/del/:id", auth, async (req, res) => {
  const id = req.params.id;

  // const token = req.header("Authorization").replace("Bearer ", "");
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // const userType = decoded.userType;

  try {
    const prescription = await Prescription.findByIdAndDelete(id);
    const patient = await Patient.findById(prescription.patient._id);

    if (!prescription || !patient) {
      return res.status(404).send("Prescription or Patient is not found");
    }

    // save all prescriptions that have the same doctor
    const doctorPrescriptions = patient.prescriptions.filter(
      (prescriptionId) =>
        prescriptionId.toString() !== id &&
        prescription.doctor._id.toString() ===
          prescription.doctor._id.toString()
    );

    // if the patient has only one prescription, remove the doctor from the patient's doctors list
    if (doctorPrescriptions === 1) {
      patient.doctors = patient.doctors.filter(
        (doctor) => doctor._id.toString() !== prescription.doctor._id.toString()
      );
    }

    patient.prescriptions = patient.prescriptions.filter(
      (prescriptionId) => prescriptionId.toString() !== id
    );
    await patient.save();

    res.send(`${prescription} deleted successfully`);
  } catch (error) {
    console.error("Failed to delete prescription:", error);
    res.status(500).send("Failed to delete prescription");
  }
});

export default router;
