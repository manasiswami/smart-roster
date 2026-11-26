
const express = require("express");
const router = express.Router();

const {
  getPods,
  createPod,
  updatePod,
  deletePod,
} = require("../controllers/pod.controller");

router.get("/", getPods);
router.post("/", createPod);
router.patch("/:id", updatePod);
router.delete("/:id", deletePod);

module.exports = router;
