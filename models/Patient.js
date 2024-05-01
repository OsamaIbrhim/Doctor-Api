const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
import dotenv from "dotenv";
dotenv.config();

const patientSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    maxlength: 50,
    lowercase: true,
    validate: [validator.isEmail, "Invalid email"],
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    trim: true,
    required: true,
    minlength: 7,
    validate: {
      validator(value) {
        return !value.toLowerCase().includes("password");
      },
      message: "Password must not contain 'password'",
    },
  },
  nationalityNumber: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female"],
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "patient",
  },
});

patientSchema.virtual("prescriptions", {
  ref: "Prescription",
  localField: "_id",
  foreignField: "patient",
});

patientSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

patientSchema.methods.generateAuthToken = async function () {
  const patient = this;

  const token = jwt.sign(
    { _id: patient._id.toString() },
    process.env.JWT_SECRET
  );

  patient.tokens = patient.tokens.concat({ token });
  await patient.save();

  return token;
};

const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
