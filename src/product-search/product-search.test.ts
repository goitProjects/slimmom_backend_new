import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import { BloodType } from "./../helpers/typescript-helpers/enums";
import {
  IMom,
  IMomPopulated,
} from "./../helpers/typescript-helpers/interfaces";
import Server from "../server/server";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";

describe("Product router test suite", () => {
  let app: Application;
  let response: Response;
  let secondResponse: Response;
  let accessToken: string;
  let createdUser: IMom | IMomPopulated | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/product`;
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
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    accessToken = secondResponse.body.accessToken;
    createdUser = await UserModel.findById(response.body.id);
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: response.body.email });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await mongoose.connection.close();
  });

  describe("GET /product?search={search}", () => {
    let response: Response;

    context("Valid request", () => {
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
          .get(encodeURI("/product?search=омлет"))
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          {
            _id: "5d51694802b2373622ff5530",
            categories: ["яйца"],
            weight: 100,
            title: {
              ru: "Омлет с сыром",
              ua: "Омлет із сиром",
            },
            calories: 342,
            groupBloodNotAllowed: [null, true, false, false, false],
            __v: 0,
          },
          {
            _id: "5d51694802b2373622ff552f",
            categories: ["яйца"],
            weight: 100,
            title: {
              ru: "Омлет из яичного порошка",
              ua: "Омлет з яєчного порошку",
            },
            calories: 200,
            groupBloodNotAllowed: [null, true, false, false, false],
            __v: 0,
          },
          {
            _id: "5d51694802b2373622ff552e",
            categories: ["яйца"],
            weight: 100,
            title: {
              ru: "Омлет из взбитых сливок",
              ua: "Омлет зі збитих вершків",
            },
            calories: 257,
            groupBloodNotAllowed: [null, true, false, false, false],
            __v: 0,
          },
          {
            _id: "5d51694802b2373622ff552d",
            categories: ["яйца"],
            weight: 100,
            title: {
              ru: "Омлет",
              ua: "Ямлет",
            },
            calories: 184,
            groupBloodNotAllowed: [null, true, false, false, false],
            __v: 0,
          },
        ]);
      });
    });

    context("Invalid request (no results for 'search' query)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/product?search=${encodeURIComponent("qwerty123")}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should return an expected result", () => {
        expect(response.body.message).toBe(
          "No allowed products found for this query"
        );
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(
          `/product?search=${encodeURIComponent("омлет")}`
        );
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
          .get(`/product?search=${encodeURIComponent("омлет")}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Without providing 'search' query", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/product`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe('"search" is required');
      });
    });
  });
});
