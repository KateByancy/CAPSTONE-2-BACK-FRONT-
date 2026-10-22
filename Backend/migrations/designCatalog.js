module.exports = async query => {
 await query(`CREATE TABLE IF NOT EXISTS design_catalog (id VARCHAR(80) PRIMARY KEY, title VARCHAR(150) NOT NULL, category VARCHAR(100) NOT NULL, description TEXT NOT NULL, image VARCHAR(255) NOT NULL, price DECIMAL(12,2) NULL, features JSON NULL, published BOOLEAN NOT NULL DEFAULT TRUE, deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 const columns=await query('SHOW COLUMNS FROM design_catalog');
 if(!columns.some(column=>column.Field==='features')) {try{await query('ALTER TABLE design_catalog ADD COLUMN features JSON NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
 const oldImages={"standard-living":"/designs/Bronze_Sample_1_Living_Room.jpg","standard-kitchen":"/designs/Bronze_Sample_2_Kitchen.jpg","silver-office":"/designs/Silver_Sample_3_Office.jpg","silver-kitchen":"/designs/Silver_Sample_2_Kitchen.jpg","deluxe-living":"/designs/Silver_Sample_1_Living_Room.jpg","silver-office-suite":"/designs/Silver_Sample_3_Office.jpg"};
 for(const design of require('../../Frontend/src/lib/marcDesigns.json')) {
  await query('INSERT IGNORE INTO design_catalog (id,title,category,description,image,price,features) VALUES (?,?,?,?,?,?,?)',[design.id,design.name,design.category,design.description,design.image,design.price,JSON.stringify(design.features)]);
  // Replace removed sample assets once. Preserve admin prices, publication state, and subsequent edits.
  if(oldImages[design.id])await query('UPDATE design_catalog SET title=?,category=?,description=?,image=?,features=? WHERE id=? AND image=? AND deleted=FALSE',[design.name,design.category,design.description,design.image,JSON.stringify(design.features),design.id,oldImages[design.id]]);
 }
};
