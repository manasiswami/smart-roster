
const prisma = require("../config/prisma");

// GET /api/assignments
exports.getAssignments = async (req, res) => {
  try {
    const where = {};

    if (req.query.employeeId) where.employeeId = req.query.employeeId;
    if (req.query.brandProcessId) where.brandProcessId = req.query.brandProcessId;
    if (req.query.status) where.status = req.query.status;

    const assignments = await prisma.employeeAssignment.findMany({
      where,
      include: {
        employee: {
          include: { pod: true },
        },
        brandProcess: {
          include: {
            brand: true,
            process: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assignments",
    });
  }
};

// POST /api/assignments
exports.createAssignment = async (req, res) => {
  try {
    const { employeeId, brandProcessId, startDate, endDate } = req.body;

    if (!employeeId || !brandProcessId) {
      return res.status(400).json({
        success: false,
        message: "Employee and brand process are required",
      });
    }

    const [employee, brandProcess] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.brandProcess.findUnique({ where: { id: brandProcessId } }),
    ]);

    if (!employee || !brandProcess) {
      return res.status(404).json({
        success: false,
        message: "Employee or brand process not found",
      });
    }

    if (employee.status !== "ACTIVE" || !brandProcess.isActive) {
      return res.status(400).json({
        success: false,
        message: "Employee and brand process must both be active",
      });
    }

    const parsedStart = startDate ? new Date(startDate) : new Date();
    const parsedEnd = endDate ? new Date(endDate) : null;

    if (
      Number.isNaN(parsedStart.getTime()) ||
      (parsedEnd && Number.isNaN(parsedEnd.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment date",
      });
    }

    if (parsedEnd && parsedEnd < parsedStart) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const assignment = await prisma.employeeAssignment.create({
      data: {
        employeeId,
        brandProcessId,
        startDate: parsedStart,
        endDate: parsedEnd,
      },
      include: {
        employee: true,
        brandProcess: {
          include: { brand: true, process: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Employee assigned successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create assignment",
    });
  }
};

// PATCH /api/assignments/:id
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startDate, endDate } = req.body;

    const existing = await prisma.employeeAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const data = {};

    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status",
        });
      }
      data.status = status;
    }

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
        });
      }
      data.startDate = parsed;
    }

    if (endDate !== undefined) {
      if (endDate === null || endDate === "") {
        data.endDate = null;
      } else {
        const parsed = new Date(endDate);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }
        data.endDate = parsed;
      }
    }

    const effectiveStart = data.startDate || existing.startDate;
    const effectiveEnd =
      data.endDate !== undefined ? data.endDate : existing.endDate;

    if (effectiveEnd && effectiveEnd < effectiveStart) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    const assignment = await prisma.employeeAssignment.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update assignment",
    });
  }
};

// DELETE /api/assignments/:id
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await prisma.employeeAssignment.findUnique({
      where: { id: req.params.id },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const updated = await prisma.employeeAssignment.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" },
    });

    res.json({
      success: true,
      message: "Assignment deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Deactivate assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate assignment",
    });
  }
};