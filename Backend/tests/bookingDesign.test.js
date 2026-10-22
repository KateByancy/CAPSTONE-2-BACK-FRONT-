const test = require('node:test');
const assert = require('node:assert/strict');
const resolve = require('../utils/bookingDesign');
const designs = require('../../Frontend/src/lib/marcDesigns.json');
test('all published cards preserve their canonical design details and client requirements', () => {
 for (const design of designs) {
  const result = resolve({design_id:design.id, service_type:design.category, project_description:'  Extra storage, please.  ', design_name:'Forged name'});
  assert.equal(result.service_type,design.category);
  assert.ok(result.project_description.includes('Selected design: '+design.name));
  assert.ok(result.project_description.includes('Design details: '+design.description));
  assert.ok(result.project_description.includes('Client requirements: Extra storage, please.'));
  assert.ok(!result.project_description.includes('Forged name'));
 }
});
test('rejects invalid IDs, mismatched categories, conflicting estimates, and missing requirements',()=>{
 for (const patch of [{design_id:'missing'},{service_type:'Office'},{estimate:{}},{project_description:' '},{project_description:'x'.repeat(5001)}]) {
  assert.throws(()=>resolve({design_id:'standard-living',service_type:'Living Room',project_description:'Storage',...patch}),{status:400});
 }
});
test('legacy bookings remain supported',()=>assert.equal(resolve({service_type:'Other',project_description:'Legacy request'}),null));
