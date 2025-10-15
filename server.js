require('dotenv').config(); // <== Load .env at the top

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(bodyParser.json());

// Mongoose Schema
const dataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  distance: { type: Number, required: true }, // in cm
  time: { type: String, required: true },     // e.g., "14:23:00"
  date: { type: String, required: true },     // e.g., "2025-10-15"
});

const Data = mongoose.model('Data', dataSchema);

// Routes
app.get('/', (req, res) => {
  res.send('API is working!');
});

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

app.get('/api/data', async (req, res) => {
  try {
    const allData = await Data.find().sort({ date: -1, time: -1 });
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
