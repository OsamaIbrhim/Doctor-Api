import mongoose from "mongoose";

const { Schema } = mongoose;

const prescriptionSchema = new Schema(
  {
    patient: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
      },
      name: {
        type: String,
        required: true,
      },
    },
    doctor: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
      },
      name: {
        type: String,
        required: true,
      },
    },
    drugs: [
      {
        name: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

const Prescription = mongoose.model("Prescription", prescriptionSchema);
export default Prescription;
