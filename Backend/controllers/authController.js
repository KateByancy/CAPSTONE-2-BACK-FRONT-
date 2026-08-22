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
    const email = (req.body.email || "").trim().toLowerCase();
    const { password } = req.body;
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!adminEmail || !adminPassword) {
      return res.status(503).json({
        success: false,
        message: "Administrator authentication has not been configured.",
      });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials.",
      });
    }

    const admin = {
      id: 1,
      fullname: "Administrator",
      email: adminEmail,
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

exports.googleLogin = async (req, res) => {
  const credential = req.body.credential;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!credential) return res.status(400).json({ success: false, message: "Google credential is required." });
  if (!googleClientId) return res.status(503).json({ success: false, message: "Google sign-in has not been configured." });

  try {
    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const profile = await tokenResponse.json();
    if (!tokenResponse.ok || profile.aud !== googleClientId || profile.email_verified !== "true") {
      return res.status(401).json({ success: false, message: "Google sign-in could not be verified." });
    }

    db.query("SELECT id, fullname, phone, address, email FROM users WHERE email = ?", [profile.email], async (err, users) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      const issueToken = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET || "marc_secret_key", { expiresIn: "7d" });
      if (users.length) {
        const user = users[0];
        return res.json({ success: true, message: "Google sign-in successful.", token: issueToken(user), user });
      }

      const fullname = profile.name || profile.email.split("@")[0];
      db.query(
        "INSERT INTO users (fullname, phone, address, email, password, role) VALUES (?, ?, ?, ?, ?, 'client')",
        [fullname, "", "", profile.email, "GOOGLE_AUTH"],
        (insertError, result) => {
          if (insertError) return res.status(500).json({ success: false, message: insertError.message });
          const user = { id: result.insertId, fullname, phone: "", address: "", email: profile.email };
          return res.status(201).json({ success: true, message: "Google account created.", token: issueToken(user), user });
        }
      );
    });
  } catch {
    return res.status(502).json({ success: false, message: "Unable to verify Google sign-in." });
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
