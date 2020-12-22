import { Request, Response, NextFunction } from "express";
import {
  IMom,
  IMomPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import UserModel from "./user.model";
import DayModel from "../day/day.model";
import SummaryModel from "../summary/summary.model";

export const getUserInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  await UserModel.findOne({ _id: (user as IMom)._id })
    .populate({
      path: "days",
      model: DayModel,
      populate: [{ path: "daySummary", model: SummaryModel }],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      return res.status(200).send({
        username: (data as IMomPopulated).username,
        email: (data as IMomPopulated).email,
        id: (data as IMomPopulated)._id,
        userData: (data as IMomPopulated).userData,
        days: (data as IMomPopulated).days,
      });
    });
};
