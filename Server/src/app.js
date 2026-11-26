const express = require("express");
const cors = require("cors");
const podRoutes = require("./routes/pod.routes");
const employeeRoutes = require("./routes/employee.routes");
const catalogRoutes = require("./routes/catalog.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const schedulingRulesRoutes = require("./routes/scheduling-rules.routes");
const leaveHolidayRoutes = require("./routes/leave-holiday.routes");
const rosterRoutes = require("./routes/roster.routes");
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use("/api/pods", podRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api", catalogRoutes);
app.use("/api/assignments", assignmentRoutes);


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DataStraw Roster API is running",
  });
});

app.use("/api", schedulingRulesRoutes);
app.use("/api", leaveHolidayRoutes);
app.use("/api/rosters", rosterRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;