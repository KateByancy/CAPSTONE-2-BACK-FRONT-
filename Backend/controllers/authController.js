const db = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { issueAccessToken } = require("../utils/authTokens");

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, result) => error ? reject(error) : resolve(result));
});
const beginTransaction = () => new Promise((resolve, reject) => db.beginTransaction((error) => error ? reject(error) : resolve()));
const commit = () => new Promise((resolve, reject) => db.commit((error) => error ? reject(error) : resolve()));
const rollback = () => new Promise((resolve) => db.rollback(resolve));

const authenticationError = { success: false, message: "Invalid email or password." };

// ==============================
// REGISTER
// ==============================
exports.register = async (req, res) => {
  try {
    const fullname = (req.body.fullname || req.body.fullName || "").trim();
    const phone = (req.body.phone || req.body.phoneNumber || "").trim();
    const address = (req.body.address || req.body.projectAddress || "").trim();
    const landmark = (req.body.landmark || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    // Validation
    if (
      !fullname ||
      !phone ||
      !address ||
      !landmark ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }

    // Check if email exists
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Unable to create account.",
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
          (fullname, phone, address, landmark, email, password)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            fullname,
            phone,
            address,
            landmark,
            email,
            hashedPassword,
          ],
          (err, insertResult) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Unable to create account.",
              });
            }

            const user = {
              id: insertResult.insertId,
              fullname,
              phone,
              address,
              landmark,
              email,
            };

            const token = issueAccessToken({ ...user, role: "client" });

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
      message: "Unable to create account.",
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
          message: "Unable to sign in.",
        });
      }

      if (result.length === 0 || result[0].role === 'admin') {
        return res.status(401).json(authenticationError);
      }

      const user = result[0];

      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch {
        isMatch = false;
      }

      if (!isMatch) {
        return res.status(401).json(authenticationError);
      }

      const token = issueAccessToken(user);

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

    let rows = await query("SELECT id, fullname, email, role, password FROM users WHERE email = ? LIMIT 1", [email]);
    let account = rows[0];
    let matches = false;
    if (account?.role === 'admin' && account.password !== 'ADMIN_ENV_AUTH') {
      matches = await bcrypt.compare(password, account.password);
    } else if ((!account || account.role === 'admin') && email === adminEmail && adminPassword) {
      // Environment credentials bootstrap only; a saved password always takes precedence.
      matches = crypto.timingSafeEqual(crypto.createHash('sha256').update(password).digest(), crypto.createHash('sha256').update(adminPassword).digest());
      if (matches && !account) {
        await query("INSERT INTO users (fullname, email, password, role) VALUES ('Administrator', ?, 'ADMIN_ENV_AUTH', 'admin')", [email]);
        rows = await query("SELECT id, fullname, email, role, password FROM users WHERE email = ? LIMIT 1", [email]);
        account = rows[0];
      }
    }
    if (!matches || !account) return res.status(401).json(authenticationError);
    await query('UPDATE users SET last_seen = NOW() WHERE id = ?', [account.id]);
    const token = issueAccessToken(account);
    const admin = { id: account.id, fullname: account.fullname, email: account.email, role: account.role };

    return res.json({
      success: true,
      message: "Admin login successful.",
      token,
      admin,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to sign in.",
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
    if (!tokenResponse.ok || profile.aud !== googleClientId || !profile.email) {
      return res.status(401).json({ success: false, message: "Google sign-in could not be verified." });
    }

    const emailVerified = profile.email_verified === true || profile.email_verified === "true";
    if (!emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address in your Google account before signing in.",
      });
    }

    const googleEmail = String(profile.email).trim().toLowerCase();

    db.query("SELECT id, fullname, phone, address, landmark, email FROM users WHERE email = ?", [googleEmail], async (err, users) => {
      if (err) return res.status(500).json({ success: false, message: "Unable to sign in." });
      const issueToken = (user) => issueAccessToken({ ...user, role: "client" });
      if (users.length) {
        const user = users[0];
        return res.json({ success: true, message: "Google sign-in successful.", token: issueToken(user), user });
      }

      const fullname = profile.name || googleEmail.split("@")[0];
      db.query(
        "INSERT INTO users (fullname, phone, address, email, password, role) VALUES (?, ?, ?, ?, ?, 'client')",
        [fullname, "", "", googleEmail, "GOOGLE_AUTH"],
        (insertError, result) => {
          if (insertError) return res.status(500).json({ success: false, message: insertError.message });
          const user = { id: result.insertId, fullname, phone: "", address: "", landmark: "", email: googleEmail };
          return res.status(201).json({ success: true, message: "Google account created.", token: issueToken(user), user });
        }
      );
    });
  } catch {
    return res.status(502).json({ success: false, message: "Unable to verify Google sign-in." });
  }
};

