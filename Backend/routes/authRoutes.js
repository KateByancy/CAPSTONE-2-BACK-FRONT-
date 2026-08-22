const express = require("express");
const router = express.Router();

const {
  register,
  login,
  adminLogin,
  getClients,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.get("/clients", getClients);


module.exports = router;
