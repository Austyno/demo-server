const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/uploads', express.static('uploads')); // Serve uploaded files

app.get('/', (req, res) => {
    res.send('Payment Request System API');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
