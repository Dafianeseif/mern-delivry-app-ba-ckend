import Stripe from "stripe";
import { Request, Response } from "express";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  restaurantId: string;
};

export const stripeWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error: any) {
    // Log de l'erreur
    console.error("Erreur dans la vérification du webhook :", error.message);
    res.status(400).send(`Webhook error: ${error.message}`);
    return;
  }

  // Vérification du type d'événement
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Logs de niveau 'info' pour les événements réussis
    console.info("✅ Webhook: checkout.session.completed");
    console.info("➡️ Session ID:", session.id);
    console.info("➡️ Amount total:", session.amount_total);
    console.info("➡️ Metadata:", session.metadata);
    console.info("➡️ Raw session:", JSON.stringify(session, null, 2));

    // Traitement de la commande
    try {
      const order = await Order.findById(session.metadata?.orderId);

      if (!order) {
        console.warn(`Order not found for ID: ${session.metadata?.orderId}`);
        res.status(404).json({ message: "Order not found" });
        return;
      }

      order.totalAmount = session.amount_total;
      order.status = "paid";
      
      // Logs supplémentaires pour suivre le processus
      console.info(`Order ${order._id} updated with total amount: ${order.totalAmount}`);
      await order.save();
      
      // Réponse de succès
      res.status(200).send();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la commande :", error);
      res.status(500).send("Internal Server Error");
    }
  }
};

const createCheckoutSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const checkoutSessionRequest: CheckoutSessionRequest = req.body;

    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const newOrder: any = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );

    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurant._id.toString()
    );

    if (!session.url) {
      res.status(500).json({ message: "Error creating stripe session" });
      return;
    }

    await newOrder.save();
    res.json({ url: session.url });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.raw.message });
  }
};

const createLineItems = (
  checkoutSessionRequest: CheckoutSessionRequest,
  menuItems: MenuItemType[]
) => {
  const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
    const menuItem = menuItems.find(
      (item) => item._id.toString() === cartItem.menuItemId.toString()
    );

    if (!menuItem) {
      throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
    }

    const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "usd",
        unit_amount: menuItem.price,
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };

    return line_item;
  });

  return lineItems;
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string
) => {
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice,
            currency: "usd",
          },
        },
      },
    ],
    mode: "payment",
    metadata: {
      orderId,
      restaurantId,
    },
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });

  return sessionData;
};

export default {
  getMyOrders,
  createCheckoutSession,
  stripeWebhookHandler,
};
