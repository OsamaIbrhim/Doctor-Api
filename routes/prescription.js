import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Prescription Route");
});

const prescriptionRoutes = router;
export default prescriptionRoutes;
