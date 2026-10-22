const db=require('../config/db');
module.exports=async function paymentAudit(req,event,sql,values,details={}){
 const {host,port,user,password,database}=db.config;
 const connection=await require('mysql2/promise').createConnection({host,port,user,password,database,ssl:require('../config/dbSsl')()});
 try{
  await connection.beginTransaction();
  const [result]=await connection.query(sql,values);
  if(result.affectedRows){
   const paymentId=req.params.id?Number(req.params.id):event==='request_created'?result.insertId:null;
   await connection.execute('INSERT INTO payment_audit (payment_id,actor_id,event,details) VALUES (?,?,?,?)',[paymentId,req.user.id,event,JSON.stringify(details)]);
  }
  await connection.commit();return result;
 }catch(error){await connection.rollback();throw error;}finally{await connection.end();}
};
