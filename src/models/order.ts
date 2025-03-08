import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  restaurant: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  cartItems: { menuItemId: string; name: string; quantity: number }[];
  deliveryDetails: {
    firstname: string;
    lastname: string;
    email: string;
    addressLine1: string;
    city: string;
    phone: string;
  };
  totalAmount: number;
  status: 'placed' | 'paid' | 'failed' | 'canceled' | 'delivered';
  transactionId: { type: String, required: false },
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cartItems: [
    {
      menuItemId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  deliveryDetails: {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true },
    addressLine1: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
  },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['placed', 'paid', 'failed', 'canceled', 'delivered'], default: 'placed' },
  transactionId: { type: String, required: false },  // ✅ Définition de transactionId
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrder>('Order', OrderSchema);
