const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ==============================
// REGISTER
// ==============================
exports.register = async (req, res) => {
  try {
    const fullname = (req.body.fullname || req.body.fullName || "").trim();
    const phone = (req.body.phone || req.body.phoneNumber || "").trim();
    const address = (req.body.address || req.body.projectAddress || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    // Validation
    if (
      !fullname ||
      !phone ||
      !address ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    // Check if email exists
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        if (result.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Email already registered.",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          `INSERT INTO users
          (fullname, phone, address, email, password)
          VALUES (?, ?, ?, ?, ?)`,
          [
            fullname,
            phone,
            address,
            email,
            hashedPassword,
          ],
          (err, insertResult) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: err.message,
              });
            }

            const user = {
              id: insertResult.insertId,
              fullname,
              phone,
              address,
              email,
            };

            const token = jwt.sign(
              { id: user.id },
              process.env.JWT_SECRET || "marc_secret_key",
              { expiresIn: "7d" }
            );

            res.status(201).json({
              success: true,
              message: "Registration successful.",
              token,
              user,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// LOGIN
// ==============================
exports.login = (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const user = result[0];

      const isMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || "marc_secret_key",
        {
          expiresIn: "7d",
        }
      );

      res.json({
        success: true,
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          fullname: user.fullname,
          phone: user.phone,
          address: user.address,
          email: user.email,
        },
      });
    }
  );
};
// ==============================
// ADMIN LOGIN
// ==============================
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Hardcoded administrator account
    if (
      email.trim().toLowerCase() !== "marc@gmail.com" ||
      password !== "12345678"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials.",
      });
    }

    const admin = {
      id: 1,
      fullname: "Administrator",
      email: "marc@gmail.com",
      role: "admin",
    };

    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.role,
      },
      process.env.JWT_SECRET || "marc_secret_key",
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      success: true,
      message: "Admin login successful.",
      token,
      admin,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// ADMIN: CLIENT DIRECTORY
// ==============================
exports.getClients = (req, res) => {
  db.query(
    `SELECT id, fullname, email, phone, address, created_at
     FROM users
     WHERE role = 'client' OR role IS NULL
     ORDER BY created_at DESC, id DESC`,
    (err, users) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      return res.json({ success: true, users });
    }
  );
};
