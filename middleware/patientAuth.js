import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const auth = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token || !token.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const patient = await Patient.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!patient) {
      throw new Error("patient not found or token invalid");
    }

    req.token = token;
    req.patient = patient;
    next();
  } catch (e) {
    console.error("Auth middleware error:", e.message);
    res.status(401).send({ error: "Please authenticate." });
  }
};

export default patientAuth;
