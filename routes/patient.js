import express from "express";
const router = express.Router();
import Patient from "../models/Patient.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import patientAuth from "../middleware/patientAuth.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "",
    pass: "",
  },
});

// get patient data
router.get("/", patientAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  try {
    const patient = await Patient.findOne({ "tokens.token": token });

    if (!patient) {
      return res.status(404).send("patient not found");
    }

    //send patient without password and tokens
    patient.password = undefined;
    patient.tokens = undefined;
    patient.verificationCode = undefined;

    res.status(201).send(patient);
  } catch (error) {
    res.status(500).send("Failed to fiend patient + ", error.message);
  }
});

// signUp for patient
router.post("/signUp", async (req, res) => {
  const patient = new Patient(req.body);
  const verificationCode = crs({ length: 6, type: "numeric" });

  try {
    // Name - age - Email - Password - Phone - Date of Birth  - National - gender - address
    await patient.validate();

    const existingpatient = await Patient.findOne({ email: patient.email });
    if (existingpatient) {
      return res.status(400).send("patient already exists");
    }

    // transporter.sendMail(
    //   {
    //     from: "osamaibrhiim@gmail.com",
    //     to: patient.email,
    //     subject: "Verification Code",
    //     text: `Your verification code is: ${verificationCode}`,
    //   },
    //   (error, info) => {
    //     if (error) {
    //       console.error("Error sending email:", error);
    //     } else {
    //       console.log("Email sent:", info.response);
    //     }
    //   }
    // );

    patient.verificationCode = verificationCode;

    await patient.generateAuthToken();

    await patient.save();

    // sending the verificationCode <<<<<<<<<<<<<<<<<<<
    res.status(201).send({
      id: patient._id,
      verificationCode: patient.verificationCode,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to register ");
  }
});

// check the verify code
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).send("patient not found");
    }

    if (code !== patient.verificationCode) {
      return res.status(401).send("Invalid verification code");
    }

    patient.isVerified = true;
    await patient.save();

    res.status(200).send("patient verified successfully");
  } catch (error) {
    res.status(500).send("Filed to verify patient");
  }
});

// signIn for patient
router.post("/signIn", async (req, res) => {
  const { email, password } = req.body;

  try {
    const patient = await Patient.findByCredentials(email, password);

    if (!patient) {
      return res.status(404).send("patient not found");
    }

    await patient.generateAuthToken();

    // sending the patient's data
    res.status(201).send(patient);
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to login\n" + error.message);
  }
});

// signOut for patient
router.post("/signOut", patientAuth, async (req, res) => {
  try {
    req.patient.tokens = req.patient.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.patient.save();

    res.status(201).send("patient sign out successfully");
  } catch (error) {
    res.status(500).send("Filed to sign out ");
  }
});

// deleting the patient
router.delete("/del", patientAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  try {
    const patient = await Patient.findOne({ "tokens.token": token });

    await patient.deleteOne();

    res.status(201).send("patient deleted successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to delete patient \n" + error.message);
  }
});

// Updating the patient's data
router.put("/update", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

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
    const patient = await Patient.findOne({ "tokens.token": token });
    if (!patient) {
      return res.status(404).send("patient not found");
    }
    updates.forEach((update) => (patient[update] = req.body[update]));
    await patient.save();

    // const updatedData = {};
    // updates.forEach((update) => {
    //   updatedData[update] = patient[update];
    // });

    res.status(201).send("patient updated successfully");
  } catch (error) {
    res.status(500).send("Failed to update patient ");
  }
});

const patientRoutes = router;
export default patientRoutes;
