const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==== CONNECT MONGODB ====
mongoose.connect(
  "mongodb+srv://jhunjhun2232_db_user:XPT6l47Bt8uZODpY@cluster0.wtkhwmm.mongodb.net/distance",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// ==== SCHEMAS ====
const machineSchema = new mongoose.Schema({
  machineId: { type: String, required: true, unique: true }, // e.g. "101"
  x: Number,
  y: Number
});

const locationSchema = new mongoose.Schema({
  employeeId: String, // e.g. "999"
  x: Number,
  y: Number,
  timestamp: { type: Date, default: Date.now }
});

const distanceReportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "101999"
  distance: Number, // in cm
  date: String,
  time: String
}, { _id: false });

const Machine = mongoose.model("Machine", machineSchema);
const Location = mongoose.model("Location", locationSchema);
const DistanceReport = mongoose.model("DistanceReport", distanceReportSchema);

// ==== UTIL ====
const calcDist = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

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

    const machines = await Machine.find({});
    const reportTimestamp = new Date();
    const date = reportTimestamp.toISOString().split("T")[0];
    const time = reportTimestamp.toTimeString().split(" ")[0];

    const employeesIds = ["999", "998", "997"];
    const latestLocations = {};

    // Get latest location for each employee
    for (const e of employeesIds) {
      const loc = await Location.findOne({ employeeId: e }).sort({ timestamp: -1 }).exec();
      latestLocations[e] = loc || null;
    }

    // Compute distances and save reports
    for (const m of machines) {
      for (const e of employeesIds) {
        const loc = latestLocations[e];
        let distance = 0;
        if (loc && (reportTimestamp - loc.timestamp) <= 2 * 60 * 1000) {
          const distMeters = calcDist(m.x, m.y, loc.x, loc.y);
          distance = Number((distMeters * 100).toFixed(2)); // convert to cm
        }

        const combinedName = `${m.machineId}${e}`;

        await DistanceReport.findOneAndUpdate(
          { name: combinedName },
          { distance, date, time },
          { upsert: true, new: true }
        );
      }
    }

    res.status(201).json({ message: "✅ Employee locations saved and distance reports updated (in cm)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all machine-employee distances as flat object
app.get("/api/employees/distances", async (req, res) => {
  try {
    const employeesIds = ["999", "998", "997"];
    const machines = await Machine.find({});
    const result = {};

    for (const m of machines) {
      for (const e of employeesIds) {
        const combinedName = `${m.machineId}${e}`;
        const report = await DistanceReport.findOne({ name: combinedName });
        result[combinedName] = report ? report.distance : null;
      }
    }

    res.json(result); // { "101999": 500, "102999": 640.31, ... }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== SEED MACHINES ====
(async () => {
  const count = await Machine.countDocuments();
  if (count === 0) {
    await Machine.insertMany([
      { machineId: "101", x: 0, y: 0 },
      { machineId: "102", x: 10, y: 0 },
      { machineId: "103", x: 5, y: 8.66 }
    ]);
    console.log("🧩 Machines seeded (IDs: 101, 102, 103)");
  }
})();

// ==== START SERVER ====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
