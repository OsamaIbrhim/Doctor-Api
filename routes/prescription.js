import express from "express";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Drug from "../models/Drug.js";

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
  const { patient: patientId, drugs: drugsNames, doctor: doctorId } = req.body;

  try {
    const drugs = [];
    for (const name of drugsNames) {
      const drug = await Drug.findOne({ name });
      if (!drug) {
        return res
          .status(404)
          .send(`Drug "${name}" not found, please check the drug name.`);
      }
      drugs.push(drug._id);
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res
        .status(404)
        .send("Patient not found, please check if the patient is signed up.");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(401)
        .send(
          "Only doctors can add prescription, please provide valid doctor id."
        );
    }

    const prescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      drugs,
    });
    await prescription.save();

    patient.prescriptions.push(prescription._id);
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
router.delete("/del/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const prescription = await Prescription.findByIdAndDelete(id);

    if (!prescription) {
      return res.status(404).send("Prescription not found");
    }

    res.send(`${prescription} deleted successfully`);
  } catch (error) {
    console.error("Failed to delete prescription:", error);
    res.status(500).send("Failed to delete prescription");
  }
});

export default router;
