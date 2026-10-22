/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the existing client components with isolated hooks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');

function loadPage(relativePath, initialStates = []) {
  const states = [...initialStates];
  const components = new Map();
  let cursor = 0;
  let tab = 'home';
  const component = name => {
    if (!components.has(name)) components.set(name, () => null);
    return components.get(name);
  };
  const react = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect() {}, useCallback: callback => callback, useRef: value => ({ current: value }),
    useSyncExternalStore: (_subscribe, _snapshot, serverSnapshot) => serverSnapshot(),
  };
  const filename = path.resolve(__dirname, '../src/app/(client)', relativePath);
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  instance.require = name => {
    if (name === 'react') return react;
    if (name === '@/lib/api') return { getApiUrl: () => '/api', getClientSession: () => null };
    if (name === '@/lib/use-navigation-selection') return {
      useNavigationSelection: key => key === 'screen' ? ['dashboard', () => {}] : [tab, value => { tab = value; }],
    };
    if (name === '@/lib/use-design-catalog') return {
      useDesignCatalog: () => ({ designs: [{ id: 'design-2', name: 'Selected design', category: 'Living room', price: 1000 }], loading: false }),
      designPrice: value => String(value),
    };
    if (name.endsWith('.json')) return require(path.resolve(__dirname, '../src', name.replace('@/', '')));
    if (name.startsWith('@/') || name.startsWith('./') || name === 'next/image') return component(name);
    return Module.prototype.require.call(instance, name);
  };
  instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return {
    component,
    get tab() { return tab; },
    set tab(value) { tab = value; },
    render(props = {}) { cursor = 0; return instance.exports.default(props); },
  };
}

function find(node, predicate) {
  if (!React.isValidElement(node)) return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

test('client sidebar expands on hover, collapses on leave, and marks Customize active', () => {
  const page = loadPage('dashboardshell/page.tsx');
  const render = () => page.render({ activeTab: 'customize', userName: 'Test Client' });
  const sidebar = () => find(render(), node => node.type === 'aside');
  assert.equal(sidebar().props['data-expanded'], false);
  sidebar().props.onMouseEnter();
  assert.equal(sidebar().props['data-expanded'], true);
  sidebar().props.onMouseLeave();
  assert.equal(sidebar().props['data-expanded'], false);
  assert.equal(find(render(), node => node.props['aria-label'] === 'Customize Design').props['aria-current'], 'page');
  assert.equal(find(render(), node => node.props.className === 'marc-sidebar-handle'), undefined);
});

test('Browse and Customize keep the same Home component identity so selection and booking state survive', () => {
  const page = loadPage('page.tsx', [false, 'Test Client']);
  const browse = page.render().props.children;
  page.tab = 'customize';
  const customize = page.render().props.children;
  assert.equal(customize.type, browse.type);
  assert.equal(customize.key, browse.key);
  assert.equal(browse.props.initialCustomize, false);
  assert.equal(customize.props.initialCustomize, true);
});

test('gallery Customize selects the menu tab and preserves the chosen design in the editor', () => {
  const page = loadPage('home/page.tsx');
  const setActiveTab = value => { page.tab = value; };
  let tree = page.render({ setActiveTab });
  const gallery = find(tree, node => node.type === page.component('@/components/DesignGallery'));
  gallery.props.onCustomize({ id: 'design-2' });
  assert.equal(page.tab, 'customize');
  tree = page.render({ setActiveTab, initialCustomize: true });
  const editor = find(tree, node => node.type === page.component('@/components/DesignCustomizer'));
  assert.equal(editor.props.initialDesignId, 'design-2');
  editor.props.onBack();
  assert.equal(page.tab, 'home');
});
