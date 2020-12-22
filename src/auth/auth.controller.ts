import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  IMom,
  IJWTPayload,
  ISession,
} from "../helpers/typescript-helpers/interfaces";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";
import SummaryModel from "../REST-entities/summary/summary.model";

export const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res
      .status(409)
      .send({ message: `User with ${email} email already exists` });
  }
  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.HASH_POWER)
  );
  const newMom = await UserModel.create({
    username,
    email,
    passwordHash,
    userData: {
      weight: 0,
      height: 0,
      age: 0,
      bloodType: 0,
      desiredWeight: 0,
      dailyRate: 0,
      notAllowedProducts: [],
    },
    days: [],
  });
  return res.status(201).send({
    email,
    username,
    id: newMom._id,
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res
      .status(403)
      .send({ message: `User with ${email} email doesn't exist` });
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordCorrect) {
    return res.status(403).send({ message: "Password is wrong" });
  }
  const newSession = await SessionModel.create({
    uid: user._id,
  });
  const accessToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
    }
  );
  const refreshToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME,
    }
  );
  const date = new Date();
  const today = `${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()}`;
  const todaySummary = await SummaryModel.findOne({ date: today });
  if (!todaySummary) {
    return res.status(200).send({
      accessToken,
      refreshToken,
      sid: newSession._id,
      todaySummary: {},
      user: {
        email: (user as IMom).email,
        username: (user as IMom).username,
        userData: (user as IMom).userData,
        id: (user as IMom)._id,
      },
    });
  }
  return res.status(200).send({
    accessToken,
    refreshToken,
    sid: newSession._id,
    todaySummary: {
      date: todaySummary.date,
      kcalLeft: todaySummary.kcalLeft,
      kcalConsumed: todaySummary.kcalConsumed,
      dailyRate: todaySummary.dailyRate,
      percentsOfDailyRate: todaySummary.percentsOfDailyRate,
      userId: todaySummary.userId,
      id: todaySummary._id,
    },
    user: {
      email: user.email,
      username: user.username,
      userData: user.userData,
      id: user._id,
    },
  });
};

export const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const accessToken = authorizationHeader.replace("Bearer ", "");
    let payload: string | object;
    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET as string);
    } catch (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    req.user = user;
    req.session = session;
    next();
  } else return res.status(400).send({ message: "No token provided" });
};

export const refreshTokens = async (req: Request, res: Response) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const activeSession = await SessionModel.findById(req.body.sid);
    if (!activeSession) {
      return res.status(404).send({ message: "Invalid session" });
    }
    const reqRefreshToken = authorizationHeader.replace("Bearer ", "");
    let payload: string | object;
    try {
      payload = jwt.verify(reqRefreshToken, process.env.JWT_SECRET as string);
    } catch (err) {
      await SessionModel.findByIdAndDelete(req.body.sid);
      return res.status(401).send({ message: "Unauthorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    await SessionModel.findByIdAndDelete((payload as IJWTPayload).sid);
    const newSession = await SessionModel.create({
      uid: user._id,
    });
    const newAccessToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
      }
    );
    const newRefreshToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME }
    );
    return res
      .status(200)
      .send({ newAccessToken, newRefreshToken, sid: newSession._id });
  }
  return res.status(400).send({ message: "No token provided" });
};

export const logout = async (req: Request, res: Response) => {
  const currentSession = req.session;
  await SessionModel.deleteOne({ _id: (currentSession as ISession)._id });
  req.user = null;
  req.session = null;
  return res.status(204).end();
};
