import { Application } from "express";
import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { IMom } from "../../helpers/typescript-helpers/interfaces";
import { BloodType } from "../../helpers/typescript-helpers/enums";
import Server from "../../server/server";
import UserModel from "./user.model";
import SessionModel from "../session/session.model";
import DayModel from "../day/day.model";
import SummaryModel from "../summary/summary.model";

describe("User router test suite", () => {
  let app: Application;
  let response: Response;
  let createdDay: Response;
  let accessToken: string;
  let createdUser: Document | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/user`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    await supertest(app).post("/auth/register").send({
      email: "test@email.com",
      password: "qwerty123",
      username: "Test",
    });
    createdUser = await UserModel.findOne({ email: "test@email.com" });
    response = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    accessToken = response.body.accessToken;
    await supertest(app)
      .post(`/daily-rate/${(createdUser as IMom)._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        weight: 90,
        height: 180,
        age: 30,
        desiredWeight: 80,
        bloodType: BloodType.TWO,
      });
    createdDay = await supertest(app)
      .post("/day")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2020-12-31",
        productId: "5d51694802b2373622ff552c",
        weight: 200,
      });
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: (createdUser as IMom).email });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await DayModel.deleteOne({ _id: createdDay.body.newDay.id });
    await SummaryModel.deleteOne({ userId: (createdUser as IMom)._id });
    await mongoose.connection.close();
  });

  describe("GET /user", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/user")
          .set("Authorization", `Bearer ${accessToken}`);
        createdUser = await UserModel.findOne({
          email: "test@email.com",
        }).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          username: "Test",
          email: "test@email.com",
          id: (createdUser as IMom)._id.toString(),
          userData: {
            weight: 90,
            height: 180,
            age: 30,
            desiredWeight: 80,
            bloodType: BloodType.TWO,
            dailyRate: 1614,
            notAllowedProducts: (createdUser as IMom).userData
              .notAllowedProducts,
          },
          days: [
            {
              date: "2020-12-31",
              eatenProducts: [
                {
                  title: "Меланж яичный",
                  weight: 200,
                  kcal: 314,
                  id: createdDay.body.eatenProduct.id,
                },
              ],
              _id: createdDay.body.newDay.id,
              __v: 0,
              daySummary: {
                date: "2020-12-31",
                kcalLeft: 1300,
                kcalConsumed: 314,
                dailyRate: 1614,
                percentsOfDailyRate: 19.454770755886,
                _id: createdDay.body.newSummary.id,
                userId: (createdUser as IMom)._id.toString(),
                __v: 0,
              },
            },
          ],
        });
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/user");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/user")
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });
});
