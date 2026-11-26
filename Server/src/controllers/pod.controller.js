const prisma = require("../config/prisma");

// GET /api/pods
exports.getPods = async (req, res) => {
  try {
    const pods = await prisma.pod.findMany({
      include: {
        lead: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ success: true, data: pods });
  } catch (error) {
    console.error("Get pods error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch pods" });
  }
};

// POST /api/pods
exports.createPod = async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Pod name is required",
      });
    }

    const pod = await prisma.pod.create({
      data: { name },
    });

    res.status(201).json({
      success: true,
      message: "Pod created successfully",
      data: pod,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A pod with this name already exists",
      });
    }

    console.error("Create pod error:", error);
    res.status(500).json({ success: false, message: "Failed to create pod" });
  }
};

// PATCH /api/pods/:id
exports.updatePod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, leadId } = req.body;

    const existingPod = await prisma.pod.findUnique({ where: { id } });

    if (!existingPod) {
      return res.status(404).json({
        success: false,
        message: "Pod not found",
      });
    }

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Pod name cannot be empty",
        });
      }
      data.name = name.trim();
    }

    if (leadId !== undefined) {
      if (leadId === null || leadId === "") {
        data.leadId = null;
      } else {
        const employee = await prisma.employee.findUnique({
          where: { id: leadId },
          select: { id: true, podId: true },
        });

        if (!employee) {
          return res.status(404).json({
            success: false,
            message: "Pod lead employee not found",
          });
        }

        if (employee.podId !== id) {
          return res.status(400).json({
            success: false,
            message: "Pod lead must belong to this pod",
          });
        }

        data.leadId = leadId;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a pod name or lead to update",
      });
    }

    const pod = await prisma.pod.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Pod updated successfully",
      data: pod,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This pod name or lead is already assigned",
      });
    }

    console.error("Update pod error:", error);
    res.status(500).json({ success: false, message: "Failed to update pod" });
  }
};

// DELETE /api/pods/:id
exports.deletePod = async (req, res) => {
  try {
    const pod = await prisma.pod.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!pod) {
      return res.status(404).json({
        success: false,
        message: "Pod not found",
      });
    }

    if (pod._count.employees > 0) {
      return res.status(409).json({
        success: false,
        message: "Move or remove employees before deleting this pod",
      });
    }

    await prisma.pod.delete({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: "Pod deleted successfully",
    });
  } catch (error) {
    console.error("Delete pod error:", error);
    res.status(500).json({ success: false, message: "Failed to delete pod" });
  }
};