const prisma = require("../config/prisma");
const { validateRoster } = require("../services/roster-validation.service");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// PATCH /api/rosters/:rosterId/days/:dayId/allocations
// Replaces the process assignments for one employee on one roster date.
exports.updateRosterDayAllocations = async (req, res) => {
  try {
    const { rosterId, dayId } = req.params;
    const { assignmentIds } = req.body;

    if (!Array.isArray(assignmentIds) || assignmentIds.some((id) => typeof id !== "string" || !id)) {
      return res.status(400).json({
        success: false,
        message: "assignmentIds must be an array of assignment IDs. Use an empty array to remove all process allocations.",
      });
    }

    if (new Set(assignmentIds).size !== assignmentIds.length) {
      return res.status(400).json({ success: false, message: "Duplicate assignment IDs are not allowed." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const roster = await tx.roster.findUnique({ where: { id: rosterId } });
      if (!roster) {
        const error = new Error("Roster not found.");
        error.statusCode = 404;
        throw error;
      }
      if (roster.status === "PUBLISHED") {
        const error = new Error("A published roster cannot be edited. Create a new roster version first.");
        error.statusCode = 409;
        throw error;
      }

      const rosterDay = await tx.employeeRosterDay.findFirst({
        where: { id: dayId, rosterId },
        include: { employee: true },
      });
      if (!rosterDay) {
        const error = new Error("Roster day not found for this roster.");
        error.statusCode = 404;
        throw error;
      }

      const day = new Date(rosterDay.date);
      const dayString = day.toISOString().slice(0, 10);
      const dayOfWeek = day.getUTCDay();
      const [weeklyOff, approvedLeave, unavailable, holiday] = await Promise.all([
        tx.weeklyOff.findFirst({ where: { employeeId: rosterDay.employeeId, dayOfWeek } }),
        tx.leave.findFirst({
          where: {
            employeeId: rosterDay.employeeId,
            status: "APPROVED",
            startDate: { lte: day },
            endDate: { gte: day },
          },
        }),
        tx.employeeAvailability.findFirst({
          where: { employeeId: rosterDay.employeeId, date: day, isAvailable: false },
        }),
        tx.holiday.findUnique({ where: { date: day } }),
      ]);

      if (assignmentIds.length > 0 && rosterDay.employee.status !== "ACTIVE") {
        throw badRequest("An inactive employee cannot receive roster allocations.");
      }
      if (assignmentIds.length > 0 && weeklyOff) {
        throw badRequest("This employee has a weekly off on this date.");
      }
      if (assignmentIds.length > 0 && approvedLeave) {
        throw badRequest("This employee has approved leave on this date.");
      }
      if (assignmentIds.length > 0 && unavailable) {
        throw badRequest("This employee is marked unavailable on this date.");
      }

      const selectedAssignments = assignmentIds.length
        ? await tx.employeeAssignment.findMany({
            where: { id: { in: assignmentIds } },
            include: { brandProcess: { include: { brand: true, process: true } } },
          })
        : [];

      if (selectedAssignments.length !== assignmentIds.length) {
        throw badRequest("One or more selected assignments do not exist.");
      }

      for (const assignment of selectedAssignments) {
        if (assignment.employeeId !== rosterDay.employeeId) {
          throw badRequest("Each selected assignment must belong to this roster employee.");
        }
        if (assignment.status !== "ACTIVE" || !assignment.brandProcess.isActive) {
          throw badRequest("Only active assignments linked to active brand-process combinations can be added.");
        }
        if (assignment.startDate > day || (assignment.endDate && assignment.endDate < day)) {
          throw badRequest("A selected assignment is not active on this roster date.");
        }
      }

      await tx.rosterAllocation.deleteMany({ where: { rosterDayId: rosterDay.id } });
      if (selectedAssignments.length > 0) {
        await tx.rosterAllocation.createMany({
          data: selectedAssignments.map((assignment) => ({
            rosterDayId: rosterDay.id,
            assignmentId: assignment.id,
          })),
        });
      }

      let nextStatus = rosterDay.status;
      if (selectedAssignments.length > 0) {
        nextStatus = "WORKING";
      } else if (approvedLeave) {
        nextStatus = approvedLeave.type === "COMP_OFF" ? "COMP_OFF" : "LEAVE";
      } else if (weeklyOff) {
        nextStatus = "WEEKLY_OFF";
      } else if (unavailable) {
        nextStatus = "UNAVAILABLE";
      } else if (holiday) {
        nextStatus = "HOLIDAY";
      } else if (nextStatus !== "WORKING") {
        nextStatus = "WORKING";
      }

      await tx.employeeRosterDay.update({
        where: { id: rosterDay.id },
        data: { status: nextStatus },
      });

      const validation = await validateRoster(tx, rosterId);
      const updatedDay = await tx.employeeRosterDay.findUnique({
        where: { id: rosterDay.id },
        include: {
          employee: { include: { pod: true } },
          allocations: {
            include: {
              assignment: {
                include: {
                  brandProcess: { include: { brand: true, process: true } },
                },
              },
            },
          },
        },
      });

      return { rosterDay: updatedDay, validation };
    });

    res.status(200).json({
      success: true,
      message: "Roster allocations updated and roster revalidated.",
      data: result,
    });
  } catch (error) {
    console.error("Update roster allocations error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update roster allocations.",
    });
  }
};

// POST /api/rosters/:rosterId/revalidate
// Rechecks a roster after availability, leave, weekly-off or rule changes.
exports.revalidateRoster = async (req, res) => {
  try {
    const result = await prisma.$transaction((tx) =>
      validateRoster(tx, req.params.rosterId)
    );

    res.status(200).json({
      success: true,
      message: "Roster validation completed.",
      data: result,
    });
  } catch (error) {
    console.error("Roster revalidation error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to revalidate roster.",
    });
  }
};
