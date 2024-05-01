import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import doctorRoutes from "./routes/doctor.js";
import patientRoutes from "./routes/patient.js";
import prescriptionRoutes from "./routes/prescription.js";
import drugRoutes from "./routes/drug.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const app = express();
const db = mongoose.connection;
const url = process.env.MONGO_URI;
const PORT = process.env.PORT || 6000;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization "],
    credentials: true,
  })
);

app.use(express.json());
app.use("/doc", doctorRoutes);
app.use("/pat", patientRoutes);
app.use("/pre", prescriptionRoutes);
app.use("/drug", drugRoutes);

mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    app.listen(PORT, () => console.log(`Server running in PORT ${PORT}`))
  )
  .catch((error) => console.log(error.message));

db.once("open", () => {
  console.log("Database connected");
});

db.once("error", () => {
  console.log("Error connecting to database");
});
