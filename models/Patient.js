import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";
import dotenv from "dotenv";
dotenv.config();

const { Schema } = mongoose;

const patientSchema = new Schema(
  {
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
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    birthday: {
      type: Date,
      required: true,
    },
    prescriptions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Prescription",
      },
    ],
    verificationCode: {
      type: String,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    timestamps: true,
  }
);

// Calculate age
patientSchema.virtual("age").get(function () {
  if (!this.birthday) return undefined;
  const diffMilliseconds = Date.now() - this.birthday.getTime();
  const ageDate = new Date(diffMilliseconds);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Hash the password before saving
patientSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Generate auth token for the patient
patientSchema.methods.generateAuthToken = async function () {
  const patient = this;
  const token = jwt.sign(
    { _id: patient._id.toString(), userType: "patient" },
    process.env.JWT_SECRET
  );
  patient.tokens = patient.tokens.concat({ token });
  await patient.save();
  return token;
};

// Find patient by credentials (email and password) >> login
patientSchema.statics.findByCredentials = async function (email, password) {
  const patient = await this.findOne({ email });
  if (!patient) {
    throw new Error("Unable to login");
  }
  const isPasswordMatch = await bcrypt.compare(password, patient.password);
  if (!isPasswordMatch) {
    throw new Error("Unable to login");
  }
  return patient;
};

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;
