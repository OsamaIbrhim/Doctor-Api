import express from "express";
const router = express.Router();
import Doctor from "../models/Doctor.js";
import Assistant from "../models/Assistant.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import auth from "../middleware/auth.js";
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

// function to handle the sensitive data for the patient , doctor , assistant and prescription
const handleSensitiveData = (data) => {
  const sanitized = data;

  delete sanitized.password;
  delete sanitized.tokens;
  delete sanitized.verificationCode;
  delete sanitized.isVerified;
  delete sanitized.prescriptions;
  delete sanitized.doctors;
  delete sanitized.nationalityNumber;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  delete sanitized.birthday;
  delete sanitized.patients;
  delete sanitized.assistants;

  return sanitized;
};

// get the doctor's data >> profile
router.get("/", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    //omit sensitive data from doctor
    const sanitizedDoctor = handleSensitiveData(doctor.toObject());

    res.send(sanitizedDoctor);
  } catch (error) {
    res.status(500).send("Failed to fiend doctor + ", error.message);
  }
});

// signUp for doctor >> register
router.post("/signUp", async (req, res) => {
  const doctor = new Doctor(req.body);
  const verificationCode = crs({ length: 6, type: "numeric" });

  try {
    // Name - Email - Password - department
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

    // omit sensitive data from doctor
    const sanitizedDoctor = handleSensitiveData(doctor.toObject());

    // sending the doctor's data
    res.status(201).send(sanitizedDoctor);
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to login ");
  }
});

// signOut for doctor >> logout
router.post("/signOut", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Assistant not found");
    }

    doctor.tokens = req.assistant.tokens.filter((t) => t.token !== token);

    await doctor.save();

    res.send("Logged out successfully");
  } catch (error) {
    res.status(500).send("Failed to logout: " + error.message);
  }
});

// deleting the doctor account by token >> delete
router.delete("/del", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

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
router.put("/update", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "name",
    "email",
    "password",
    "department",
    "phoneNumber",
    "address",
    "gender",
    "birthday",
    "nationalityNumber",
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

    res.send("Doctor updated successfully");
  } catch (error) {
    res.status(500).send("Failed to update doctor " + error.message);
  }
});

// delete patient from doctor's patients list by token >> removePatient
router.delete("/delPatient", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    if (!doctor.patients.includes(req.body.patientId)) {
      return res
        .status(404)
        .send("Patient not found in doctor's patients list");
    }

    doctor.patients.pop(req.body.patientId);
    await doctor.save();

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to remove patient ");
  }
});

// get doctor's assistants list by token >> assistants
router.get("/assistants", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token }).populate(
      "assistants"
    );

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    // omit sensitive data from assistants
    const assistants = doctor.assistants.map((assistant) => {
      const sanitizedAssistant = handleSensitiveData(assistant.toObject());
      return sanitizedAssistant;
    });

    res.send(assistants);
  } catch (error) {
    res.status(500).send("Failed to get assistants " + error.message);
  }
});

// get specific assistant by token >> assistant
router.get("/spec_assistant/:email", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const assistant = await Assistant.findOne({ email: req.params.email });

    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    // omit sensitive data from assistant
    const sanitizedAssistant = handleSensitiveData(assistant.toObject());

    res.send(sanitizedAssistant);
  } catch (error) {
    res.status(500).send("Failed to get assistant " + error.message);
  }
});

// add assistant to doctor's assistants list by token >> addAssistant >> assistantId
router.post("/addAssistant", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    const assistant = await Assistant.findOne({ email: req.body.email });
    if (!assistant) return res.status(404).send("Assistant not found");
    const { _id: assistantId } = assistant;

    if (doctor && doctor.assistants.includes(assistantId)) {
      return res.status(400).send("Assistant already exists");
    }

    doctor.assistants.push(assistantId);
    await doctor.save();

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to add assistant " + error.message);
  }
});

// delete assistant from doctor's assistants list by token >> assistant email
router.delete("/delAssistant", auth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });
    const assistant = await Assistant.findOne({ _id: req.body.id });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }
    if (!assistant) {
      return res.status(404).send("Assistant not found");
    }

    if (!doctor.assistants.includes(assistant._id)) {
      return res
        .status(404)
        .send("Assistant not found in doctor's assistants list");
    }

    doctor.assistants.pop(assistant._id);
    await doctor.save();

    res.send("Assistant removed successfully");
  } catch (error) {
    res.status(500).send("Failed to remove assistant " + error.message);
  }
});

const doctorRoutes = router;
export default doctorRoutes;
