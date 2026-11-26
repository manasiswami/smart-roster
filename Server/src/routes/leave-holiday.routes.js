
const express = require("express");
const router = express.Router();

const controller = require("../controllers/leave-holiday.controller");

router.get("/leaves", controller.getLeaves);
router.post("/leaves", controller.createLeave);
router.patch("/leaves/:id/status", controller.updateLeaveStatus);

router.get("/holidays", controller.getHolidays);
router.post("/holidays", controller.createHoliday);
router.delete("/holidays/:id", controller.deleteHoliday);

module.exports = router;
