require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(bodyParser.json());

// 🔸 Schema: Full Data (collection: datas)
const dataSchema = new mongoose.Schema({
  name: { type: Number, required: true },
  distance: { type: Number, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true }
});
const Data = mongoose.model('Data', dataSchema, 'datas'); // uses collection 'datas'

// 🔸 Schema: Filtered Distances (collection: distancearrays)
const filteredDistanceSchema = new mongoose.Schema({
  name: { type: Number, required: true },
  distance: { type: Number, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true }
});
const FilteredDistance = mongoose.model('FilteredDistance', filteredDistanceSchema, 'distancearrays');

// ✅ Route: Test
app.get('/', (req, res) => {
  res.send('API is working!');
});

// ✅ Route: POST data
app.post('/api/data', async (req, res) => {
  try {
    const { name, distance, time, date } = req.body;

    if (name === undefined || distance === undefined || !time || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Save to full "datas" collection
    const newData = new Data({ name, distance, time, date });
    await newData.save();

    // Check 10-second filter for distancearrays
    const lastEntry = await FilteredDistance.findOne({ name }).sort({ date: -1, time: -1 });

    let shouldSave = false;

    if (!lastEntry) {
      shouldSave = true;
    } else {
      const lastTime = new Date(`${lastEntry.date}T${lastEntry.time}`);
      const currentTime = new Date(`${date}T${time}`);
      const diff = (currentTime - lastTime) / 1000;

      if (diff <= 10) {
        shouldSave = true;
      }
    }

    if (shouldSave) {
      const filtered = new FilteredDistance({ name, distance, time, date });
      await filtered.save();
    }

    res.status(201).json({ message: 'Data saved successfully.', data: newData });
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Route: Get ALL full data
app.get('/api/data', async (req, res) => {
  try {
    const allData = await Data.find().sort({ date: -1, time: -1 });
    res.json(allData);
  } catch (err) {
    console.error('GET all error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Route: Get distances from FilteredDistance
app.get('/api/data/distances/filtered', async (req, res) => {
  try {
    const filtered = await FilteredDistance.find();
    const distances = filtered.map(item => item.distance);
    res.json(distances); // Output: [56, 78, 73]
  } catch (err) {
    console.error('GET distances error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
