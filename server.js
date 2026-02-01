// Packages
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from "cors";
import path from 'path';
// Files 
import connectDB from './config/db.js';
import productRoute from "./routes/product.routes.js";
import authRoute from "./routes/auth.routes.js";
import cartFavRoute from "./routes/cart&Fav.routes.js";
import eventRoute from "./routes/event.routes.js";
import adminRoute from "./routes/admin.routes.js";
import dashboardRoute from "./routes/dashboardMatrics.routes.js";
import orderRoute from "./routes/order.routes.js";
import transactionRoute from "./routes/transactionsLog.routes.js";

// CONFIGURATION 
dotenv.config();

// IMPORTAED VARIABLES 
const app = express();
const PORT = process.env.PORT || 3000;
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// CONNECT DATABASE
connectDB();

app.get('/', (req, res) => {
    res.send('Hello World!');
})

// --- AUTH & ADMIN ---
app.use("/api/auth", authRoute);
// --- DASHBOARD (Public for now) ---
app.use("/api/admin", dashboardRoute);
// 
app.use("/api/admin", adminRoute); 
// TransactionsLog
app.use("/api/transactions", transactionRoute);

// --- PRODUCT & OTHER ROUTES ---
app.use("/api", productRoute);
app.use("/api", cartFavRoute);
app.use("/api", eventRoute);
app.use("/api", orderRoute);


// Listening 
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
})