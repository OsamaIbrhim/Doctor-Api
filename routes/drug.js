import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Drug Route");
});

const drugRoutes = router;
export default drugRoutes;
