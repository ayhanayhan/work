import test from 'node:test';
import assert from 'node:assert/strict';
import { routeInventory } from './fulfillment-routing';

test('routing keeps an order in one warehouse whenever one location can fulfill it',()=>{
 const rows=[{warehouseId:'a',available:3,priority:1},{warehouseId:'b',available:10,priority:2}];
 assert.deepEqual(routeInventory(rows,5,'SINGLE_WAREHOUSE',true),[{warehouseId:'b',quantity:5,reason:'SINGLE_WAREHOUSE:single'}]);
});

test('routing splits only when configured and no location can fulfill the full quantity',()=>{
 const rows=[{warehouseId:'a',available:3,priority:1},{warehouseId:'b',available:2,priority:2}];
 assert.deepEqual(routeInventory(rows,5,'PRIORITY',false),[]);
 assert.deepEqual(routeInventory(rows,5,'PRIORITY',true),[{warehouseId:'a',quantity:3,reason:'PRIORITY:split'},{warehouseId:'b',quantity:2,reason:'PRIORITY:split'}]);
});

test('nearest and cost optimized routing respect their explicit signals',()=>{
 const rows=[{warehouseId:'near',available:10,priority:50,distanceKm:4,unitCost:9},{warehouseId:'cheap',available:10,priority:1,distanceKm:30,unitCost:2}];
 assert.equal(routeInventory(rows,2,'NEAREST',true)[0]?.warehouseId,'near');
 assert.equal(routeInventory(rows,2,'COST_OPTIMIZED',true)[0]?.warehouseId,'cheap');
});
