import mongoose from 'mongoose'; //function to connect to mongoose. We will need to call on this when we start the server
export async function connectDb() {
    return mongoose.connect(process.env.MONGODB_URI!);
}
