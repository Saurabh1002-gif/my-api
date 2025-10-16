require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(bodyParser.json());

// ✅ Schema for storing only the distance array
const distanceSchema = new mongoose.Schema({
  distances: {
    type: [Number],
    required: true,
    default: []
  }
});

const DistanceArray = mongoose.model('DistanceArray', distanceSchema);

// ✅ POST /api/data — Accepts an array and stores it
app.post('/api/data', async (req, res) => {
  const { distances } = req.body;

  if (!Array.isArray(distances)) {
    return res.status(400).json({ error: 'Request must include an array of distances.' });
  }

  // 🖨️ Print in format: 1 = 10cm, 2 = 20cm, ...
  distances.forEach((distance, index) => {
    console.log(`${index + 1} = ${distance}cm`);
  });

  try {
    let record = await DistanceArray.findOne();

    if (!record) {
      record = new DistanceArray({ distances });
    } else {
      record.distances.push(...distances);
    }

    await record.save();
    res.status(201).json({ message: 'Distances saved successfully.' });
  } catch (err) {
    console.error('Error saving distances:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ GET /api/data/distances — Return just the distance array
app.get('/api/data/distances', async (req, res) => {
  try {
    const record = await DistanceArray.findOne().lean();
    if (!record) return res.json([]);
    res.json(record.distances);
  } catch (err) {
    console.error('Error fetching distances:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ MongoDB connection + server start
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
