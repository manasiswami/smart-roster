
const prisma = require("../config/prisma");
const { generateMonthlyRoster } = require("../services/roster-generation.service");

// GENERATE monthly roster
exports.generateRoster = async (req, res) => {
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid month (1-12) and year (2020-2100).",
      });
    }

    const result = await generateMonthlyRoster(month, year);

    res.status(201).json({
      success: true,
      message: "Monthly roster generated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Roster generation failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate roster.",
      error: error.message,
    });
  }
};

// GET all generated rosters
exports.getRosters = async (req, res) => {
  try {
    const rosters = await prisma.roster.findMany({
      include: {
        _count: {
          select: {
            rosterDays: true,
            conflicts: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { version: "desc" },
      ],
    });

    res.json({
      success: true,
      count: rosters.length,
      data: rosters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET roster details
exports.getRosterById = async (req, res) => {
  try {
    const roster = await prisma.roster.findUnique({
      where: { id: req.params.id },
      include: {
        rosterDays: {
          include: {
            employee: {
              include: { pod: true },
            },
            allocations: {
              include: {
                assignment: {
                  include: {
                    brandProcess: {
                      include: {
                        brand: true,
                        process: true,
                      },
                    },
                  },
                },
                shift: true,
              },
            },
          },
          orderBy: [
            { date: "asc" },
            { employeeId: "asc" },
          ],
        },
        conflicts: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!roster) {
      return res.status(404).json({
        success: false,
        message: "Roster not found.",
      });
    }

    res.json({
      success: true,
      data: roster,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET conflicts for a roster
exports.getRosterConflicts = async (req, res) => {
  try {
    const roster = await prisma.roster.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!roster) {
      return res.status(404).json({
        success: false,
        message: "Roster not found.",
      });
    }

    const conflicts = await prisma.schedulingConflict.findMany({
      where: { rosterId: req.params.id },
      include: {
        employee: true,
        brandProcess: {
          include: {
            brand: true,
            process: true,
          },
        },
      },
      orderBy: [
        { date: "asc" },
        { severity: "desc" },
      ],
    });

    res.json({
      success: true,
      count: conflicts.length,
      data: conflicts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
