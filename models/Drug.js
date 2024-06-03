import mongoose from "mongoose";

const { Schema } = mongoose;

const drugSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  usage: {
    type: String,
    required: true,
  },
  side_effects: [
    {
      type: String,
    },
  ],
  contraindications: [
    {
      type: String,
    },
  ],
  similar_drugs: [
    {
      type: String,
    },
  ],
});

drugSchema.statics.updateDrug = async function (id, doctorId, updates) {
  try {
    const drug = await Drug.findOne({ id });

    if (!drug) {
      throw new Error("Drug not found");
    }

    if (String(drug.doctorId) !== String(doctorId)) {
      throw new Error("Doctor ID does not match");
    }

    const updatedDrug = await Drug.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );

    console.log("Updated drug:", updatedDrug);
    return updatedDrug;
  } catch (error) {
    console.error("Error updating drug:", error);
    throw error;
  }
};

const Drug = mongoose.model("Drug", drugSchema);

export default Drug;
