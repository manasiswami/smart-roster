const express = require("express");
const router = express.Router();

const controller = require("../controllers/roster.controller");
const editController = require("../controllers/roster-edit.controller");

router.post("/generate", controller.generateRoster);
router.get("/", controller.getRosters);
router.post("/:rosterId/revalidate", editController.revalidateRoster);
router.patch("/:rosterId/days/:dayId/allocations", editController.updateRosterDayAllocations);
router.get("/:id/conflicts", controller.getRosterConflicts);
router.get("/:id", controller.getRosterById);

module.exports = router;
