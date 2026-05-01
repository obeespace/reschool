import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string | undefined;
const MONGODB_DIRECT_URI = process.env.MONGODB_DIRECT_URI as string | undefined;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI");
  }
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const connectOptions = {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      family: 4
    } as const;

    const primaryUri = MONGODB_DIRECT_URI || MONGODB_URI;
    const fallbackUri = primaryUri === MONGODB_URI ? MONGODB_DIRECT_URI : MONGODB_URI;

    cached.promise = mongoose
      .connect(primaryUri, connectOptions)
      .then((mongoose) => mongoose)
      .catch(async (error) => {
        const isSrv = primaryUri?.startsWith("mongodb+srv://");
        const isSrvTimeout = error?.code === "ETIMEOUT" && error?.syscall === "querySrv";

        if (fallbackUri) {
          try {
            return await mongoose.connect(fallbackUri, connectOptions);
          } catch {
            // fall through to throw original error
          }
        }

        cached.promise = null;
        if (isSrv && isSrvTimeout) {
          throw new Error(
            "MongoDB SRV lookup timed out. Check network/DNS or set MONGODB_DIRECT_URI with a mongodb:// connection string."
          );
        }

        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
