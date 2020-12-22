import mongoose, { Schema } from "mongoose";
import { IProduct } from "../../helpers/typescript-helpers/interfaces";

const productSchema = new Schema({
  categories: Array,
  weight: Number,
  title: { ru: String, ua: String },
  calories: Number,
  groupBloodNotAllowed: {
    0: {},
    1: Boolean,
    2: Boolean,
    3: Boolean,
    4: Boolean,
  },
});

export default mongoose.model<IProduct>("Product", productSchema);
