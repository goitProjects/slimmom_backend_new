import { Router } from "express";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import { getUserInfo } from "./user.controller";

const router = Router();

router.get("/", tryCatchWrapper(authorize), tryCatchWrapper(getUserInfo));

export default router;
