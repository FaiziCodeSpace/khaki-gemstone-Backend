import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Product from './models/Products.js';

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

  const products = [];

app.post('/seed', async (req, res) => {
  try {

    await Product.deleteMany({});
    await Product.insertMany(products);

    return res.status(201).json({
      message: 'Products seeded successfully',
      count: products.length
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Listening 
app.listen(PORT, ()=>{
    console.log(`http://localhost:${PORT}`);
})