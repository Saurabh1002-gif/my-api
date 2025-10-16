require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(bodyParser.json());

// Mongoose Schemas
const dataSchema = new mongoose.Schema({
  name: { type: Number, required: true },     // Device ID (e.g., 1011)
  distance: { type: Number, required: true }, // Distance value
  time: { type: String, required: true },     // Format: "HH:mm:ss"
  date: { type: String, required: true },     // Format: "YYYY-MM-DD"
});

const filteredDistanceSchema = new mongoose.Schema({
  name: { type: Number, required: true },
  distance: { type: Number, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
});

const Data = mongoose.model('Data', dataSchema);
const FilteredDistance = mongoose.model('FilteredDistance', filteredDistanceSchema);

// Routes
app.get('/', (req, res) => {
  res.send('API is working!');
});

// ✅ Add data
app.post('/api/data', async (req, res) => {
  try {
    const { name, distance, time, date } = req.body;

    if (name === undefined || distance === undefined || !time || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newData = new Data({ name, distance, time, date });
    await newData.save();

    // Save to FilteredDistance only if within 10 seconds of last entry
    const lastEntry = await FilteredDistance.findOne({ name }).sort({ date: -1, time: -1 });

    let shouldSaveToFiltered = false;

    if (!lastEntry) {
      shouldSaveToFiltered = true;
    } else {
      const lastTimestamp = new Date(`${lastEntry.date}T${lastEntry.time}`);
      const currentTimestamp = new Date(`${date}T${time}`);
      const diffSeconds = (currentTimestamp - lastTimestamp) / 1000;

      if (diffSeconds <= 10) {
        shouldSaveToFiltered = true;
      }
    }

    if (shouldSaveToFiltered) {
      const filtered = new FilteredDistance({ name, distance, time, date });
      await filtered.save();
    }

    res.status(201).json({ message: 'Data saved successfully.', data: newData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Get all full data
app.get('/api/data', async (req, res) => {
  try {
    const allData = await Data.find().sort({ date: -1, time: -1 });
    res.json(allData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Get latest distances per device (ONLY distances, sorted by name)
app.get('/api/data/distances', async (req, res) => {
  try {
    const deviceNames = await Data.distinct('name');

    const latestEntries = await Promise.all(
      deviceNames.map(async (deviceName) => {
        return await Data.findOne({ name: deviceName })
          .sort({ date: -1, time: -1 });
      })
    );

    const sortedDistances = latestEntries
      .sort((a, b) => a.name - b.name)
      .map(entry => entry.distance);

    res.json(sortedDistances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ✅ Get only distances saved under 10-sec rule
app.get('/api/data/distances/filtered', async (req, res) => {
  try {
    const filteredData = await FilteredDistance.find();
    const distances = filteredData.map(item => item.distance);
    res.json(distances);
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
