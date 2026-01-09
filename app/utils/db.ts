import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI as string);
};

export default connectDB;
