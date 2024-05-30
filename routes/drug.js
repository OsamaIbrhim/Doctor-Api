import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";
import Drug from "../models/Drug.js";
import Doctor from "../models/Doctor.js";

router.get("/", async (req, res) => {
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

    const drugs = await Drug.find({ doctorId: doctor._id });

    if (drugs.length === 0) {
      return res.status(404).send("No drugs found, add some ...");
    }

    res.send(drugs);
  } catch (error) {
    res.status(500).send("Failed to fetch drugs");
  }
});

router.post("/add", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  try {
    const drug = new Drug(req.body);

    const doctor = await Doctor.find({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    drug.doctorId = doctor._id;

    await drug.save();
    res.send(drug);
  } catch (error) {
    res.status(500).send("Failed to add drug");
  }
});

router.put("/update", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userType = decoded.userType;

  if (userType !== "doctor") {
    return res.status(401).send("Unauthorized user");
  }

  const { id, ...updates } = req.body;

  try {
    const doctor = await Doctor.findOne({ "tokens.token": token });

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    const drug = await Drug.updateDrug(id, doctor._id, updates);

    res.status(201).send(drug);
  } catch (error) {
    console.error("Failed to update drug:", error);
    res.status(500).send("Failed to update drug");
  }
});

router.delete("/del/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const drug = await Drug.findOneAndDelete({ name });
    if (!drug) {
      return res.status(404).send("Drug not found");
    }
    res.send(`${drug} deleted successfully`);
  } catch (error) {
    console.error("Failed to delete drug:", error);
    res.status(500).send("Failed to delete drug");
  }
});

// Delete all drugs
// router.delete("/delAll", async (req, res) => {
//   try {
//     const drugs = await Drug.deleteMany({});
//     if (drugs.deletedCount === 0) {
//       return res.status(404).send("No drugs found");
//     }
//     res.send(`${drugs.deletedCount} drugs deleted successfully`);
//   } catch (error) {
//     console.error("Failed to delete drugs:", error);
//     res.status(500).send("Failed to delete drugs");
//   }
// });

export default router;
