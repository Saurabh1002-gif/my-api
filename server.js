const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// === CONFIG ===
const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/hardwareData'; // Change if using MongoDB Atlas

// === MIDDLEWARE ===
app.use(bodyParser.json());

// === MONGOOSE SCHEMA & MODEL ===
const dataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  distance: { type: Number, required: true }, // in cm
  time: { type: String, required: true },     // e.g., "14:23:00"
  date: { type: String, required: true },     // e.g., "2025-10-15"
});

const Data = mongoose.model('Data', dataSchema);

// === ROUTES ===

// Test route
app.get('/', (req, res) => {
  res.send('API is working!');
});

// Create (POST)
app.post('/api/data', async (req, res) => {
  try {
    const { name, distance, time, date } = req.body;

    if (!name || !distance || !time || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newData = new Data({ name, distance, time, date });
    await newData.save();

    res.status(201).json({ message: 'Data saved successfully.', data: newData });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Read all data (GET)
app.get('/api/data', async (req, res) => {
  try {
    const allData = await Data.find().sort({ date: -1, time: -1 });
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// === DB CONNECT AND START SERVER ===
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
