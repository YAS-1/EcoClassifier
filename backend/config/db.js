import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();


// creating a db connection
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Successfully Connected to database");
    } catch (error) {
        console.log(`Error connecting to database: ${error}`);
        process.exit(1);
    }
}