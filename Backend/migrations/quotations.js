module.exports=async query=>{
 await query(`CREATE TABLE IF NOT EXISTS quotations (id INT AUTO_INCREMENT PRIMARY KEY,booking_id INT NOT NULL,revision INT NOT NULL,status VARCHAR(30) NOT NULL DEFAULT 'Sent',items JSON NOT NULL,total DECIMAL(12,2) NOT NULL,deposit DECIMAL(12,2) NOT NULL,note TEXT NOT NULL,change_note TEXT NULL,created_by INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,responded_at DATETIME NULL,UNIQUE KEY booking_revision(booking_id,revision)) ENGINE=InnoDB`);
 const columns=await query('SHOW COLUMNS FROM gcash_requests');
 if(!columns.some(row=>row.Field==='quote_id')){try{await query('ALTER TABLE gcash_requests ADD COLUMN quote_id INT NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
};
