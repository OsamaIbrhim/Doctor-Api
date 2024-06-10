import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { Schema } = mongoose;

const doctorSchema = new Schema(
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
    department: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
    },
    birthday: {
      type: Date,
    },
    nationalityNumber: {
      type: String,
      unique: true,
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
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
    patients: [
      {
        type: Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],
    assistants: [
      {
        type: Schema.Types.ObjectId,
        ref: "Assistant",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual for calculating age
doctorSchema.virtual("age").get(function () {
  if (!this.birthday) return null;
  const diffMilliseconds = Date.now() - this.birthday.getTime();
  const ageDate = new Date(diffMilliseconds);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Hash the password before saving
doctorSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Generate an auth token for the doctor
doctorSchema.methods.generateAuthToken = async function () {
  const doctor = this;
  const token = jwt.sign(
    { _id: doctor._id.toString(), userType: "doctor" },
    process.env.JWT_SECRET
  );
  doctor.tokens = doctor.tokens.concat({ token });
  await doctor.save();
  return token;
};

// Static method to find doctor by credentials (email and password) for login
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
