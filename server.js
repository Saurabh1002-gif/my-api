require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(bodyParser.json());

// ✅ Schema (only distances)
const distanceSchema = new mongoose.Schema({
  distances: {
    type: [Number],
    required: true,
    default: []
  }
});

const DistanceArray = mongoose.model('DistanceArray', distanceSchema);

// ✅ POST: Accept and store distances only
app.post('/api/data', async (req, res) => {
  const { distances } = req.body;

  if (!Array.isArray(distances)) {
    return res.status(400).json({ error: 'Please provide an array of distances only.' });
  }

  // ✅ Print like: 1 = 58cm, etc.
  distances.forEach((distance, i) => {
    console.log(`${i + 1} = ${distance}cm`);
  });

  try {
    // Check if a document already exists
    let record = await DistanceArray.findOne();

    if (!record) {
      // Create a new one
      record = new DistanceArray({ distances });
    } else {
      // Append to existing
      record.distances.push(...distances);
    }

    await record.save();
    res.status(201).json({ message: 'Distances saved.' });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ GET: Return only the distance array
app.get('/api/data/distances', async (req, res) => {
  try {
    const record = await DistanceArray.findOne().lean();
    if (!record) return res.json([]);
    res.json(record.distances);
  } catch (err) {
    console.error('Get error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ DB connect + start
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});
