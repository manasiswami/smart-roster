
const express = require("express");
const router = express.Router();

const controller = require("../controllers/scheduling-rules.controller");

router.get("/operating-rules", controller.getOperatingRules);
router.post("/operating-rules", controller.saveOperatingRule);

router.get("/operating-exceptions", controller.getOperatingExceptions);
router.post("/operating-exceptions", controller.createOperatingException);

router.get("/weekly-offs", controller.getWeeklyOffs);
router.post("/weekly-offs", controller.createWeeklyOff);

router.get("/availability", controller.getAvailability);
router.post("/availability", controller.saveAvailability);
router.delete("/operating-exceptions/:id", controller.deleteOperatingException
);

module.exports = router;
