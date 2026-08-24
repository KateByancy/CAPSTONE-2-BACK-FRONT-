require("dotenv").config();

const mysql = require("mysql2");

const databaseName = process.env.DB_NAME || "design_booking_db";
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(databaseName)}`, (error) => {
  if (error) {
    console.error("Database creation failed:", error.message);
    process.exitCode = 1;
    connection.destroy();
  } else {
    console.log(`Database '${databaseName}' is ready.`);
    connection.end();
  }
});
