import mongoose from "mongoose";

const drugSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  using: {
    type: String,
    required: true,
  },
  sideEffect: {
    type: String,
    required: true,
  },
  alternative: {
    type: String,
    required: true,
  },
});

const Drug = mongoose.model("Drug", drugSchema);
export default Drug;
