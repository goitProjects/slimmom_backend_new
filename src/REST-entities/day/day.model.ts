import mongoose, { Schema } from "mongoose";
import {
  IDay,
  IDayPopulated,
} from "../../helpers/typescript-helpers/interfaces";

const daySchema = new Schema({
  date: String,
  eatenProducts: [
    { title: String, weight: Number, kcal: Number, id: String, _id: false },
  ],
  daySummary: { type: mongoose.Types.ObjectId, ref: "Summary" },
});

export default mongoose.model<IDay | IDayPopulated>("Day", daySchema);
