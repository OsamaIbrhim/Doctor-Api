import express from "express";
import Drug from "../models/Drug.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const drugs = await Drug.find({});
    res.send(drugs);
  } catch (error) {
    console.error("Failed to fetch drugs:", error);
    res.status(500).send("Failed to fetch drugs");
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const drug = await Drug.findById(id);
    res.send(drug);
  } catch (error) {
    console.error("Failed to fetch drug:", error);
    res.status(500).send("Failed to fetch drug");
  }
});

router.post("/add", async (req, res) => {
  try {
    const drug = new Drug(req.body);
    await drug.save();
    res.send(drug);
  } catch (error) {
    console.error("Failed to add drug:", error);
    res.status(500).send("Failed to add drug");
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const drug = await Drug.findOneAndUpdate({ id }, updates, { new: true });

    if (!drug) {
      return res.status(404).send("Drug not found");
    }

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

export default router;
