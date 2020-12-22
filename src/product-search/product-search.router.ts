import { Router } from "express";
import Joi from "joi";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import validate from "../helpers/function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import { checkDailyRate } from "../REST-entities/day/day.controller";
import { findProducts } from "./product-search.controller";

const searchQuerySchema = Joi.object({
  search: Joi.string().required(),
});

const router = Router();

router.get(
  "/",
  tryCatchWrapper(authorize),
  tryCatchWrapper(checkDailyRate),
  validate(searchQuerySchema, "query"),
  tryCatchWrapper(findProducts)
);

export default router;
