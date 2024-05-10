// that file runs once to upload many drugs to the database,
// you can run it by typing <node || nodemon> <the path of that file> in the terminal
import mongoose from "mongoose";
import Drug from "../models/Drug.js";
import { config } from "dotenv";
import { resolve } from "path";

const __dirname = resolve();
config({ path: resolve(__dirname, ".env") });

const url = process.env.MONGO_URI;
mongoose.connect(url, { useNewUrlParser: true });

// brooo , put the drugs data here,
// drugs data { name , usage , side_effects , contraindications , similar_drugs }
const drugsToUpload = [];

Drug.insertMany(drugsToUpload)
  .then((docs) => {
    console.log("Documents uploaded successfully:", docs);
  })
  .catch((error) => {
    console.error("Failed to upload documents:", error);
  });
