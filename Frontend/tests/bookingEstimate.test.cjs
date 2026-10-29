const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const snapshot = {
  area: 100,
  unit: 'sq ft',
  service: 'Living room',
  style: 'Modern',
  complexity: 'Standard',
  min: 20903,
  max: 25548
};

function renderPage(relativePath, states = {}, tab = 'home') {
  const stateNames = Object.keys(states);
  let stateIndex = 0;
  const mockReact = { ...React, useState(initial) { const i = stateIndex++; return [Object.hasOwn(states, stateNames[i]) ? states[stateNames[i]] : typeof initial === 'function' ? initial() : initial, () => {}]; }, useEffect() {}, useMemo: fn => fn() };
  function load(filename) {
    const instance = new Module(filename, module); instance.filename = filename; instance.paths = Module._nodeModulePaths(path.dirname(filename));
    instance.require = name => {
      if (name === 'react') return mockReact;
      if (name === '@/lib/api') return { getApiUrl: () => '', getClientSession: () => ({ id: 1 }) };
      if (name === '@/components/DesignGallery') return () => React.createElement('div', { id: 'mock-gallery' });
      if (name === '@/lib/use-design-catalog') {
        const catalog = require('../src/lib/marcDesigns.json');
        return {
          useDesignCatalog: () => ({ designs: catalog, error: '', loading: false }),
          designPrice: (price) => price == null ? 'Price on request' : 'From PHP ' + Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        };
      }
      if (name === '@/lib/use-navigation-selection') return { useNavigationSelection: () => [tab, () => {}] };
      if (name.startsWith('@/')) {
        const base = path.resolve(__dirname, '../src', name.slice(2));
        const file = fs.existsSync(base + '.tsx') ? base + '.tsx' : fs.existsSync(base + '.ts') ? base + '.ts' : base;
        return load(file);
      }
      return Module.prototype.require.call(instance, name);
    };
    instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return instance.exports;
  }
  const Page = load(path.resolve(__dirname, '../src', relativePath)).default;
  return renderToStaticMarkup(React.createElement(Page));
}
const estimatorStates = { area: 100, measurementUnit: 'sq ft', estimateServiceType: 'Living room', style: 'Modern', complexity: 'Standard', styleOptions: [{ name: 'Modern', value: 2500 }], complexityOptions: [{ name: 'Standard', value: 1 }], estimateFactors: [{ name: 'Minimum factor', value: 0.9 }, { name: 'Maximum factor', value: 1.1 }], bookingServices: [{ id: -1, name: 'Other' }], servicesLoading: false };
test('Client calculator renders correct sq ft and m2 ranges and unit selector', () => {
  let html = renderPage('app/(client)/home/page.tsx', estimatorStates);
  assert.match(html, /20,903/); assert.match(html, /25,548/); assert.match(html, /Square Feet \(sq ft\)/); assert.match(html, /Square Meters/);
  html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, measurementUnit: 'm2' });
  assert.match(html, /224,997/); assert.match(html, /274,997/);
});

test('Client estimated booking uses the estimated project without manual service selection', () => {
  const html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, isBookingOpen: true });
  assert.match(html, /Estimate included: Living room, 100 sq ft, Modern, Standard/);
  assert.match(html, /PHP 20,903 - 25,548/);
  assert.match(html, /Preferred consultation schedule/);
  assert.match(html, /Choose your preferred date and time to meet our design team/);
});

test('Client without an estimate can select Other and specify a service', () => {
  const html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, area: 0, isBookingOpen: true, serviceType: 'Other', otherService: 'Custom reading nook' });
  assert.match(html, /Specify your desired design\/service/); assert.match(html, /maxLength="100"/); assert.match(html, /value="Custom reading nook"/); assert.doesNotMatch(html, /Estimate included/);
});
test('Saved estimate renders on Client booking page', () => {
  const html = renderPage('app/(client)/book/page.tsx', { project: { serviceType: 'Custom reading nook', description: 'Test' }, savedEstimate: JSON.stringify(snapshot), scheduleStatus: 'pending' });
  assert.match(html, /Estimated range: PHP 20,903 - 25,548/); assert.match(html, /100 sq ft/);
});
test('Saved estimate renders on Admin pending and confirmed cards', () => {
  for (const status of ['pending', 'confirmed']) {
    const html = renderPage('app/admin/(dashboard)/book/page.tsx', { bookings: [{ id: '1', name: 'Test Client', scope: 'Custom reading nook', date: '2030-01-01', note: 'Test', status, estimate: snapshot }] }, status);
    assert.match(html, /Estimated range: PHP 20,903 - 25,548/); assert.match(html, /100 sq ft/);
  }
});

test('Client duplicate slot warning is explicit', () => {
  const html = renderPage('app/(client)/home/page.tsx', { ...estimatorStates, isBookingOpen: true, preferredStartDate: '2030-01-01', preferredStartTime: '09:00', clientBookedSlots: [{ visit_date: '2030-01-01', time_start: '09:00:00' }] });
  assert.match(html, /You already have a booking for this date and time/);
});
