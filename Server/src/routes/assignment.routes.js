const express = require("express");
const router = express.Router();

const {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require("../controllers/assignment.controller");

router.get("/", getAssignments);
router.post("/", createAssignment);
router.patch("/:id", updateAssignment);
router.delete("/:id", deleteAssignment);

module.exports = router;