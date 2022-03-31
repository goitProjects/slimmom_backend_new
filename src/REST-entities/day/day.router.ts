import { Router } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import validate from "../../helpers/function-helpers/validate";
import {
  addProduct,
  deleteProduct,
  checkDailyRate,
  getDayInfo,
} from "./day.controller";

const addProductSchema = Joi.object({
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
  productId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'productId'. Must be MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
  weight: Joi.number().min(1).max(3000).required()
});

const deleteProductSchema = Joi.object({
  dayId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'dayId'. Must be MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
  eatenProductId: Joi.string().required(),
});

const getDayInfoScheme = Joi.object({
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post(
  "/",
  tryCatchWrapper(authorize),
  tryCatchWrapper(checkDailyRate),
  validate(addProductSchema),
  tryCatchWrapper(addProduct)
);
router.post(
  "/info",
  tryCatchWrapper(authorize),
  tryCatchWrapper(checkDailyRate),
  validate(getDayInfoScheme),
  tryCatchWrapper(getDayInfo)
);
router.delete(
  "/",
  tryCatchWrapper(authorize),
  tryCatchWrapper(checkDailyRate),
  validate(deleteProductSchema),
  tryCatchWrapper(deleteProduct)
);

export default router;
