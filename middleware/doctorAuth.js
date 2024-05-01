import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const doctorAuth = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token || !token.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const doctor = await Doctor.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!doctor) {
      throw new Error("doctor not found or token invalid");
    }

    req.token = token;
    req.doctor = doctor;
    next();
  } catch (e) {
    console.error("Doctor Auth middleware error:", e.message);
    res.status(401).send({ error: "Please authenticate." });
  }
};

export default doctorAuth;
