import mongoose from 'mongoose';

// Serverless-safe connection cache. Vercel re-runs this module on every cold
// start, so a fire-and-forget connect() risks a request hitting the DB before
// it's ready. This caches the connection (or the in-flight promise) on the
// global object so a warm invocation reuses it instantly, and a request that
// arrives mid-connect just awaits the same promise instead of racing it.
let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGO_URI, { bufferCommands: false })
            .catch((err) => {
                cached.promise = null; // let the next request retry instead of staying stuck
                throw err;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

export default connectDB;
