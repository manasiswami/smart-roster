
const prisma = require("../config/prisma");

function parseDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

// GET all leave requests
exports.getLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      include: {
        employee: {
          include: { pod: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    res.json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE leave request
exports.createLeave = async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;

    const validTypes = ["PLANNED", "SICK", "COMP_OFF"];

    if (!employeeId || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid employeeId and leave type are required.",
      });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end || start > end) {
      return res.status(400).json({
        success: false,
        message: "Provide valid dates. End date must not precede start date.",
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

    const leave = await prisma.leave.create({
      data: {
        employeeId,
        type,
        startDate: start,
        endDate: end,
        reason,
        status: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// APPROVE OR REJECT leave
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED.",
      });
    }

    const existingLeave = await prisma.leave.findUnique({
      where: { id: req.params.id },
    });

    if (!existingLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    if (existingLeave.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending leave requests can be updated.",
      });
    }

    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully.`,
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET company holidays
exports.getHolidays = async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });

    res.json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD company holiday
exports.createHoliday = async (req, res) => {
  try {
    const { name, date } = req.body;
    const parsedDate = parseDate(date);

    if (!name || !name.trim() || !parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Valid holiday name and date (YYYY-MM-DD) are required.",
      });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date: parsedDate,
      },
    });

    res.status(201).json({
      success: true,
      message: "Holiday added successfully.",
      data: holiday,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists on this date.",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE company holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await prisma.holiday.findUnique({
      where: { id: req.params.id },
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    await prisma.holiday.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Holiday deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
