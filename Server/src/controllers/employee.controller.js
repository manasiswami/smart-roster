
const prisma = require("../config/prisma");

const validStatuses = ["ACTIVE", "INACTIVE"];

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const { podId, status } = req.query;
    const where = {};

    if (podId) where.podId = podId;

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee status",
        });
      }
      where.status = status;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        pod: { select: { id: true, name: true } },
        _count: {
          select: {
            assignments: true,
            rosterDays: true,
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        pod: true,
        assignments: {
          include: {
            brandProcess: {
              include: {
                brand: true,
                process: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
    });
  }
};

// POST /api/employees
exports.createEmployee = async (req, res) => {
  try {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      podId,
    } = req.body;

    if (
      !employeeCode?.trim() ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !podId
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee code, name, email and pod are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    const pod = await prisma.pod.findUnique({ where: { id: podId } });

    if (!pod) {
      return res.status(404).json({
        success: false,
        message: "Selected pod does not exist",
      });
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode: employeeCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        podId,
      },
      include: {
        pod: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Employee code or email already exists",
      });
    }

    console.error("Create employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
};

// PATCH /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { ledPod: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const allowedFields = [
      "employeeCode",
      "firstName",
      "lastName",
      "email",
      "phone",
      "podId",
      "status",
    ];

    const data = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    for (const field of ["employeeCode", "firstName", "lastName"]) {
      if (data[field] !== undefined) {
        if (typeof data[field] !== "string" || !data[field].trim()) {
          return res.status(400).json({
            success: false,
            message: `${field} cannot be empty`,
          });
        }
        data[field] = data[field].trim();
      }
    }

    if (data.email !== undefined) {
      if (typeof data.email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid email address",
        });
      }

      data.email = data.email.trim().toLowerCase();

      if (!isValidEmail(data.email)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid email address",
        });
      }
    }

    if (data.phone !== undefined) {
      data.phone = typeof data.phone === "string" ? data.phone.trim() || null : null;
    }

    if (data.status !== undefined && !validStatuses.includes(data.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee status",
      });
    }

    if (data.podId !== undefined) {
      const pod = await prisma.pod.findUnique({
        where: { id: data.podId },
      });

      if (!pod) {
        return res.status(404).json({
          success: false,
          message: "Selected pod does not exist",
        });
      }

      if (existing.ledPod && data.podId !== existing.podId) {
        return res.status(409).json({
          success: false,
          message: "Reassign this employee's pod leadership before moving them",
        });
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data,
      include: {
        pod: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Employee code or email already exists",
      });
    }

    console.error("Update employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update employee",
    });
  }
};

// DELETE /api/employees/:id
// Soft delete: preserve roster and assignment history.
exports.deactivateEmployee = async (req, res) => {
  try {
    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" },
    });

    res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Deactivate employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate employee",
    });
  }
};
