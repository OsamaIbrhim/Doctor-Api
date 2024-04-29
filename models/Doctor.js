import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";
require("dotenv").config();

const doctorSchema = mongoose.Schema(
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
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: true,
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
    birthday: {
      type: Date,
      required: true,
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
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

doctorSchema.virtual("patients", {
  ref: "Patient",
  localField: "_id",
  foreignField: "doctorId",
});

doctorSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

doctorSchema.methods.generateAuthToken = async function () {
  const doctor = this;

  const token = jwt.sign(
    { _id: doctor._id.toString() },
    process.env.JWT_SECRET
  );

  doctor.tokens = doctor.tokens.concat({ token });
  await doctor.save();

  return token;
};

doctorSchema.statics.findByCredentials = async function (email, password) {
  const doctor = await this.findOne({ email });

  if (!doctor) {
    throw new Error("Unable to login");
  }

  const isPasswordMatch = await bcrypt.compare(password, doctor.password);

  if (!isPasswordMatch) {
    throw new Error("Unable to login");
  }

  return doctor;
};

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
