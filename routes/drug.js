import express from "express";
const router = express.Router();
import Drug from "../models/Drug.js";

// GET all drugs
router.get("/", async (req, res) => {
  try {
    const drugs = await Drug.find({});
    res.send(drugs);
  } catch (error) {
    res.status(500).send("Failed to fetch drugs");
  }
});

// GET a drug by name
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const drug = await Drug.findById(id);
    res.send(drug);
  } catch (error) {
    res.status(500).send("Failed to fetch drug");
  }
});

// add a new drug
router.post("/add", async (req, res) => {
  try {
    const drug = new Drug(req.body);
    await drug.save();
    res.send(drug);
  } catch (error) {
    res.status(500).send("Failed to add drug");
  }
});

//update a drug by name
router.put("/update/:name", async (req, res) => {
  const { name } = req.params;
  const updates = req.body;

  try {
    const drug = await Drug.findOneAndUpdate({ name }, updates, { new: true });

    if (!drug) {
      return res.status(404).send("Drug not found");
    }

    res.status(201).send(drug);
  } catch (error) {
    console.error("Failed to update drug:", error);
    res.status(500).send("Failed to update drug");
  }
});

//delete a drug by name
router.delete("/del/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const drug = await Drug.findOneAndDelete(name);
    res.send(drug + " deleted successfully");
  } catch (error) {
    res.status(500).send("Failed to delete drug");
  }
});

const drugRoutes = router;
export default drugRoutes;
