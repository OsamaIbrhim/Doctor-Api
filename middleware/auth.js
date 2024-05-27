import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";
import Assistant from "../models/Assistant.js";
import Patient from "../models/Patient.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Authorization header missing or invalid");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userType = decoded.userType;
    const userId = decoded._id;

    let user;

    switch (userType) {
      case "doctor":
        user = await Doctor.findOne({ _id: userId, "tokens.token": token });
        req.user = user;
        break;

      case "assistant":
        user = await Assistant.findOne({ _id: userId, "tokens.token": token });
        req.user = user;
        break;

      case "patient":
        user = await Patient.findOne({ _id: userId, "tokens.token": token });
        req.user = user;
        break;
      default:
        throw new Error("Invalid user type");
    }

    if (!user) throw new Error("User not found");

    req.token = token;
    req.userType = userType;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).send({ error: "Please authenticate." });
  }
};

export default auth;
