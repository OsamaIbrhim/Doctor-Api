import express from "express";
const router = express.Router();
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Drug from "../models/Drug.js";

router.post("/add", async (req, res) => {
  const patientId = req.body.patient;
  const drugsNames = req.body.drugs;
  const doctorId = req.body.doctor;

  try {
    const drugs = [];
    for (let i = 0; i < drugsNames.length; i++) {
      const drug = await Drug.findOne({ name: drugsNames[i] });
      if (!drug) {
        return res
          .status(404)
          .send(`Drug ${drug} not found, please check the drug name.`);
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
          "Sury you are not authorized to add prescription,\n only doctor can add prescription."
        );
    }

    const prescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      drugs: [...drugs],
    });
    await prescription.save();

    patient.prescriptions.push(prescription._id);
    await patient.save();

    res.send(prescription);
  } catch (error) {
    res.status(500).send("Failed to add prescription " + error);
  }
});

//update prescription
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

const prescriptionRoutes = router;
export default prescriptionRoutes;
