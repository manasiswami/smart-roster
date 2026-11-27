
const prisma = require("../config/prisma");

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthDates(year, month) {
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: totalDays }, (_, index) =>
    new Date(Date.UTC(year, month - 1, index + 1))
  );
}

async function generateMonthlyRoster(month, year) {
  if (
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(year) || year < 2020 || year > 2100
  ) {
    throw new Error("Provide a valid month and year.");
  }

  return prisma.$transaction(async (tx) => {
    const dates = getMonthDates(year, month);
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const employees = await tx.employee.findMany({
      where: { status: "ACTIVE" },
    });

    const employeeIds = employees.map((e) => e.id);

    const [
      weeklyOffs,
      leaves,
      availability,
      assignments,
      brandProcesses,
      exceptions,
      holidays,
      latestRoster,
    ] = await Promise.all([
      tx.weeklyOff.findMany({
        where: { employeeId: { in: employeeIds } },
      }),

      tx.leave.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: "APPROVED",
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),

      tx.employeeAvailability.findMany({
        where: {
          employeeId: { in: employeeIds },
          date: { gte: startDate, lte: endDate },
        },
      }),

      tx.employeeAssignment.findMany({
        where: {
          status: "ACTIVE",
          employeeId: { in: employeeIds },
          startDate: { lte: endDate },
          OR: [
            { endDate: null },
            { endDate: { gte: startDate } },
          ],
        },
        include: { employee: true },
      }),

      tx.brandProcess.findMany({
        where: { isActive: true },
        include: {
          brand: true,
          process: true,
          operatingRules: true,
        },
      }),

      tx.operatingException.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),

      tx.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),

      tx.roster.aggregate({
        where: { month, year },
        _max: { version: true },
      }),
    ]);

    const version = (latestRoster._max.version || 0) + 1;

    const roster = await tx.roster.create({
      data: { month, year, version, status: "DRAFT" },
    });

    const conflicts = [];
    const monthlyLoads = new Map();
    const datesByEmployee = new Map();

    employees.forEach((employee) => {
      monthlyLoads.set(employee.id, 0);
      datesByEmployee.set(employee.id, new Map());
    });

    // Process every date in the selected month.
    for (const date of dates) {
      const dateString = formatDate(date);
      const dayOfWeek = date.getUTCDay();

      const isHoliday = holidays.some(
        (holiday) => formatDate(holiday.date) === dateString
      );

      const dailyAssignments = new Map();

      employees.forEach((employee) => {
        dailyAssignments.set(employee.id, []);
      });

      // Process every active brand-process combination.
      for (const bp of brandProcesses) {
        const exception = exceptions.find(
          (item) =>
            item.brandProcessId === bp.id &&
            formatDate(item.date) === dateString
        );

        const rule = bp.operatingRules.find(
          (item) => item.dayOfWeek === dayOfWeek
        );

        // A date-specific exception takes priority.
        // Otherwise, public-holiday operating permission applies.
        const isOperating = exception
          ? exception.isOperating
          : isHoliday && !bp.operatesOnPublicHolidays
            ? false
            : rule?.isOperating ?? false;

        if (!isOperating) continue;

        if (!rule && !exception) {
          conflicts.push({
            rosterId: roster.id,
            brandProcessId: bp.id,
            date,
            severity: "WARNING",
            code: "MISSING_OPERATING_RULE",
            message: `Missing operating rule for ${bp.brand.name} - ${bp.process.name}.`,
          });
          continue;
        }

        const minimumStaff = exception?.minimumStaff ??
          rule?.minimumStaff ?? 0;

        // Find eligible employees.
        const candidates = assignments.filter((assignment) => {
          const employeeId = assignment.employeeId;

          if (
            assignment.brandProcessId !== bp.id ||
            assignment.employee.status !== "ACTIVE"
          ) {
            return false;
          }

          if (
            formatDate(assignment.startDate) > dateString ||
            (assignment.endDate &&
              formatDate(assignment.endDate) < dateString)
          ) {
            return false;
          }

          const weeklyOff = weeklyOffs.some(
            (off) =>
              off.employeeId === employeeId &&
              off.dayOfWeek === dayOfWeek
          );

          const approvedLeave = leaves.some(
            (leave) =>
              leave.employeeId === employeeId &&
              formatDate(leave.startDate) <= dateString &&
              formatDate(leave.endDate) >= dateString
          );

          const unavailable = availability.some(
            (item) =>
              item.employeeId === employeeId &&
              formatDate(item.date) === dateString &&
              !item.isAvailable
          );

          return !weeklyOff && !approvedLeave && !unavailable;
        });

        // Remove duplicate assignment records for the same employee
        // and process.
        const uniqueCandidates = [
          ...new Map(
            candidates.map((item) => [item.employeeId, item])
          ).values(),
        ];

        // Balance monthly workload.
        uniqueCandidates.sort((a, b) => {
          const difference =
            (monthlyLoads.get(a.employeeId) || 0) -
            (monthlyLoads.get(b.employeeId) || 0);

          return difference || a.employeeId.localeCompare(b.employeeId);
        });

        const selected = uniqueCandidates.slice(0, minimumStaff);

        for (const assignment of selected) {
          const employeeId = assignment.employeeId;

          dailyAssignments.get(employeeId).push(assignment);

          monthlyLoads.set(
            employeeId,
            (monthlyLoads.get(employeeId) || 0) + 1
          );
        }

        // Record insufficient staffing.
        if (selected.length < minimumStaff) {
          conflicts.push({
            rosterId: roster.id,
            brandProcessId: bp.id,
            date,
            severity: "ERROR",
            code: "INSUFFICIENT_STAFF",
            message:
              `${bp.brand.name} - ${bp.process.name}: ` +
              `required ${minimumStaff}, available ${selected.length}.`,
          });
        }
      }
              // Prepare roster days for all active employees for this date.
      const rosterDayData = employees.map((employee) => {
        const employeeId = employee.id;

        const approvedLeave = leaves.find(
          (leave) =>
            leave.employeeId === employeeId &&
            formatDate(leave.startDate) <= dateString &&
            formatDate(leave.endDate) >= dateString
        );

        const weeklyOff = weeklyOffs.some(
          (off) =>
            off.employeeId === employeeId &&
            off.dayOfWeek === dayOfWeek
        );

        const unavailable = availability.some(
          (item) =>
            item.employeeId === employeeId &&
            formatDate(item.date) === dateString &&
            !item.isAvailable
        );

        const employeeAssignments =
          dailyAssignments.get(employeeId);

        let status = "WORKING";

        if (approvedLeave) {
          status =
            approvedLeave.type === "COMP_OFF"
              ? "COMP_OFF"
              : "LEAVE";
        } else if (weeklyOff) {
          status = "WEEKLY_OFF";
        } else if (unavailable) {
          status = "UNAVAILABLE";
        } else if (
          isHoliday &&
          employeeAssignments.length === 0
        ) {
          status = "HOLIDAY";
        }

        return {
          rosterId: roster.id,
          employeeId,
          date,
          status,
        };
      });

      // Insert all employee roster days in one database operation.
      const createdRosterDays =
        await tx.employeeRosterDay.createManyAndReturn({
          data: rosterDayData,
          select: {
            id: true,
            employeeId: true,
          },
        });

      // Map employee IDs to their newly created roster-day IDs.
      const rosterDayIdByEmployee = new Map(
        createdRosterDays.map((rosterDay) => [
          rosterDay.employeeId,
          rosterDay.id,
        ])
      );

      // Prepare all allocations for this date.
      const allocationData = [];

      for (const employee of employees) {
        const employeeAssignments =
          dailyAssignments.get(employee.id);

        if (employeeAssignments.length === 0) continue;

        const rosterDayId =
          rosterDayIdByEmployee.get(employee.id);

        for (const assignment of employeeAssignments) {
          allocationData.push({
            rosterDayId,
            assignmentId: assignment.id,
          });
        }
      }

      // Insert all allocations in one database operation.
      if (allocationData.length > 0) {
        await tx.rosterAllocation.createMany({
          data: allocationData,
        });
      }
    }

    if (conflicts.length > 0) {
      await tx.schedulingConflict.createMany({
        data: conflicts,
      });
    }

    const allocationCount = await tx.rosterAllocation.count({
      where: { rosterDay: { rosterId: roster.id } },
    });

    const generatedRoster = await tx.roster.update({
      where: { id: roster.id },
      data: { status: "GENERATED" },
    });

    return {
      roster: generatedRoster,
      employeeCount: employees.length,
      totalDays: dates.length,
      allocationCount,
      conflictCount: conflicts.length,
      conflicts,
    };
    }, {
    maxWait: 15000,
    timeout: 120000,
  });
}

module.exports = { generateMonthlyRoster };
