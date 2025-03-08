import axios from 'axios';
import { Request, Response } from 'express';
import crypto from 'crypto';
import Restaurant from '../models/restaurant';
import Order from '../models/order';

const PAYMEE_API_KEY = process.env.PAYMEE_API_KEY as string;
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const PAYMEE_URL = process.env.NODE_ENV === 'production'
  ? 'https://app.paymee.tn/api/v2/payments/create'
  : 'https://sandbox.paymee.tn/api/v2/payments/create';

// Création d'une commande et initiation du paiement (Step 1)
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deliveryDetails, cartItems, restaurantId } = req.body;

    // Validation des champs obligatoires
    if (!deliveryDetails || !deliveryDetails.firstname || !deliveryDetails.lastname) {
      res.status(400).json({ error: 'First name and last name are required' });
      return;
    }

    if (!restaurantId || !cartItems || cartItems.length === 0) {
      res.status(400).json({ error: 'Restaurant ID and cart items are required' });
      return;
    }

    // Recherche du restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      res.status(404).json({ message: 'Restaurant not found' });
      return;
    }

    // Calcul du montant total
    const totalAmountInCents = calculateTotalAmount(cartItems, restaurant.menuItems) + restaurant.deliveryPrice;
    const totalAmount = parseFloat((totalAmountInCents / 100).toFixed(2)); // Conversion en dinars

    // Création de la commande en base de données
    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: 'pending',
      deliveryDetails,
      cartItems,
      totalAmount,
      createdAt: new Date(),
    });
    await newOrder.save();

    // Données pour l'API Paymee
    const paymentData = {
      amount: totalAmount,  
      note: `Order from ${restaurant.restaurantName}`,
      first_name: deliveryDetails.firstname,
      last_name: deliveryDetails.lastname,
      email: deliveryDetails.email,
      phone: deliveryDetails.phone,
      return_url: `${FRONTEND_URL}/order-confirmation`,  
      cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
      webhook_url: "https://www.webhook_url.tn", // URL de ton webhook
    };
    
    // Envoi de la requête à Paymee
    const response = await axios.post(PAYMEE_URL, paymentData, {
      headers: {
        'Authorization': `Token ${PAYMEE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.status) {
      console.error('Paymee API error:', response.data);
      res.status(500).json({ message: 'Error creating Paymee session' });
      return;
    }

    // Envoi de l'URL de paiement au frontend
    res.json({
      paymentUrl: response.data.data.payment_url,
      cartItems, // ✅ On renvoie les articles pour affichage dans le frontend
    });

  } catch (error: any) {
    console.error('Error processing the order:', error);
    res.status(500).json({ message: 'Error processing the order' });
  }
};

// Gestion du Webhook Paymee (Step 3)
export const paymeeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, check_sum, payment_status, order_id, amount, transaction_id } = req.body;

    // Vérification de l'intégrité des données
    const expectedCheckSum = crypto.createHash('md5')
      .update(token + (payment_status ? '1' : '0') + PAYMEE_API_KEY)
      .digest('hex');

    if (check_sum !== expectedCheckSum) {
      console.error('Check sum mismatch');
      res.status(400).json({ message: 'Invalid checksum' });
      return;
    }

    // Recherche et mise à jour de la commande
    const order = await Order.findById(order_id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    order.status = payment_status ? 'paid' : 'failed';
    order.transactionId = payment_status ? transaction_id : null;
    order.totalAmount = amount;

    await order.save();
    res.status(200).send();

  } catch (error) {
    console.error('Webhook handling failed:', error);
    res.status(500).json({ message: 'Webhook handling failed' });
  }
};

// Fonction de calcul du montant total
const calculateTotalAmount = (cartItems: any[], menuItems: any[]) => {
  return cartItems.reduce((total, cartItem) => {
    const menuItem = menuItems.find(item => item._id.toString() === cartItem.menuItemId);
    if (menuItem) {
      total += menuItem.price * parseInt(cartItem.quantity);
    }
    return total;
  }, 0);
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Récupérer l'ID de l'utilisateur à partir du middleware jwtParse
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: User ID not found" });
      return;
    }

    // Rechercher toutes les commandes associées à cet utilisateur
    const orders = await Order.find({ user: userId })
      .populate("restaurant", "restaurantName estimatedDeliveryTime imageUrl")
      .sort({ createdAt: -1 }); // Trier par date de création (plus récent en premier)

    if (!orders || orders.length === 0) {
      res.status(200).json({ message: "No orders found", orders: [] });
      return;
    }

    // Réponse avec les commandes
    res.status(200).json({ orders });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Error fetching orders" });
  }
};
export default {
  createOrder,
  paymeeWebhookHandler,
  getMyOrders,
};
