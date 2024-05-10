import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const doctorAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Authorization header missing or invalid");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!doctor) throw new Error("Doctor not found or token invalid");

    req.role = decoded.isDoctor ? "doctor" : "unknown";
    req.token = token;
    req.doctor = doctor;
    next();
  } catch (error) {
    console.error("Doctor Auth middleware error:", error.message);
    res.status(401).send({ error: "Please authenticate." });
  }
};

export default doctorAuth;
