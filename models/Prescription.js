import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    drugs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Drug",
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
