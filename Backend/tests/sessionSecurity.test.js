const test=require('node:test');const assert=require('node:assert/strict');const jwt=require('jsonwebtoken');
process.env.JWT_SECRET='session-security-fixture';
const dbPath=require.resolve('../config/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query(_sql,_values,callback){callback(null,[{password:'ADMIN_ENV_AUTH'}]);}}};
const {issueAccessToken}=require('../utils/authTokens');const auth=require('../middeware/auth');
const invoke=async token=>{let allowed=false;const res={statusCode:200,status(code){this.statusCode=code;return this;},json(){return this;}};await auth({headers:{authorization:'Bearer '+token}},res,()=>{allowed=true;});return {allowed,status:res.statusCode};};
test('new sessions expire, and old unbounded or forged tokens are rejected',async()=>{
 for(const [role,hours] of [['admin',8],['client',24]]){const token=issueAccessToken({id:1,role});const claims=jwt.decode(token);assert.equal(claims.exp-claims.iat,hours*3600);assert.equal((await invoke(token)).allowed,true);}
 assert.equal((await invoke(jwt.sign({id:1,role:'client'},process.env.JWT_SECRET))).status,401);
 assert.equal((await invoke(jwt.sign({id:1,role:'client'},process.env.JWT_SECRET,{expiresIn:-1}))).status,401);
 assert.equal((await invoke(jwt.sign({id:1,role:'admin'},'wrong-key',{expiresIn:'1h'}))).status,401);
 assert.equal((await invoke(jwt.sign({id:1,role:'owner'},process.env.JWT_SECRET,{expiresIn:'1h'}))).status,401);
});
const validDate=require('../utils/projectDate');test('project dates reject impossible and past dates',()=>{assert.equal(validDate('2030-02-30'),false);assert.equal(validDate('2020-01-01'),false);assert.equal(validDate('2030-02-28'),true);assert.equal(validDate('tomorrow'),false);});
