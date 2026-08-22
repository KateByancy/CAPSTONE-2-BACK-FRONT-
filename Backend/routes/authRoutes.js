const express = require("express");
const router = express.Router();

const {
  register,
  login,
  adminLogin,
  googleLogin,
  getClients,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/google", googleLogin);
router.get("/clients", getClients);


module.exports = router;
