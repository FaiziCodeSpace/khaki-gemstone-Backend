import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import productRoute from "./routes/product.routes.js";
import authRoute from "./routes/auth.routes.js";
import cartFavRoute from "./routes/cart&Fav.router.js"
import eventRoute from "./routes/event.routes.js"
import cors from "cors"; 

// CONFIGURATION 
dotenv.config();

// IMPORTAED VARIABLES 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Middleware
app.use(express.json());

// CONNECT DATABASE
connectDB();

app.get('/', (req, res)=>{
    res.send('Hello World!');
}) 

// PRODUCT ROUTES
app.use("/api/auth", authRoute);
app.use("/api", productRoute);
app.use("/api", cartFavRoute);
app.use("/api", cartFavRoute);
app.use('/api', eventRoute)


// Listening 
app.listen(PORT, ()=>{
    console.log(`http://localhost:${PORT}`);
})