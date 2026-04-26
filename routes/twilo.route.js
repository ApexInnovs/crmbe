const express = require("express");
const router = express.Router();
const twiloController = require("../controller/twilo.controller");


router.post("/start-call", twiloController.startCall);
router.post("/voice-handler", twiloController.voiceHandler);
router.post("/recording", twiloController.recordingHandler);

module.exports = router;