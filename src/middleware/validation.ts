import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

const handleValidationErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateMyuserRequest = [
  body("name").isString().notEmpty().withMessage("Name must be a string"),
  body("adressLine1")
    .isString()
    .notEmpty()
    .withMessage("AdressLine1 must be a string"),
  body("country").isString().notEmpty().withMessage("Country must be a string"),
  body("city").isString().notEmpty().withMessage("City must be a string"),
  handleValidationErrors,
];
export const validateMyRestaurantRequest = [
  body("restaurantName").notEmpty().withMessage("Restaurant name is required "),
  body("city").notEmpty().withMessage("city  is required "),
  body("country").notEmpty().withMessage("country  is required "),
  body("deliveryPrice")
    .isFloat({ min: 0 })
    .withMessage("Delivery price must be a positive number "),
  body("estimatedDeliveryTime")
    .isInt({ min: 0 })
    .withMessage("estimated Delivery Time must be a positive number "),
  body("cuisines")
    .isArray()
    .withMessage("Cuisine must be array ")
    .not()
    .isEmpty()
    .withMessage("cuisine array cannot be empty"),
  body("menuItems").isArray().withMessage("Menu items must be  an array "),
  body("menuItems.*.name")
    .notEmpty()
    .withMessage("menu Item name   is required "),
  body("menuItems.*.price")
    .isFloat({ min: 0 })
    .withMessage("menu Item price   is required and must be a postive number "),
  handleValidationErrors,
];
