import test from 'node:test';
import assert from 'node:assert/strict';
import {isVerifiedIyzicoPayment} from './iyzico-verification';

const valid={
  status:'success',paymentStatus:'SUCCESS',conversationId:'c-1',paidPrice:'100.00',currency:'TRY',basketId:'b-1',paymentId:'p-1'
};
const expected={conversationId:'c-1',amount:100,currency:'TRY',basketId:'b-1'};

test('accepts a fully matching successful payment',()=>{
  assert.equal(isVerifiedIyzicoPayment(valid,expected),true);
});

test('rejects amount, currency, basket and conversation tampering',()=>{
  assert.equal(isVerifiedIyzicoPayment({...valid,paidPrice:'99.99'},expected),false);
  assert.equal(isVerifiedIyzicoPayment({...valid,currency:'USD'},expected),false);
  assert.equal(isVerifiedIyzicoPayment({...valid,basketId:'other'},expected),false);
  assert.equal(isVerifiedIyzicoPayment({...valid,conversationId:'other'},expected),false);
});

test('rejects incomplete or unsuccessful provider results',()=>{
  assert.equal(isVerifiedIyzicoPayment({...valid,paymentId:''},expected),false);
  assert.equal(isVerifiedIyzicoPayment({...valid,status:'failure'},expected),false);
  assert.equal(isVerifiedIyzicoPayment({...valid,paymentStatus:'FAILURE'},expected),false);
});
