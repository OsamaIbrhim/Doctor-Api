import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { Schema } = mongoose;

const assistantSchema = new Schema(
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
    doctors: [
      {
        type: Schema.Types.ObjectId,
        ref: "doctor",
      },
    ],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual for calculating age
assistantSchema.virtual("age").get(function () {
  if (!this.birthday) return undefined;

  const diffMilliseconds = Date.now() - this.birthday.getTime();
  const ageDate = new Date(diffMilliseconds);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Hash the password before saving
assistantSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Generate an auth token for the assistant
assistantSchema.methods.generateAuthToken = async function () {
  const assistant = this;
  const token = jwt.sign(
    { _id: assistant._id.toString(), userType: "assistant" },
    process.env.JWT_SECRET
  );
  assistant.tokens = assistant.tokens.concat({ token });
  await assistant.save();
  return token;
};

// Static method to find assistant by credentials (email and password) for login
assistantSchema.statics.findByCredentials = async function (email, password) {
  const assistant = await this.findOne({ email });
  if (!assistant) {
    throw new Error("Unable to login");
  }
  const isPasswordMatch = await bcrypt.compare(password, assistant.password);
  if (!isPasswordMatch) {
    throw new Error("Unable to login");
  }
  return assistant;
};

const Assistant = mongoose.model("Assistant", assistantSchema);

export default Assistant;
