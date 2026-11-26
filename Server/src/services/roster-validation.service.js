function formatDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function monthDates(year, month) {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month - 1, index + 1))
  );
}

function dateKey(date, brandProcessId) {
  return `${formatDate(date)}:${brandProcessId}`;
}

/**
 * Rebuilds the derived conflict list for one roster from the current
 * operating rules, exceptions, holidays, employee availability, leave,
 * weekly offs and saved roster allocations.
 *
 * Call this function inside a Prisma transaction.
 */
async function validateRoster(tx, rosterId) {
  const roster = await tx.roster.findUnique({ where: { id: rosterId } });
  if (!roster) {
    const error = new Error("Roster not found.");
    error.statusCode = 404;
    throw error;
  }

  const dates = monthDates(roster.year, roster.month);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const [rosterDays, brandProcesses, exceptions, holidays, weeklyOffs, leaves, availability] =
    await Promise.all([
      tx.employeeRosterDay.findMany({
        where: { rosterId },
        include: {
          employee: true,
          allocations: {
            include: {
              assignment: {
                include: {
                  employee: true,
                  brandProcess: {
                    include: { brand: true, process: true },
                  },
                },
              },
            },
          },
        },
      }),
      tx.brandProcess.findMany({
        where: { isActive: true },
        include: { brand: true, process: true, operatingRules: true },
      }),
      tx.operatingException.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),
      tx.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),
      tx.weeklyOff.findMany(),
      tx.leave.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),
      tx.employeeAvailability.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),
    ]);

  const conflicts = [];
  const eligibleEmployeesByProcessDate = new Map();
  const allocationsByProcessDate = new Map();
  const rosterDayByEmployeeDate = new Map();

  for (const rosterDay of rosterDays) {
    const day = formatDate(rosterDay.date);
    rosterDayByEmployeeDate.set(`${rosterDay.employeeId}:${day}`, rosterDay);

    for (const allocation of rosterDay.allocations) {
      const assignment = allocation.assignment;
      const bp = assignment.brandProcess;
      const reasons = [];

      if (assignment.employeeId !== rosterDay.employeeId) {
        reasons.push("allocation employee does not match roster employee");
      }
      if (assignment.status !== "ACTIVE") reasons.push("assignment is inactive");
      if (assignment.employee.status !== "ACTIVE") reasons.push("employee is inactive");
      if (!bp.isActive) reasons.push("brand-process combination is inactive");
      if (formatDate(assignment.startDate) > day) reasons.push("assignment starts after this roster date");
      if (assignment.endDate && formatDate(assignment.endDate) < day) {
        reasons.push("assignment ended before this roster date");
      }

      const dayOfWeek = new Date(`${day}T00:00:00.000Z`).getUTCDay();
      const hasWeeklyOff = weeklyOffs.some(
        (item) => item.employeeId === rosterDay.employeeId && item.dayOfWeek === dayOfWeek
      );
      const approvedLeave = leaves.find(
        (item) =>
          item.employeeId === rosterDay.employeeId &&
          formatDate(item.startDate) <= day &&
          formatDate(item.endDate) >= day
      );
      const unavailable = availability.some(
        (item) =>
          item.employeeId === rosterDay.employeeId &&
          formatDate(item.date) === day &&
          !item.isAvailable
      );

      if (hasWeeklyOff) reasons.push("employee has a weekly off");
      if (approvedLeave) reasons.push("employee has approved leave");
      if (unavailable) reasons.push("employee is marked unavailable");
      if (rosterDay.status !== "WORKING") {
        reasons.push(`roster day status is ${rosterDay.status}`);
      }

      const key = dateKey(rosterDay.date, bp.id);
      if (!allocationsByProcessDate.has(key)) allocationsByProcessDate.set(key, new Set());
      allocationsByProcessDate.get(key).add(rosterDay.employeeId);

      if (reasons.length > 0) {
        conflicts.push({
          rosterId,
          employeeId: rosterDay.employeeId,
          brandProcessId: bp.id,
          date: rosterDay.date,
          severity: "ERROR",
          code: "INVALID_ROSTER_ALLOCATION",
          message: `${rosterDay.employee.firstName} ${rosterDay.employee.lastName} is allocated to ${bp.brand.name} - ${bp.process.name}, but ${reasons.join("; ")}.`,
        });
      } else {
        if (!eligibleEmployeesByProcessDate.has(key)) {
          eligibleEmployeesByProcessDate.set(key, new Set());
        }
        eligibleEmployeesByProcessDate.get(key).add(rosterDay.employeeId);
      }
    }
  }

  const holidayDates = new Set(holidays.map((item) => formatDate(item.date)));

  for (const date of dates) {
    const day = formatDate(date);
    const dayOfWeek = date.getUTCDay();
    const isHoliday = holidayDates.has(day);

    for (const bp of brandProcesses) {
      const exception = exceptions.find(
        (item) => item.brandProcessId === bp.id && formatDate(item.date) === day
      );
      const rule = bp.operatingRules.find((item) => item.dayOfWeek === dayOfWeek);
      const isOperating = exception
        ? exception.isOperating
        : isHoliday && !bp.operatesOnPublicHolidays
          ? false
          : rule?.isOperating ?? false;

      const processKey = dateKey(date, bp.id);
      const allAllocated = allocationsByProcessDate.get(processKey) || new Set();
      const eligibleAllocated = eligibleEmployeesByProcessDate.get(processKey) || new Set();

      if (!isOperating) {
        if (allAllocated.size > 0) {
          conflicts.push({
            rosterId,
            brandProcessId: bp.id,
            date,
            severity: "ERROR",
            code: "ALLOCATION_ON_CLOSED_DAY",
            message: `${bp.brand.name} - ${bp.process.name} is closed on this date but has ${allAllocated.size} employee allocation(s).`,
          });
        }
        continue;
      }

      if (!rule && !exception) {
        conflicts.push({
          rosterId,
          brandProcessId: bp.id,
          date,
          severity: "WARNING",
          code: "MISSING_OPERATING_RULE",
          message: `Missing operating rule for ${bp.brand.name} - ${bp.process.name}.`,
        });
        continue;
      }

      const minimumStaff = exception?.minimumStaff ?? rule?.minimumStaff ?? 0;
      if (eligibleAllocated.size < minimumStaff) {
        conflicts.push({
          rosterId,
          brandProcessId: bp.id,
          date,
          severity: "ERROR",
          code: "INSUFFICIENT_STAFF",
          message: `${bp.brand.name} - ${bp.process.name}: required ${minimumStaff}, eligible allocated ${eligibleAllocated.size}.`,
        });
      }
    }
  }

  // Conflicts are derived from the latest roster state and configuration.
  // Replacing them avoids duplicate stale conflict rows after repeated checks.
  await tx.schedulingConflict.deleteMany({ where: { rosterId } });
  if (conflicts.length > 0) {
    await tx.schedulingConflict.createMany({ data: conflicts });
  }

  return {
    rosterId,
    conflictCount: conflicts.length,
    errorCount: conflicts.filter((item) => item.severity === "ERROR").length,
    warningCount: conflicts.filter((item) => item.severity === "WARNING").length,
    conflicts,
  };
}

module.exports = { validateRoster };
