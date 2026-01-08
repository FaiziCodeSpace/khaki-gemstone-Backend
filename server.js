import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Product from './models/common/Products.js';
import productRoutes from "./routes/product.routes.js";

// CONFIGURATION 
dotenv.config();

// IMPORTAED VARIABLES 
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CONNECT DATABASE
connectDB();


app.get('/', (req, res)=>{
    res.send('Hello World!');
}) 

// PRODUCT ROUTES
app.use("/api", productRoutes);

// Listening 
app.listen(PORT, ()=>{
    console.log(`http://localhost:${PORT}`);
})