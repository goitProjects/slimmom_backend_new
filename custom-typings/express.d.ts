import { Document } from "mongoose";
import {
  IMom,
  IMomPopulated,
  ISession,
} from "../src/helpers/typescript-helpers/interfaces";

declare global {
  namespace Express {
    interface Request {
      user: IMom | IMomPopulated | null;
      session: ISession | null;
    }
  }
}
