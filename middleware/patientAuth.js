import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const patientAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Authorization header missing or invalid");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!patient) throw new Error("Patient not found or token invalid");

    req.role = decoded.isDoctor ? "doctor" : "patient";
    req.token = token;
    req.patient = patient;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).send({ error: "Please authenticate." });
  }
};

export default patientAuth;
