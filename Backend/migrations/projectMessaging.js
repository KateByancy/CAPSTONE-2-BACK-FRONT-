module.exports=async query=>{
 await query(`CREATE TABLE IF NOT EXISTS project_messages (id BIGINT AUTO_INCREMENT PRIMARY KEY,booking_id INT NOT NULL,sender_id INT NOT NULL,sender VARCHAR(10) NOT NULL,message TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX project_conversation(booking_id,id)) ENGINE=InnoDB`);
 await query(`CREATE TABLE IF NOT EXISTS admin_notification_reads (admin_id INT NOT NULL,event_key VARCHAR(80) NOT NULL,read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(admin_id,event_key)) ENGINE=InnoDB`);
};
