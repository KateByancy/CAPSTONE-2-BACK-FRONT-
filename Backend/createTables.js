require("dotenv").config();
const db = require("./config/db");

const queries = [

`CREATE TABLE IF NOT EXISTS users(
id INT AUTO_INCREMENT PRIMARY KEY,
fullname VARCHAR(100),
phone VARCHAR(20),
address VARCHAR(255),
email VARCHAR(100) UNIQUE,
password VARCHAR(255),
role VARCHAR(20) DEFAULT 'client',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)` ,

`INSERT IGNORE INTO settings (id, app_name, system_mode, two_factor)
VALUES (1, 'MARC Interior Design', 'active', FALSE)`,

`ALTER TABLE tracking ADD COLUMN IF NOT EXISTS remarks TEXT`,

`ALTER TABLE messages MODIFY sender VARCHAR(20)`

`CREATE TABLE IF NOT EXISTS settings(
id INT PRIMARY KEY,
app_name VARCHAR(150) NOT NULL DEFAULT 'MARC Interior Design',
system_mode VARCHAR(30) NOT NULL DEFAULT 'active',
two_factor BOOLEAN NOT NULL DEFAULT FALSE
)`,

`CREATE TABLE IF NOT EXISTS portfolio(
id INT AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(150),
description TEXT,
image VARCHAR(255)
)`,

`CREATE TABLE IF NOT EXISTS bookings(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
service_type VARCHAR(100),
project_description TEXT,
status VARCHAR(50) DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS schedules(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
visit_date DATE,
status VARCHAR(30) DEFAULT 'Pending'
)`,

`CREATE TABLE IF NOT EXISTS payments(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
amount DECIMAL(10,2),
reference_number VARCHAR(100),
status VARCHAR(30) DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS tracking(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
progress INT DEFAULT 0,
current_stage VARCHAR(100),
remarks TEXT,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS notifications(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
title VARCHAR(150),
message TEXT,
is_read BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS messages(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
sender VARCHAR(20),
message TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS designs(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
title VARCHAR(150),
description TEXT,
image VARCHAR(255),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS inquiries(
id INT AUTO_INCREMENT PRIMARY KEY,
fullname VARCHAR(100),
email VARCHAR(100),
subject VARCHAR(150),
message TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`

];

queries.forEach((sql,index)=>{

    db.query(sql,(err)=>{

        if(err){

            console.log(err);

        }else{

            console.log(`✅ Table ${index+1} Ready`);

        }

        if(index===queries.length-1){

            process.exit();

        }

    });

});
