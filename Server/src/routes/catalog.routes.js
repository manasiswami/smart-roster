
const express = require("express");
const router = express.Router();

const catalog = require("../controllers/catalog.controller");

// Brand routes
router.get("/brands", catalog.getBrands);
router.post("/brands", catalog.createBrand);
router.patch("/brands/:id", catalog.updateBrand);

// Process routes
router.get("/processes", catalog.getProcesses);
router.post("/processes", catalog.createProcess);
router.patch("/processes/:id", catalog.updateProcess);

// Brand-process routes
router.get("/brand-processes", catalog.getBrandProcesses);
router.post("/brand-processes", catalog.createBrandProcess);
router.patch("/brand-processes/:id", catalog.updateBrandProcess);

module.exports = router;
