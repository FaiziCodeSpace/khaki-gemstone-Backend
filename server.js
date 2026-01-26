import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import productRoute from "./routes/product.routes.js";
import authRoute from "./routes/auth.routes.js";
import cartFavRoute from "./routes/cart&Fav.routes.js"
import eventRoute from "./routes/event.routes.js"
import adminRoute from "./routes/admin.routes.js";
import dashboardRoute from "./routes/dashboardMatrics.routes.js"
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

// Auth
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute); 
// PRODUCT ROUTES
app.use("/api", productRoute);
// Cart
app.use("/api", cartFavRoute);
app.use("/api", cartFavRoute);
// Event
app.use('/api', eventRoute)

// Admin
app.use("/api", dashboardRoute);


// Listening 
app.listen(PORT, ()=>{
    console.log(`http://localhost:${PORT}`);
})