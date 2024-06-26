import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import helmet from "helmet"; // Import helmet
import doctorRoutes from "./routes/doctor.js";
import patientRoutes from "./routes/patient.js";
import prescriptionRoutes from "./routes/prescription.js";
import pendingPrescription from "./routes/pendingPrescription.js";
import drugRoutes from "./routes/drug.js";
import assistantRoutes from "./routes/assistant.js";
import { config } from "dotenv";
import { resolve } from "path";
import auth from "./middleware/auth.js";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 8880;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(helmet());

// Routes
app.use("/pat", patientRoutes);
app.use("/pre", auth, prescriptionRoutes);
app.use("/drug", auth, drugRoutes);
app.use("/doc", doctorRoutes);
app.use("/ast", assistantRoutes);
app.use("/pen", auth, pendingPrescription);

// Database connection
const url = process.env.MONGO_URI;
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database connected");
    // Start server
    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
  })
  .catch((error) => {
    console.error("Error connecting to database:", error.message);
    process.exit(1); // Exit with failure
  });

// Event handlers for database connection
const db = mongoose.connection;
db.once("error", () => {
  console.error("Error connecting to database");
  process.exit(1); // Exit with failure
});

export default app;
