import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import doctorRoutes from "./routes/doctor.js";
import patientRoutes from "./routes/patient.js";
import prescriptionRoutes from "./routes/prescription.js";
import drugRoutes from "./routes/drug.js";

const app = express();
const db = mongoose.connection;
const url =
  "mongodb+srv://doctor010:doctor010@Doctor-app.bs4vgcs.mongodb.net/Doctor-app?retryWrites=true&w=majority";

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
    app.listen(3000, () => console.log(`Server running in PORT 3000`))
  )
  .catch((error) => console.log(error.message));

db.once("open", () => {
  console.log("Database connected");
});

db.once("error", () => {
  console.log("Error connecting to database");
});
