import mongoose from "mongoose";

const pendingPrescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
  },
  drugs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drug",
    },
  ],
});

const PendingPrescription = mongoose.model(
  "PendingPrescription",
  pendingPrescriptionSchema
);

export default PendingPrescription;
