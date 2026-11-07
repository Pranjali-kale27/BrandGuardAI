import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
  try {
    // Use public DNS servers for MongoDB SRV lookup
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;