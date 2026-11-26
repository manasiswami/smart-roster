
const prisma = require("../config/prisma");

// GET operating rules
exports.getOperatingRules = async (req, res) => {
  try {
    const rules = await prisma.operatingRule.findMany({
      include: {
        brandProcess: {
          include: { brand: true, process: true },
        },
      },
      orderBy: [{ brandProcessId: "asc" }, { dayOfWeek: "asc" }],
    });

    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE or UPDATE operating rule
exports.saveOperatingRule = async (req, res) => {
  try {
    const { brandProcessId, dayOfWeek, isOperating, minimumStaff } = req.body;

    if (!brandProcessId || !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 || dayOfWeek > 6 ||
        typeof isOperating !== "boolean" ||
        !Number.isInteger(minimumStaff) || minimumStaff < 0) {
      return res.status(400).json({
        success: false,
        message: "Provide brandProcessId, dayOfWeek (0-6), isOperating and minimumStaff.",
      });
    }

    const brandProcess = await prisma.brandProcess.findUnique({
      where: { id: brandProcessId },
    });

    if (!brandProcess || !brandProcess.isActive) {
      return res.status(404).json({
        success: false,
        message: "Active brand process not found.",
      });
    }

    const rule = await prisma.operatingRule.upsert({
      where: {
        brandProcessId_dayOfWeek: { brandProcessId, dayOfWeek },
      },
      update: { isOperating, minimumStaff },
      create: { brandProcessId, dayOfWeek, isOperating, minimumStaff },
    });

    res.status(200).json({
      success: true,
      message: "Operating rule saved successfully.",
      data: rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET operating exceptions
exports.getOperatingExceptions = async (req, res) => {
  try {
    const exceptions = await prisma.operatingException.findMany({
      include: {
        brandProcess: {
          include: { brand: true, process: true },
        },
      },
      orderBy: { date: "asc" },
    });

    res.json({
      success: true,
      count: exceptions.length,
      data: exceptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE operating exception
exports.createOperatingException = async (req, res) => {
  try {
    const {
      brandProcessId,
      date,
      isOperating,
      minimumStaff,
      reason,
    } = req.body;

    if (!brandProcessId || !date || typeof isOperating !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "brandProcessId, date and isOperating are required.",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format.",
      });
    }

    if (minimumStaff !== undefined &&
        (!Number.isInteger(minimumStaff) || minimumStaff < 0)) {
      return res.status(400).json({
        success: false,
        message: "minimumStaff must be a non-negative integer.",
      });
    }

    const brandProcess = await prisma.brandProcess.findUnique({
      where: { id: brandProcessId },
    });

    if (!brandProcess || !brandProcess.isActive) {
      return res.status(404).json({
        success: false,
        message: "Active brand process not found.",
      });
    }

    const exception = await prisma.operatingException.upsert({
      where: {
        brandProcessId_date: { brandProcessId, date: parsedDate },
      },
      update: {
  isOperating,
  minimumStaff: minimumStaff ?? null,
  reason: reason?.trim() || null,
},
create: {
  brandProcessId,
  date: parsedDate,
  isOperating,
  minimumStaff: minimumStaff ?? null,
  reason: reason?.trim() || null,
},
    });

    res.status(201).json({
      success: true,
      message: "Operating exception saved successfully.",
      data: exception,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET employee weekly offs
exports.getWeeklyOffs = async (req, res) => {
  try {
    const weeklyOffs = await prisma.weeklyOff.findMany({
      include: { employee: true },
      orderBy: [{ employeeId: "asc" }, { dayOfWeek: "asc" }],
    });

    res.json({
      success: true,
      count: weeklyOffs.length,
      data: weeklyOffs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE weekly off
exports.createWeeklyOff = async (req, res) => {
  try {
    const { employeeId, dayOfWeek } = req.body;

    if (!employeeId || !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        message: "Provide employeeId and dayOfWeek (0-6).",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Active employee not found.",
      });
    }

    const weeklyOff = await prisma.weeklyOff.upsert({
      where: {
        employeeId_dayOfWeek: { employeeId, dayOfWeek },
      },
      update: {},
      create: { employeeId, dayOfWeek },
    });

    res.status(201).json({
      success: true,
      message: "Weekly off saved successfully.",
      data: weeklyOff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET employee availability
exports.getAvailability = async (req, res) => {
  try {
    const availability = await prisma.employeeAvailability.findMany({
      include: { employee: true },
      orderBy: [{ employeeId: "asc" }, { date: "asc" }],
    });

    res.json({
      success: true,
      count: availability.length,
      data: availability,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE or UPDATE employee availability
exports.saveAvailability = async (req, res) => {
  try {
    const { employeeId, date, isAvailable, reason } = req.body;

    if (!employeeId || !date || typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "employeeId, date and isAvailable are required.",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format.",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Active employee not found.",
      });
    }

    const availability = await prisma.employeeAvailability.upsert({
      where: {
        employeeId_date: { employeeId, date: parsedDate },
      },
      update: { isAvailable, reason },
      create: { employeeId, date: parsedDate, isAvailable, reason },
    });

    res.status(200).json({
      success: true,
      message: "Employee availability saved successfully.",
      data: availability,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/operating-exceptions/:id
exports.deleteOperatingException = async (req, res) => {
  try {
    const { id } = req.params;

    const exception = await prisma.operatingException.findUnique({
      where: { id },
    });

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: "Operating exception not found.",
      });
    }

    await prisma.operatingException.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Operating exception deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};