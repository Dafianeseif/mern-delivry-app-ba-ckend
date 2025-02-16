import { Request,Response,NextFunction } from "express";
import { body, validationResult } from "express-validator";

const handleValidationErrors = async (req:Request, res:Response, next:NextFunction):Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
         res.status(400).json({ errors: errors.array() });
         return;
    }
    next();
};

export const validateMyuserRequest = [
    body ("name").isString().notEmpty().withMessage("Name must be a string"),
    body("adressLine1").isString().notEmpty().withMessage("AdressLine1 must be a string"),
    body("country").isString().notEmpty().withMessage("Country must be a string"),
    body("city").isString().notEmpty().withMessage("City must be a string"),
    handleValidationErrors,
];