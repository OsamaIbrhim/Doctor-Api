import express from "express";
const router = express.Router();
import Doctor from "../models/Doctor.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import doctorAuth from "../middleware/doctorAuth.js";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// get the doctor's data >> profile
router.get("/", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    //send doctor without password , tokens and verification code
    doctor.password = undefined;
    doctor.tokens = undefined;
    doctor.verificationCode = undefined;

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to fiend doctor + ", error.message);
  }
});

// signUp for doctor >> register
router.post("/signUp", async (req, res) => {
  const doctor = new Doctor(req.body);
  const verificationCode = crs({ length: 6, type: "numeric" });

  try {
    // Name - Email - Password - Phone - Date of Birth - department - National - gender - address
    await doctor.validate();

    const existingDoctor = await Doctor.findOne({ email: doctor.email });
    if (existingDoctor) {
      return res.status(400).send("Doctor already exists");
    }

    transporter.sendMail(
      {
        from: process.env.EMAIL,
        to: doctor.email,
        subject: "Verification Code",
        text: `Your verification code is: ${verificationCode}`,
      },
      async (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
          doctor.verificationCode = verificationCode;
          await doctor.generateAuthToken();
          await doctor.save();
          res.status(201).send({
            id: doctor._id,
            verificationCode: doctor.verificationCode,
          });
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to register ");
  }
});

// check the verify code for doctor >> verify
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    if (code !== doctor.verificationCode) {
      return res.status(401).send("Invalid verification code");
    }

    doctor.isVerified = true;
    await doctor.save();

    res.status(200).send("Doctor verified successfully");
  } catch (error) {
    res.status(500).send("Filed to verify doctor");
  }
});

// signIn for doctor >> login
router.post("/signIn", async (req, res) => {
  const { email, password } = req.body;

  try {
    const doctor = await Doctor.findByCredentials(email, password);

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    await doctor.generateAuthToken();

    // sending the doctor's data
    res.status(201).send(doctor);
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to login ");
  }
});

// signOut for doctor >> logout
router.post("/signOut", doctorAuth, async (req, res) => {
  try {
    req.doctor.tokens = req.doctor.tokens.filter(
      (token) => token.token !== req.token
    );

    await req.doctor.save();

    res.send("Logged out successfully");
  } catch (error) {
    res.status(500).send("Failed to logout");
  }
});

// deleting the doctor account by token >> delete
router.delete("/del", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    await doctor.deleteOne();

    res.send(doctor);
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to delete doctor ");
  }
});

// Updating the doctor's data by token >> update
router.put("/update", doctorAuth, async (req, res) => {
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
  ];

  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send("Invalid updates");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });
    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }
    updates.forEach((update) => (doctor[update] = req.body[update]));
    await doctor.save();

    // const updatedData = {};
    // updates.forEach((update) => {
    //   updatedData[update] = doctor[update];
    // });

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to update doctor ");
  }
});

// add patient to doctor's patients list by token >> addPatient
router.post("/addPatient", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    if (doctor.patients.includes(req.body.patientId)) {
      return res.status(400).send("Patient already exists");
    }

    doctor.patients.push(req.body.patientId);
    await doctor.save();

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to add patient ");
  }
});

// delete patient from doctor's patients list by token >> removePatient
router.delete("/delPatient", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    doctor.patients = doctor.patients.filter(
      (patient) => patient.toString() !== req.body.patientId
    );
    await doctor.save();

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to remove patient ");
  }
});

// get doctor's patients list by token >> patients
router.get("/patients", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token }).populate(
      "patients"
    );

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    if (doctor.patients.length === 0) {
      return res.status(201).send("No patients found");
    }

    res.status(201).send(doctor.patients);
  } catch (error) {
    res.status(500).send("Failed to get patients ");
  }
});

const doctorRoutes = router;
export default doctorRoutes;
