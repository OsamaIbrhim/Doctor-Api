import mongoose from "mongoose";

const { Schema } = mongoose;

const drugSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  usage: {
    type: String,
    required: true,
  },
  side_effects: [
    {
      type: String,
      required: true,
    },
  ],
  contraindications: [
    {
      type: String,
      required: true,
    },
  ],
  similar_drugs: [
    {
      type: String,
      required: true,
    },
  ],
});

const Drug = mongoose.model("Drug", drugSchema);

export default Drug;