exports.getGoogleConfig = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes("your-google-oauth")) {
    return res.status(503).json({ enabled: false, message: "Google sign-in has not been configured." });
  }
  return res.json({ enabled: true, clientId });
};

// ==============================
// ADMIN: CLIENT DIRECTORY
// ==============================
exports.getClients = (req, res) => {
  db.query(
    `SELECT id, fullname, email, phone, address, created_at, last_seen,
            (last_seen IS NOT NULL AND last_seen >= DATE_SUB(NOW(), INTERVAL 45 SECOND)) AS is_online
     FROM users
     WHERE role = 'client' OR role IS NULL
     ORDER BY created_at DESC, id DESC`,
    (err, users) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Unable to load clients." });
      }

      return res.json({ success: true, users });
    }
  );
};

exports.updatePresence = (req, res) => {
  const sql = 'UPDATE users SET last_seen = NOW() WHERE id = ?';
  const identity = req.user.id;
  db.query(sql, [identity], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Unable to update presence.", detail: process.env.NODE_ENV === "production" ? undefined : err.message });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Client account not found." });
    return res.json({ success: true });
  });
};

exports.clearPresence = (req, res) => {
  db.query("UPDATE users SET last_seen = NULL WHERE id = ?", [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Unable to update offline status." });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Account not found." });
    return res.json({ success: true });
  });
};

// ==============================
// PASSWORD RECOVERY
// ==============================
exports.forgotPassword = async (req, res, next) => {
  const genericResponse = {
    success: true,
    message: "If an account matches that email, password reset instructions will be sent."
  };

  try {
    const email = req.body.email.trim().toLowerCase();
    const users = await query("SELECT id FROM users WHERE email = ? AND role <> 'admin' LIMIT 1", [email]);

    if (!users.length) return res.json(genericResponse);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expirationMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 15);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await query("UPDATE password_reset_requests SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [users[0].id]);
    await query(
      "INSERT INTO password_reset_requests (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [users[0].id, tokenHash, expiresAt]
    );

    // A mail provider should deliver resetToken. It is exposed only to automated tests.
    if (process.env.NODE_ENV === "test") genericResponse.resetToken = resetToken;
    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
  let transactionStarted = false;

  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await beginTransaction();
    transactionStarted = true;

    const tokens = await query(
      `SELECT r.id, r.user_id FROM password_reset_requests r JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > NOW() AND u.role <> 'admin'
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );

    if (!tokens.length) {
      await rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: "Password reset token is invalid or expired." });
    }

    const token = tokens[0];
    await query("UPDATE users SET password = ? WHERE id = ?", [passwordHash, token.user_id]);
    await query("UPDATE password_reset_requests SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [token.user_id]);
    await commit();
    transactionStarted = false;

    return res.json({ success: true, message: "Password reset successful. You can now sign in." });
  } catch (error) {
    if (transactionStarted) await rollback();
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const users = await query("SELECT password FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!users.length) return res.status(401).json({ success: false, message: "Authentication is required." });

    let matches = false;
    try {
      matches = await bcrypt.compare(req.body.currentPassword, users[0].password);
    } catch {
      matches = false;
    }

    if (!matches) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await query("UPDATE users SET password = ? WHERE id = ?", [passwordHash, req.user.id]);
    await query("UPDATE password_reset_requests SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [req.user.id]);

    return res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    return next(error);
  }
};
