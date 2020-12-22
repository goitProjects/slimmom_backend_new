import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import SummaryModel from "../summary/summary.model";
import {
  IMom,
  IMomPopulated,
  IDaySummary,
  IDay,
  IDayPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import { MongoDBObjectId } from "../../helpers/typescript-helpers/types";
import DayModel from "./day.model";
import { BloodType } from "../../helpers/typescript-helpers/enums";

describe("Day router test suite", () => {
  let app: Application;
  let response: Response;
  let secondResponse: Response;
  let accessToken: string;
  let secondAccessToken: string;
  let createdUser: IMom | IMomPopulated | null;
  let secondCreatedUser: IMom | IMomPopulated | null;
  let dayId: MongoDBObjectId;
  let secondDayId: MongoDBObjectId;
  let eatenProductId: string;
  let dayData: IDay | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/day`;
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
    await supertest(app).post("/auth/register").send({
      email: "testt@email.com",
      password: "qwerty123",
      username: "Test",
    });
    createdUser = await UserModel.findOne({ email: "test@email.com" });
    secondCreatedUser = await UserModel.findOne({ email: "testt@email.com" });
    response = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "testt@email.com", password: "qwerty123" });
    accessToken = response.body.accessToken;
    secondAccessToken = secondResponse.body.accessToken;
  });

  afterAll(async () => {
    await SummaryModel.deleteOne({ userId: (createdUser as IMom)._id });
    await UserModel.deleteOne({ email: response.body.user.email });
    await UserModel.deleteOne({ email: secondResponse.body.user.email });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await mongoose.connection.close();
  });

  describe("POST /day", () => {
    let response: Response;
    let newSummary: IDaySummary | null;
    let daySummary: IDaySummary | null;
    let day: IDay | IDayPopulated | null;

    const validReqBody = {
      date: "2020-12-31",
      productId: "5d51694802b2373622ff552c",
      weight: 200,
    };

    const invalidReqBody = {
      date: "2020-12-31",
      productId: "5d51694802b2373622ff552c",
    };

    const secondInvalidReqBody = {
      date: "2020-12-31",
      productId: "qwerty123",
      weight: 200,
    };

    const thirdInvalidReqBody = {
      date: "2020-13-31",
      productId: "5d51694802b2373622ff552c",
      weight: 200,
    };

    context("Before counting dailyRate", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that dailyRate wasn't counted", () => {
        expect(response.body.message).toBe(
          "Please, count your daily rate first"
        );
      });
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
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
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        newSummary = await SummaryModel.findById(response.body.newSummary.id);
        dayId = response.body.newDay.id.toString();
        day = await DayModel.findById(dayId);
        eatenProductId = response.body.eatenProduct.id;
        createdUser = await UserModel.findById((createdUser as IMom)._id);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          eatenProduct: {
            title: "Меланж яичный",
            weight: validReqBody.weight,
            kcal: 314,
            id: response.body.eatenProduct.id,
          },
          newDay: {
            eatenProducts: [
              {
                title: "Меланж яичный",
                weight: validReqBody.weight,
                kcal: 314,
                id: response.body.eatenProduct.id,
              },
            ],
            id: response.body.newDay.id.toString(),
            date: validReqBody.date,
            daySummary: response.body.newDay.daySummary,
          },
          newSummary: {
            date: validReqBody.date,
            kcalLeft: 1300,
            kcalConsumed: 314,
            dailyRate: 1614,
            percentsOfDailyRate: 19.454770755886,
            id: (newSummary as IDaySummary)._id.toString(),
            userId: (createdUser as IMom)._id.toString(),
          },
        });
      });

      it("Should create new summary in DB", () => {
        expect(newSummary).toBeTruthy();
      });

      it("Should create an id for eatenProduct", () => {
        expect(response.body.eatenProduct.id).toBeTruthy();
      });

      it("Should add a new day in DB", () => {
        expect(day).toBeTruthy();
      });

      it("Should add a new day to user in DB", () => {
        expect((createdUser as IMom).days[0].toString()).toBe(dayId.toString());
      });
    });

    context("With validReqBody (same day)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        daySummary = await SummaryModel.findById(response.body.daySummary.id);
        secondDayId = response.body.day.id;
        day = await DayModel.findById(secondDayId);
        dayData = response.body.day;
        (dayData as IDay).daySummary = response.body.daySummary;
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          eatenProduct: {
            title: "Меланж яичный",
            weight: validReqBody.weight,
            kcal: 314,
            id: response.body.eatenProduct.id,
          },
          day: {
            eatenProducts: [
              {
                title: "Меланж яичный",
                weight: validReqBody.weight,
                kcal: 314,
                id: eatenProductId,
              },
              {
                title: "Меланж яичный",
                weight: validReqBody.weight,
                kcal: 314,
                id: response.body.eatenProduct.id,
              },
            ],
            id: response.body.day.id.toString(),
            date: validReqBody.date,
            daySummary: response.body.day.daySummary,
          },
          daySummary: {
            date: validReqBody.date,
            kcalLeft: 986,
            kcalConsumed: 628,
            dailyRate: 1614,
            percentsOfDailyRate: 38.909541511772,
            id: (daySummary as IDaySummary)._id.toString(),
            userId: (createdUser as IMom)._id.toString(),
          },
        });
      });

      it("Should update existing day summary in DB", () => {
        expect((daySummary as IDaySummary).toObject() as IDaySummary).toEqual({
          date: validReqBody.date,
          kcalLeft: 986,
          kcalConsumed: 628,
          dailyRate: 1614,
          percentsOfDailyRate: 38.909541511772,
          _id: (daySummary as IDaySummary)._id,
          userId: (createdUser as IMom)._id,
          __v: 0,
        });
      });

      it("Should update existing day DB", () => {
        expect((day as IDay).eatenProducts.length).toBe(2);
      });

      it("Should create an id for 'eatenProduct'", () => {
        expect(response.body.eatenProduct.id).toBeTruthy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/day").send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .send(validReqBody)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalidReqBody (no 'weight' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'weight' wasn't provided", () => {
        expect(response.body.message).toBe('"weight" is required');
      });
    });

    context("With secondInvalidReqBody (invalid 'productId')", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'productId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'productId'. Must be MongoDB ObjectId"
        );
      });
    });

    context("With thirdInvalidReqBody (invalid 'date' format)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(thirdInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'date' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'date'. Use YYYY-MM-DD string format"
        );
      });
    });
  });

  describe("POST /day/info", () => {
    let response: Response;

    const validReqBody = {
      date: "2020-12-31",
    };

    const secondValidReqBody = {
      date: "2020-01-01",
    };

    const invalidReqBody = {
      date: "2020-13-31",
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/day/info`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({ ...dayData });
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post(`/day/info`).send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With secondValidReqBody", () => {
      const dailyRate = 10 * 90 + 6.25 * 180 - 5 * 30 - 161 - 10 * (90 - 80);

      beforeAll(async () => {
        response = await supertest(app)
          .post(`/day/info`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondValidReqBody);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          kcalLeft: dailyRate,
          kcalConsumed: 0,
          dailyRate: dailyRate,
          percentsOfDailyRate: 0,
        });
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post(`/day/info`).send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/day/info`)
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalidReqBody ('date' is invalid )", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/day/info")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that date is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'date'. Use YYYY-MM-DD string format"
        );
      });
    });
  });

  describe("DELETE /day", () => {
    let response: Response;
    let newDaySummary: IDaySummary | null;
    let newDay: IDay | IDayPopulated | null;

    const validReqBody = {
      dayId,
      eatenProductId,
    };

    const invalidReqBody = {
      dayId,
    };

    const secondInvalidReqBody = {
      dayId: "qwerty123",
      eatenProductId,
    };

    afterAll(async () => {
      await DayModel.deleteOne({ _id: dayId });
    });

    context("With another account", () => {
      beforeAll(async () => {
        validReqBody.dayId = dayId;
        validReqBody.eatenProductId = eatenProductId;
        await supertest(app)
          .post(`/daily-rate/${(secondCreatedUser as IMom)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send({
            weight: 90,
            height: 180,
            age: 30,
            desiredWeight: 85,
            bloodType: BloodType.ONE,
          });
        response = await supertest(app)
          .delete("/day")
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should return a 404 status code", () => {
        expect(response.body.message).toBe("Day not found");
      });
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        validReqBody.dayId = dayId;
        validReqBody.eatenProductId = eatenProductId;
        invalidReqBody.dayId = dayId;
        response = await supertest(app)
          .delete("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        newDaySummary = await SummaryModel.findById(
          response.body.newDaySummary.id
        );
        newDay = await DayModel.findById(validReqBody.dayId);
      });

      afterAll(async () => {
        await DayModel.deleteOne({ _id: secondDayId });
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newDaySummary: {
            date: "2020-12-31",
            kcalLeft: 1300,
            kcalConsumed: 314,
            dailyRate: 1614,
            percentsOfDailyRate: 19.454770755886,
            id: (newDaySummary as IDaySummary)._id.toString(),
            userId: (createdUser as IMom)._id.toString(),
          },
        });
      });

      it("Should delete a product from DB", () => {
        expect(
          (newDay as IDay).eatenProducts.find(
            (product) => product.id === validReqBody.eatenProductId
          )
        ).toBeFalsy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete("/day").send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/day")
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalidReqBody (no 'eatenProductId' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'eatenProductId' is required", () => {
        expect(response.body.message).toBe('"eatenProductId" is required');
      });
    });

    context("With secondInvalidReqBody (invalid dayId)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/day")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'dayId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'dayId'. Must be MongoDB ObjectId"
        );
      });
    });
  });
});
