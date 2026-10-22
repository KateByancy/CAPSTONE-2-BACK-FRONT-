const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');
process.env.JWT_SECRET='access-control-fixture';
const dbPath=require.resolve('../config/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query(sql,values,callback){
 if(sql.startsWith('SELECT password'))return callback(null,[{password:'ADMIN_ENV_AUTH'}]);
 const [id,user]=values;callback(null,Number(user)===11 && [1,7].includes(Number(id))?[{id}]:[]);
}}};
const {issueAccessToken}=require('../utils/authTokens');
test('project, notification and client-home APIs deny cross-client and privileged actions',async()=>{
 const app=express();app.use(express.json());
 for(const resource of ['booking','schedule','tracking','designs','notifications','client-home'])app.use('/'+resource,...require('../middeware/projectAccess')(resource),(req,res)=>res.json({user_id:req.query.user_id,body:req.body}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,method='GET',body,role='client')=>{const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+issueAccessToken({id:role==='admin'?9:11,role}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};};
 for(const resource of ['booking','schedule','tracking','notifications']){
  assert.equal((await call('/'+resource+'/99')).status,404);
  assert.equal((await call('/'+resource+'/1')).status,200);
 }
 assert.equal((await call('/booking?user_id=22')).data.user_id,'11');
 assert.equal((await call('/client-home?user_id=22')).data.user_id,'11');
 assert.equal((await call('/notifications?user_id=22')).data.user_id,'11');
 assert.equal((await call('/booking','POST',{user_id:22})).data.body.user_id,11);
 assert.equal((await call('/booking/1','PUT',{status:'Approved'})).status,403);
 assert.equal((await call('/tracking/1','PUT',{progress:100})).status,403);
 assert.equal((await call('/notifications','POST',{user_id:22})).status,403);
 assert.equal((await call('/designs?project_id=99')).status,404);
 assert.equal((await call('/designs?project_id=1')).status,200);
 assert.equal((await call('/booking/fleet-locations')).status,403);
 assert.equal((await call('/booking/fleet-locations','GET',undefined,'admin')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
