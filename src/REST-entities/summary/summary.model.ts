import mongoose, { Schema } from "mongoose";
import { IDaySummary } from "../../helpers/typescript-helpers/interfaces";

const summarySchema = new Schema({
  date: String,
  kcalLeft: Number,
  kcalConsumed: Number,
  percentsOfDailyRate: Number,
  dailyRate: Number,
  userId: mongoose.Types.ObjectId,
});

export default mongoose.model<IDaySummary>("Summary", summarySchema);
