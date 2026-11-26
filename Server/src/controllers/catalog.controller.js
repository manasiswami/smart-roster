
const prisma = require("../config/prisma");

const sendError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({
    success: false,
    message,
  });
};

// ---------- BRANDS ----------

// GET /api/brands
exports.getBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        processes: {
          include: {
            process: true,
            _count: { select: { assignments: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, count: brands.length, data: brands });
  } catch (error) {
    return sendError(res, error, "Failed to fetch brands");
  }
};

// POST /api/brands
exports.createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() || null : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Brand name already exists",
      });
    }
    return sendError(res, error, "Failed to create brand");
  }
};

// PATCH /api/brands/:id
exports.updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Brand name cannot be empty",
        });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description =
        typeof description === "string" ? description.trim() || null : null;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }
      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Brand name already exists",
      });
    }
    return sendError(res, error, "Failed to update brand");
  }
};

// ---------- PROCESSES ----------

// GET /api/processes
exports.getProcesses = async (req, res) => {
  try {
    const processes = await prisma.process.findMany({
      include: {
        brandProcesses: {
          include: { brand: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      count: processes.length,
      data: processes,
    });
  } catch (error) {
    return sendError(res, error, "Failed to fetch processes");
  }
};

// POST /api/processes
exports.createProcess = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Process name is required",
      });
    }

    const process = await prisma.process.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() || null : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Process created successfully",
      data: process,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Process name already exists",
      });
    }
    return sendError(res, error, "Failed to create process");
  }
};

// PATCH /api/processes/:id
exports.updateProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Process name cannot be empty",
        });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description =
        typeof description === "string" ? description.trim() || null : null;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }
      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const process = await prisma.process.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: "Process updated successfully",
      data: process,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Process not found",
      });
    }
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Process name already exists",
      });
    }
    return sendError(res, error, "Failed to update process");
  }
};

// ---------- BRAND PROCESSES ----------

// GET /api/brand-processes?brandId=...
exports.getBrandProcesses = async (req, res) => {
  try {
    const where = {};

    if (req.query.brandId) where.brandId = req.query.brandId;
    if (req.query.processId) where.processId = req.query.processId;

    const records = await prisma.brandProcess.findMany({
      where,
      include: {
        brand: true,
        process: true,
        operatingRules: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { brand: { name: "asc" } },
    });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    return sendError(res, error, "Failed to fetch brand processes");
  }
};

// POST /api/brand-processes
exports.createBrandProcess = async (req, res) => {
  try {
    const {
      brandId,
      processId,
      operatesOnPublicHolidays = false,
    } = req.body;

    if (!brandId || !processId) {
      return res.status(400).json({
        success: false,
        message: "brandId and processId are required",
      });
    }

    if (typeof operatesOnPublicHolidays !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "operatesOnPublicHolidays must be true or false",
      });
    }

    const [brand, process] = await Promise.all([
      prisma.brand.findUnique({ where: { id: brandId } }),
      prisma.process.findUnique({ where: { id: processId } }),
    ]);

    if (!brand || !process) {
      return res.status(404).json({
        success: false,
        message: "Brand or process not found",
      });
    }

    if (!brand.isActive || !process.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot link an inactive brand or process",
      });
    }

    const record = await prisma.brandProcess.create({
      data: {
        brandId,
        processId,
        operatesOnPublicHolidays,
      },
      include: {
        brand: true,
        process: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Process linked to brand successfully",
      data: record,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This process is already linked to the brand",
      });
    }
    return sendError(res, error, "Failed to link process to brand");
  }
};

// PATCH /api/brand-processes/:id
exports.updateBrandProcess = async (req, res) => {
  try {
    const { isActive, operatesOnPublicHolidays } = req.body;
    const data = {};

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }
      data.isActive = isActive;
    }

    if (operatesOnPublicHolidays !== undefined) {
      if (typeof operatesOnPublicHolidays !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "operatesOnPublicHolidays must be true or false",
        });
      }
      data.operatesOnPublicHolidays = operatesOnPublicHolidays;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const record = await prisma.brandProcess.update({
      where: { id: req.params.id },
      data,
      include: { brand: true, process: true },
    });

    res.json({
      success: true,
      message: "Brand process updated successfully",
      data: record,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Brand process not found",
      });
    }
    return sendError(res, error, "Failed to update brand process");
  }
};
