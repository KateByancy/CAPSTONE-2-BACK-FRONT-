const db = require('../config/db');
const auth = require('./auth');
const query=(sql,values)=>new Promise((resolve,reject)=>db.query(sql,values,(error,rows)=>error?reject(error):resolve(rows)));
const ownBooking=async(id,user)=>{const rows=await query('SELECT id FROM bookings WHERE id=? AND user_id=?',[id,user]);return Boolean(rows.length);};
const ownRejectedBooking=async(id,user)=>{const bookingId=Number(id);const userId=Number(user);if(!Number.isSafeInteger(bookingId)||bookingId<=0||!Number.isSafeInteger(userId)||userId<=0)return false;const rows=await query('SELECT id FROM bookings WHERE id=? AND user_id=? AND LOWER(status)=?',[bookingId,userId,'rejected']);return Boolean(rows.length);};
module.exports = resource => [auth, auth.authorizeRoles('admin','client'), async(req,res,next)=>{
 res.set('Cache-Control','no-store');
 if(req.user.role==='admin')return next();
 const id=req.path.split('/').filter(Boolean)[0];
 const method=req.method;
 const deny=()=>res.status(403).json({success:false,message:'You do not have access to this action.'});
 try {
  if(resource==='booking'){
   if(method==='POST' && !id){req.body.user_id=req.user.id;return next();}
   if(method==='DELETE' && id){
     if(await ownRejectedBooking(id,req.user.id)) return next();
     return deny();
   }
   if(method!=='GET')return deny();
   if(id==='fleet-locations')return deny();
   if(id && !await ownBooking(id,req.user.id))return res.status(404).json({message:'Booking not found.'});
   req.query.user_id=String(req.user.id);return next();
  }
  if(resource==='schedule'){
   if(method==='GET' && id==='unavailable')return next();
   if(method==='POST' && !id){
    const rows=await query('SELECT s.id FROM schedules s JOIN bookings b ON b.id=s.booking_id WHERE b.id=? AND b.user_id=? ORDER BY s.id DESC LIMIT 1',[req.body.booking_id,req.user.id]);
    if(!rows.length)return res.status(404).json({message:'Booking schedule not found.'});
    req.params.id=String(rows[0].id);req.body.user_id=req.user.id;
    return require('../controllers/scheduleController').reschedulePendingVisit(req,res);
   }
   if(method==='GET' && !id){req.query.user_id=String(req.user.id);return next();}
   if(method==='PUT' && /^\/\d+\/reschedule$/.test(req.path)){req.body.user_id=req.user.id;return next();}
   if(method==='GET' && id){const rows=await query('SELECT s.id FROM schedules s JOIN bookings b ON b.id=s.booking_id WHERE s.id=? AND b.user_id=?',[id,req.user.id]);return rows.length?next():res.status(404).json({message:'Schedule not found.'});}
   return deny();
  }
  if(resource==='tracking'){
   if(method!=='GET')return deny();
   if(id && !await ownBooking(id,req.user.id))return res.status(404).json({message:'Project not found.'});
   return next();
  }
  if(resource==='client-home'){req.query.user_id=String(req.user.id);return method==='GET'?next():deny();}
  if(resource==='designs'){
   const project=method==='GET'||method==='DELETE'?req.query.project_id:req.body.project_id;
   if(!await ownBooking(project,req.user.id))return res.status(404).json({message:'Project not found.'});
   return next();
  }
  if(resource==='notifications'){
   if(method==='POST')return deny();
   if(!id || id==='read-all'){req.query.user_id=String(req.user.id);return next();}
   const rows=await query('SELECT id FROM notifications WHERE id=? AND user_id=?',[id,req.user.id]);return rows.length?next():res.status(404).json({message:'Notification not found.'});
  }
  return deny();
 }catch{res.status(503).json({message:'Unable to verify access. Please try again.'});}
}];
