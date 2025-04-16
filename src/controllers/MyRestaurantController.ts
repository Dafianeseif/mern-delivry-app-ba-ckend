import { Request, Response } from "express";
import Restaurant from "../models/restaurant";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import Order from "../models/order";

const getRestaurantById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; 

    const restaurant = await Restaurant.findById(id).exec();

    if (!restaurant) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};

const getMyRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findOne({ _id: id,
      user: req.userId, });
    if (!restaurant) {
      res.status(404).json({ message: "restaurant not found" });

      return;
    }
    res.json(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};


const getMyRestaurants = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const restaurants = await Restaurant.find();

    if (!restaurants || restaurants.length === 0) {
      res.status(404).json({ message: "No restaurants found" });
      return;
    }

    res.json(restaurants);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurants" });
  }
};



const createMyRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    const restaurant = new Restaurant(req.body);
    restaurant.imageUrl = imageUrl;
    restaurant.user = new mongoose.Types.ObjectId(req.userId);
    restaurant.lastUpdated = new Date();

    await restaurant.save();

    res.status(201).send(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


const updateMyRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    console.log("ID reçu pour la mise à jour :", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid restaurant ID" });
      return;
    }

    const restaurant = await Restaurant.findOne({
      _id: id,
    });

    if (!restaurant) {
      res.status(404).json({ message: "restaurant not found" });
      return;
    }

    console.log("Mise à jour du restaurant :", restaurant);

    restaurant.restaurantName = req.body.restaurantName ?? restaurant.restaurantName;
    restaurant.city = req.body.city ?? restaurant.city;
    restaurant.country = req.body.country ?? restaurant.country;
    restaurant.deliveryPrice = req.body.deliveryPrice ?? restaurant.deliveryPrice;
    restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime ?? restaurant.estimatedDeliveryTime;
    restaurant.cuisines = req.body.cuisines ?? restaurant.cuisines;
    restaurant.menuItems = req.body.menuItems ?? restaurant.menuItems;
    restaurant.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadImage(req.file as Express.Multer.File);
      restaurant.imageUrl = imageUrl;
    }

    await restaurant.save();
    res.status(200).send(restaurant);
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};



const getMyRestaurantOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
   

    const orders = await Order.find()
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};



const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "order not found" });
      return;
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    if (restaurant?.user?._id.toString() !== req.userId) {
      res.status(401).send();
      return;
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "unable to update order status" });
  }
};

const uploadImage = async (file: Express.Multer.File) => {
  const image = file;
  const base64Image = Buffer.from(image.buffer).toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadResponse.url;
};




export default {
  updateOrderStatus,
  getMyRestaurantOrders,
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
  getMyRestaurants,
  getRestaurantById,
};
