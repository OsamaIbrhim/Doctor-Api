import express from "express";
const router = express.Router();
import Doctor from "../models/Doctor.js";
import nodemailer from "nodemailer";
import crs from "crypto-random-string";
import doctorAuth from "../middleware/doctorAuth.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "",
    pass: "",
  },
});

// signUp
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

    // transporter.sendMail(
    //   {
    //     from: "osamaibrhiim@gmail.com",
    //     to: doctor.email,
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

    doctor.verificationCode = verificationCode;

    await doctor.generateAuthToken();

    await doctor.save();

    // sending the verificationCode <<<<<<<<<<<<<<<<<<<
    res
      .status(201)
      .send({ id: doctor._id, verificationCode: doctor.verificationCode });
  } catch (error) {
    console.log(error);
    res.status(500).send("Filed to register ");
  }
});

// check the verify code
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

// signOut
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

// geting the doctor by his token in the authrization header >>>>>
//get all doctors for now -_-
router.get("/", doctorAuth, async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    //send doctor without password and tokens
    doctor.password = undefined;
    doctor.tokens = undefined;
    doctor.verificationCode = undefined;

    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to fiend doctor + ", error.message);
  }
});

// deleting the doctor
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

// Updating the doctor's data
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
    res.send(doctor);
  } catch (error) {
    res.status(500).send("Failed to update doctor ");
  }
});

// get the doctor's patients

const doctorRoutes = router;
export default doctorRoutes;
