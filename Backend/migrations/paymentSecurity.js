module.exports=async query=>{
 const columns=await query('SHOW COLUMNS FROM gcash_requests');
 if(!columns.some(column=>column.Field==='proof_hash')){try{await query('ALTER TABLE gcash_requests ADD COLUMN proof_hash CHAR(64) NULL, ADD UNIQUE KEY unique_receipt_hash (proof_hash)');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
 await query(`CREATE TABLE IF NOT EXISTS payment_audit (id BIGINT AUTO_INCREMENT PRIMARY KEY,payment_id INT NULL,actor_id INT NOT NULL,event VARCHAR(40) NOT NULL,details JSON NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX payment_history (payment_id,id)) ENGINE=InnoDB`);
};
