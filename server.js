const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==== CONNECT MONGODB ====
mongoose.connect("mongodb+srv://jhunjhun2232_db_user:XPT6l47Bt8uZODpY@cluster0.wtkhwmm.mongodb.net/distance",{
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("MongoDB error:", err));

// ==== SCHEMAS ====
const machineSchema = new mongoose.Schema({
  machineId: { type: String, required: true, unique: true },
  x: Number,
  y: Number
});
const locationSchema = new mongoose.Schema({
  employeeId: String,
  x: Number,
  y: Number,
  timestamp: { type: Date, default: Date.now }
});
const distanceReportSchema = new mongoose.Schema({
  machineId: String,
  distances: Object, // { E1: 0, E2: 0, E3: 0 }
  timestamp: { type: Date, default: Date.now }
});

const Machine = mongoose.model("Machine", machineSchema);
const Location = mongoose.model("Location", locationSchema);
const DistanceReport = mongoose.model("DistanceReport", distanceReportSchema);

// ==== UTIL ====
const calcDist = (x1, y1, x2, y2) => Math.sqrt((x1 - x2)**2 + (y1 - y2)**2);

// ==== ROUTES ====

// POST all employees + compute & save distances
app.post("/api/locations", async (req, res) => {
  try {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: "Send 'employees' array" });
    }

    // Save all employee locations
    for (const emp of employees) {
      if (emp.employeeId && emp.x != null && emp.y != null) {
        await Location.create({ employeeId: emp.employeeId, x: emp.x, y: emp.y });
      }
    }

    // Get all machines
    const machines = await Machine.find({});
    const reportTimestamp = new Date();
    const employeesIds = ["E1", "E2", "E3"];
    const latestLocations = {};

    // Get latest location for each employee
    for (const e of employeesIds) {
      const loc = await Location.findOne({ employeeId: e }).sort({ timestamp: -1 }).exec();
      latestLocations[e] = loc || null;
    }

    // Compute distances and save reports
    for (const m of machines) {
      const distances = {};
      for (const e of employeesIds) {
        const loc = latestLocations[e];
        if (!loc || (reportTimestamp - loc.timestamp) > 2*60*1000) { // older than 2 min
          distances[e] = 0;
        } else {
          distances[e] = Number(calcDist(m.x, m.y, loc.x, loc.y).toFixed(2));
        }
      }

      await DistanceReport.create({
        machineId: m.machineId,
        distances,
        timestamp: reportTimestamp
      });
    }

    res.status(201).json({ message: "✅ Employee locations saved and distance reports created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET latest distance reports
app.get("/api/machines/report", async (req, res) => {
  try {
    const latestReports = {};
    const machines = await Machine.find({});
    for (const m of machines) {
      const report = await DistanceReport.findOne({ machineId: m.machineId })
        .sort({ timestamp: -1 })
        .exec();
      latestReports[m.machineId] = report || { distances: {}, timestamp: null };
    }
    res.json(latestReports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== SEED MACHINES ====
(async () => {
  const count = await Machine.countDocuments();
  if (count === 0) {
    await Machine.insertMany([
      { machineId: "M1", x: 0, y: 0 },
      { machineId: "M2", x: 10, y: 0 },
      { machineId: "M3", x: 5, y: 8.66 }
    ]);
    console.log("🧩 Machines seeded");
  }
})();

// ==== START SERVER ====
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
