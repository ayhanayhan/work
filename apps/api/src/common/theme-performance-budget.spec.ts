import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeThemePerformanceBudget } from './theme-performance-budget';

test('ordinary theme stays inside performance budget',()=>{
  const r=analyzeThemePerformanceBudget({runtime:{templates:{index:{}},groups:{header:{}}},sections:[{type:'hero'}]});
  assert.equal(r.ok,true);
  assert.equal(r.sections,1);
});

test('pathologically large theme is rejected',()=>{
  const r=analyzeThemePerformanceBudget({config:{blob:'x'.repeat(950_000)},runtime:{},sections:[]});
  assert.equal(r.ok,false);
  assert.ok(r.violations.some(x=>x.includes('runtime boyutu')));
});
