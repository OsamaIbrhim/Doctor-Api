import express from "express";
import Doctor from "../models/Doctor.js";
import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Drug from "../models/Drug.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const handleSensitiveData = (data) => {
  const sanitized = data;

  delete sanitized.password;
  delete sanitized.tokens;
  delete sanitized.verificationCode;
  delete sanitized.isVerified;
  delete sanitized.prescriptions;
  delete sanitized.doctors;
  delete sanitized.patients;
  delete sanitized.assistants;

  return sanitized;
};

// Get prescriptions by id
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).send("Prescription not found");
    }

    // populate the prescription's patient and doctor
    await prescription.populate("patient");
    await prescription.populate("doctor");

    // omiting sensitive data
    const patient = handleSensitiveData(prescription.patient.toObject());
    const doctor = handleSensitiveData(prescription.doctor.toObject());

    prescription.patient = { age: patient.age, ...patient };
    prescription.doctor = { age: doctor.age, ...doctor };

    res.status(200).send(prescription);
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

  const { patient: patientId, drugs: drugsId } = req.body;

  try {
    await Promise.all(
      drugsId.map(async (id) => {
        const drug = await Drug.findById(id);
        if (!drug) {
          return res
            .status(404)
            .send(`Drug "${id}" not found, please check the drug name.`);
        }
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
      patient: { _id: patientId },
      doctor: { _id: doctorId },
      drugs: drugsId.map((id) => ({ _id: id })),
    });

    // chack if the doctor list is empty or not
    if (patient.doctors.length === 0) {
      patient.doctors.push({ _id: doctorId });
    }

    // chack if the patient has the same doctor
    const doctorExist = patient.doctors.find(
      (doctor) => doctor._id.toString() === doctorId.toString()
    );

    if (!doctorExist) {
      patient.doctors.push(doctorId);
    }

    // push the patient to the doctor's patients list if the patient is not exist
    const patientExist = doctor.patients.find(
      (patient) => patient._id.toString() === patientId.toString()
    );
    if (!patientExist) {
      doctor.patients.push({ _id: patientId });
    }

    patient.prescriptions.push(prescription._id);
    await prescription.save();
    await patient.save();
    await doctor.save();
    res.status(201).send(prescription);
  } catch (error) {
    console.error("Failed to add prescription:", error);
    res.status(500).send("Failed to add prescription");
  }
});

// Update prescription
router.put("/update/:id", async (req, res) => {
  const id = req.params.id;
  const { drugs: drugsId } = req.body;

  try {
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).send("Prescription not found");
    }

    // remove the drugs if it not in the new drugs and back only on id if it's exist
    prescription.drugs = prescription.drugs.filter((drug) =>
      drugsId.includes(drug._id.toString())
    );

    // push the new drugs to the prescription
    await Promise.all(
      drugsId.map(async (drugId) => {
        const drug = await Drug.findById(drugId);
        if (!drug) {
          return res
            .status(404)
            .send(`Drug not found, please check the drug name.`);
        }
        prescription.drugs.push(drugId);
      })
    );

    // populate the prescription's patient, doctor and drugs
    await Promise.all([
      prescription.populate("patient"),
      prescription.populate("doctor"),
      prescription.populate("drugs"),
    ]);

    // omiting sensitive data
    const patient = handleSensitiveData(prescription.patient.toObject());
    const doctor = handleSensitiveData(prescription.doctor.toObject());

    prescription.patient = { age: patient.age, ...patient };
    prescription.doctor = { age: doctor.age, ...doctor };

    await prescription.save();
    res.send(prescription);
  } catch (error) {
    console.error("Failed to update prescription:", error);
    res.status(500).send("Failed to update prescription");
  }
});

// Delete prescription
router.delete("/del/:id", async (req, res) => {
  const id = req.params.id;

  // const token = req.header("Authorization").replace("Bearer ", "");
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // const userType = decoded.userType;

  try {
    const prescription = await Prescription.findByIdAndDelete(id);

    // populate the prescription's patient and doctor
    await prescription.populate("patient");
    await prescription.populate("doctor");

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
