// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Read config from .env
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!PORT || !MONGO_URI) {
  console.error('ERROR: PORT or MONGO_URI not defined in .env');
  process.exit(1);
}

// MongoDB connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Schema definition
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  machines: [{
    name: { type: String, required: true },
    lastDistance: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now }
  }]
});

const Employee = mongoose.model('Employee', employeeSchema);

// ✅ 1. Add or update employee machines
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

    const now = new Date();

    machines.forEach(newMachine => {
      const index = emp.machines.findIndex(m => m.name === newMachine.name);
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
    res.json({ message: '✅ Employee machines updated', employee: emp });

  } catch (err) {
    console.error('❌ Error in /api/distance/batch:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ 2. Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (err) {
    console.error('❌ Error in /api/employees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ 3. Get employee by name
app.get('/api/employees/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const employee = await Employee.findOne({ name });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('❌ Error in GET /api/employees/:name:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ 4. Delete a machine from an employee
app.delete('/api/employees/:employeeName/machines/:machineName', async (req, res) => {
  try {
    const { employeeName, machineName } = req.params;

    const employee = await Employee.findOne({ name: employeeName });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const originalCount = employee.machines.length;

    employee.machines = employee.machines.filter(machine => machine.name !== machineName);

    if (employee.machines.length === originalCount) {
      return res.status(404).json({ message: 'Machine not found for this employee' });
    }

    await employee.save();
    res.json({ message: `✅ Machine '${machineName}' removed from employee '${employeeName}'`, employee });

  } catch (err) {
    console.error('❌ Error in DELETE machine:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
