import express from "express";
import OrderController from "../controllers/OrderController"; // Assurez-vous que le fichier est correct
import { jwtCheck, jwtParse } from "../middleware/auth";

const router = express.Router();

// Route pour créer une session de paiement avec Paymee
router.post(
  "/checkout/create-checkout-session",
  jwtCheck, // Middleware pour vérifier le JWT
  jwtParse, // Middleware pour parser les informations de l'utilisateur
  OrderController.createOrder, // Contrôleur pour créer la session de paiement
);

router.get("/", jwtCheck, jwtParse, OrderController.getMyOrders);

// Route pour gérer les webhooks de Paymee
router.post(
  "/webhook/paymee",
  express.raw({ type: "application/json" }), // Middleware pour parser le corps de la requête en JSON brut
  OrderController.paymeeWebhookHandler // Contrôleur pour gérer les webhooks de Paymee
);



export default router;