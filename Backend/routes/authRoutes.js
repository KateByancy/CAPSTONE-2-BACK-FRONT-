const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const validateRequest = require("../middeware/validation");
const verifyToken = require("../middeware/auth");
const { authorizeRoles } = require("../middeware/auth");

const {
  register,
  login,
  adminLogin,
  googleLogin,
  getGoogleConfig,
  getClients,
  updatePresence,
  clearPresence,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const adminSmsReset = require('../controllers/adminSmsResetController');
router.post('/admin/forgot-password',
    body('phone').isString().bail().trim().isLength({ max: 30 }).bail()
        .custom(value => Boolean(require('../services/adminSmsVerify').normalizePhone(value)))
        .withMessage('Enter a valid mobile number, such as 09XXXXXXXXX or +639XXXXXXXXX.'),
    validateRequest, adminSmsReset.requestCode);
router.post('/admin/reset-password', [
    body('challenge').isString().matches(/^[a-f0-9]{64}$/),
    body('code').isString().matches(/^\d{4,10}$/).withMessage('Enter the SMS verification code.'),
    body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Password must contain 8 to 72 characters.'),
    body('password').custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password is too long.'),
    validateRequest,
], adminSmsReset.resetPassword);

const emailAndPasswordRules = [
    body("email").trim().isEmail().withMessage("A valid email address is required."),
    body("password").isString().notEmpty().withMessage("Password is required.")
];

router.post("/register", [
    body().custom((value, { req }) => {
        if (!(req.body.fullname || req.body.fullName || "").trim()) {
            throw new Error("Full name is required.");
        }
        return true;
    }),
    body("email").trim().isEmail().withMessage("A valid email address is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must contain at least 8 characters."),
    body().custom((value, { req }) => {
        if (!(req.body.phone || req.body.phoneNumber || "").trim()) {
            throw new Error("Phone number is required.");
        }
        return true;
    }),
    body().custom((value, { req }) => {
        if (!(req.body.address || req.body.projectAddress || "").trim()) {
            throw new Error("Address is required.");
        }
        return true;
    }),
    validateRequest
], register);
router.post("/login", emailAndPasswordRules, validateRequest, login);
router.post("/admin-login", emailAndPasswordRules, validateRequest, adminLogin);
router.post("/google", body("credential").notEmpty().withMessage("Google credential is required."), validateRequest, googleLogin);
router.get("/google-config", getGoogleConfig);
router.post(
    "/forgot-password",
    body("email").trim().isEmail().withMessage("A valid email address is required."),
    validateRequest,
    forgotPassword
);
router.post("/reset-password", [
    body("token").isHexadecimal().isLength({ min: 64, max: 64 }).withMessage("A valid reset token is required."),
    body("password").isLength({ min: 8, max: 128 }).withMessage("Password must contain 8 to 128 characters."),
    validateRequest
], resetPassword);
router.post("/change-password", verifyToken, [
    body("currentPassword").isString().notEmpty().withMessage("Current password is required."),
    body("newPassword").isLength({ min: 8, max: 128 }).withMessage("New password must contain 8 to 128 characters."),
    body("newPassword").custom((value, { req }) => value !== req.body.currentPassword).withMessage("New password must be different from the current password."),
    validateRequest
], changePassword);
router.get("/clients", verifyToken, authorizeRoles("admin"), getClients);
router.post("/presence", verifyToken, authorizeRoles("client", "admin"), updatePresence);
router.post("/presence/offline", verifyToken, authorizeRoles("client", "admin"), clearPresence);


module.exports = router;
