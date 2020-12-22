import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import {
  IMom,
  IMomPopulated,
  IProduct,
} from "../helpers/typescript-helpers/interfaces";
import Server from "../server/server";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";
import { BloodType } from "../helpers/typescript-helpers/enums";

describe("Daily-rate router test suite", () => {
  let app: Application;
  let response: Response;
  let secondResponse: Response;
  let accessToken: string;
  let createdUser: IMom | IMomPopulated | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/daily-rate`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    response = await supertest(app).post("/auth/register").send({
      email: "test@email.com",
      password: "qwerty123",
      username: "Test",
    });
    createdUser = await UserModel.findById(response.body.id);
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    accessToken = secondResponse.body.accessToken;
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: response.body.email });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await mongoose.connection.close();
  });

  describe("POST /daily-rate", () => {
    let response: Response;

    const validReqBody = {
      weight: 90,
      height: 180,
      age: 30,
      desiredWeight: 80,
      bloodType: BloodType.TWO,
    };

    const dailyRate = 10 * 90 + 6.25 * 180 - 5 * 30 - 161 - 10 * (90 - 80);

    const invalidReqBody = {
      weight: 90,
      height: 180,
      age: 30,
      desiredWeight: 80,
    };

    const secondInvalidReqBody = {
      weight: -10,
      height: 180,
      age: 30,
      desiredWeight: 80,
      bloodType: BloodType.TWO,
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/daily-rate").send(validReqBody);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          dailyRate,
          notAllowedProducts: response.body.notAllowedProducts,
        });
      });

      it("Should return a list of not allowed products", () => {
        expect(response.body.notAllowedProducts).toBeTruthy();
      });

      it("Should return a right list of not allowed products", () => {
        expect(
          response.body.notAllowedProducts.find(
            (product: IProduct) =>
              product.groupBloodNotAllowed[validReqBody.bloodType] === true
          )
        ).toBeFalsy();
      });
    });

    context("With invalidReqBody (no 'bloodType' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/daily-rate")
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'bloodType' is required", () => {
        expect(response.body.message).toBe('"bloodType" is required');
      });
    });

    context("With secondInvalidReqBody ('weight' is less than 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/daily-rate")
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'weight' must be greater than or equal to 20", () => {
        expect(response.body.message).toBe(
          '"weight" must be greater than or equal to 20'
        );
      });
    });
  });

  describe("POST /daily-rate/:userId", () => {
    let response: Response;

    const validReqBody = {
      weight: 90,
      height: 180,
      age: 30,
      desiredWeight: 80,
      bloodType: BloodType.TWO,
    };

    const dailyRate = 10 * 90 + 6.25 * 180 - 5 * 30 - 161 - 10 * (90 - 80);

    const invalidReqBody = {
      weight: 90,
      height: 180,
      age: 30,
      desiredWeight: 80,
    };

    const secondInvalidReqBody = {
      weight: -10,
      height: 180,
      age: 30,
      desiredWeight: 80,
      bloodType: BloodType.TWO,
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/daily-rate/${(createdUser as IMom)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          dailyRate,
          summaries: [],
          id: (createdUser as IMom)._id.toString(),
          notAllowedProducts: response.body.notAllowedProducts,
        });
      });

      it("Should return a list of not allowed products", () => {
        expect(response.body.notAllowedProducts).toBeTruthy();
      });
    });

    context("With invalidReqBody ('bloodType' not provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/daily-rate/${(createdUser as IMom)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'bloodType' is required", () => {
        expect(response.body.message).toBe('"bloodType" is required');
      });
    });

    context("With secondInvalidReqBody ('weight' is less than 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/daily-rate/${(createdUser as IMom)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'weight' must be greater than or equal to 20", () => {
        expect(response.body.message).toBe(
          '"weight" must be greater than or equal to 20'
        );
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/daily-rate/${(createdUser as IMom)._id}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("Without invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/daily-rate/${(createdUser as IMom)._id}`)
          .set("Authorization", `Bearer qwerty123`)
          .send(secondInvalidReqBody);
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
