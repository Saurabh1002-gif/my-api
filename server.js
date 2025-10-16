require('dotenv').config(); // Load environment variables

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
  name: { type: Number, required: true }, // Changed from String to Number for proper sorting
  distance: { type: Number, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
});

const Data = mongoose.model('Data', dataSchema);

// Routes
app.get('/', (req, res) => {
  res.send('API is working!');
});

// ✅ Create new data
app.post('/api/data', async (req, res) => {
  try {
    const { name, distance, time, date } = req.body;

    if (name === undefined || distance === undefined || !time || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newData = new Data({ name, distance, time, date });
    await newData.save();

    res.status(201).json({ message: 'Data saved successfully.', data: newData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Get all data (full)
app.get('/api/data', async (req, res) => {
  try {
    const allData = await Data.find().sort({ date: -1, time: -1 });
    res.json(allData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ NEW: Get only distances sorted by name (ascending)
app.get('/api/data/distances', async (req, res) => {
  try {
    const data = await Data.find().sort({ name: 1 }); // Sort by device name ascending
    const distances = data.map(entry => entry.distance); // Only distance values
    res.json(distances); // Output: [55, 33, 87] etc.
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
