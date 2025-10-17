// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Read config ONLY from .env
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!PORT || !MONGO_URI) {
  console.error('ERROR: PORT or MONGO_URI not defined in .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  machines: [{
    _id: false,
    name: { type: String, required: true },
    lastDistance: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now }
  }]
});

const Employee = mongoose.model('Employee', employeeSchema);

app.post('/api/distance/batch', async (req, res) => {
  try {
    const { name, machines } = req.body;
    if (!name || !machines || !Array.isArray(machines)) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    let emp = await Employee.findOne({ name });
    if (!emp) {
      emp = new Employee({ name, machines: [] });
    }
    machines.forEach(newMachine => {
      const index = emp.machines.findIndex(m => m.name === newMachine.name);
      const now = new Date();
      if (index >= 0) {
        emp.machines[index].lastDistance = newMachine.lastDistance;
        emp.machines[index].updatedAt = now;
      } else {
        emp.machines.push({
          name: newMachine.name,
          lastDistance: newMachine.lastDistance,
          updatedAt: now
        });
      }
    });
    await emp.save();
    res.json({ message: 'Employee machines updated', employee: emp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
