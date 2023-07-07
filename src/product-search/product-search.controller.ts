import { Request, Response } from "express";
import ProductModel from "../REST-entities/product/product.model";
import { IMom, IProduct } from "../helpers/typescript-helpers/interfaces";

export const findProducts = async (req: Request, res: Response) => {
  const search = req.query.search;
  const lang = !!req.query?.lang ? req.query.lang : "en";
  const title = "title."+lang;
  const foundProducts = await ProductModel.find({
  [title]: { $regex: search, $options: "i" },
  }, {"title.ru": 0}).lean();
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
