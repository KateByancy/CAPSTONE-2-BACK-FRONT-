/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS tests load mocked modules with require(). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const snapshot = { area: 100, unit: 'sq ft', service: 'Living room', style: 'Modern', complexity: 'Standard', min: 20903, max: 25548 };
function renderPage(relativePath, states, tab = 'pending') {
  let stateIndex = 0;
  const mockReact = { ...React, useState(initial) { const i = stateIndex++; return [Object.hasOwn(states, i) ? states[i] : typeof initial === 'function' ? initial() : initial, () => {}]; }, useEffect() {}, useMemo: fn => fn() };
  function load(filename) {
    const instance = new Module(filename, module); instance.filename = filename; instance.paths = Module._nodeModulePaths(path.dirname(filename));
    instance.require = name => {
      if (name === 'react') return mockReact;
      if (name === '@/lib/api') return { getApiUrl: () => '', getClientSession: () => ({ id: 1 }) };
      if (name === '@/lib/use-navigation-selection') return { useNavigationSelection: () => [tab, () => {}] };
      if (name.startsWith('@/')) return load(path.resolve(__dirname, '../src', name.slice(2) + '.tsx'));
      return Module.prototype.require.call(instance, name);
    };
    instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return instance.exports;
  }
  const Page = load(path.resolve(__dirname, '../src', relativePath)).default;
  return renderToStaticMarkup(React.createElement(Page));
}
const estimatorStates = { 0: 100, 1: 'sq ft', 2: 'Living room', 3: 'Modern', 4: 'Standard', 5: [{ name: 'Modern', value: 2500 }], 6: [{ name: 'Standard', value: 1 }], 7: [{ name: 'Minimum factor', value: 0.9 }, { name: 'Maximum factor', value: 1.1 }], 10: [{ id: -1, name: 'Other' }], 11: false };
test('Client calculator renders correct sq ft and m2 ranges and unit selector', () => {
  let html = renderPage('app/(client)/home/page.tsx', estimatorStates);
  assert.match(html, /20,903/); assert.match(html, /25,548/); assert.match(html, /Square Feet \(sq ft\)/); assert.match(html, /Square Meters/);
  html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, 1: 'm\u00b2' });
  assert.match(html, /225,000/); assert.match(html, /275,000/);
});
test('Client Other form renders required custom field and attached estimate', () => {
  const html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, 21: true, 23: 'Other', 24: 'Custom reading nook' });
  assert.match(html, /Specify your desired design\/service/); assert.match(html, /maxLength="100"/); assert.match(html, /value="Custom reading nook"/); assert.match(html, /Estimate included/);
});
test('Saved estimate renders on Client booking page', () => {
  const html = renderPage('app/(client)/book/page.tsx', { 3: { serviceType: 'Custom reading nook', description: 'Test' }, 4: JSON.stringify(snapshot), 7: 'pending' });
  assert.match(html, /Estimated range: PHP 20,903 - 25,548/); assert.match(html, /100 sq ft/);
});
test('Saved estimate renders on Admin pending and confirmed cards', () => {
  for (const status of ['pending', 'confirmed']) {
    const html = renderPage('app/admin/(dashboard)/book/page.tsx', { 0: [{ id: '1', name: 'Test Client', scope: 'Custom reading nook', date: '2030-01-01', note: 'Test', status, estimate: snapshot }] }, status);
    assert.match(html, /Estimated range: PHP 20,903 - 25,548/); assert.match(html, /100 sq ft/);
  }
});

test('Client duplicate slot warning is explicit', () => {
  const html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, 21: true, 29: '2030-01-01', 30: '09:00', 34: [{ visit_date: '2030-01-01', time_start: '09:00:00' }] });
  assert.match(html, /You already have a booking for this date and time/);
});
