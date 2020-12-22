import { Request, Response } from "express";
import ProductModel from "../REST-entities/product/product.model";
import { IMom, IProduct } from "../helpers/typescript-helpers/interfaces";

export const findProducts = async (req: Request, res: Response) => {
  const { search } = req.query;
  const foundProducts = await ProductModel.find({
    "title.ru": { $regex: search, $options: "i" },
  }).lean();
  const filteredProducts = foundProducts.filter(
    // @ts-ignore
    (product) =>
      product.groupBloodNotAllowed[(req.user as IMom).userData.bloodType] ===
      false
  );
  if (!filteredProducts.length) {
    return res
      .status(400)
      .send({ message: "No allowed products found for this query" });
  }
  return res.status(200).send(filteredProducts);
};
