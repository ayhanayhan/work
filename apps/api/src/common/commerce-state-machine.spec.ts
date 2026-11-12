import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, deriveOrderStatus, FULFILLMENT_TRANSITIONS, ORDER_TRANSITIONS, PAYMENT_ATTEMPT_TRANSITIONS, PAYMENT_TRANSITIONS, REFUND_TRANSITIONS, RETURN_TRANSITIONS } from './commerce-state-machine';

test('commerce state machine allows valid forward transitions and blocks terminal reversal', () => {
  assert.equal(canTransition(ORDER_TRANSITIONS, 'PENDING_PAYMENT', 'PROCESSING'), true);
  assert.equal(canTransition(ORDER_TRANSITIONS, 'CANCELLED', 'PROCESSING'), false);
  assert.equal(canTransition(PAYMENT_TRANSITIONS, 'PAID', 'PENDING'), false);
  assert.equal(canTransition(FULFILLMENT_TRANSITIONS, 'FULFILLED', 'UNFULFILLED'), false);
  assert.equal(canTransition(REFUND_TRANSITIONS, 'SUCCEEDED', 'PROCESSING'), false);
  assert.equal(canTransition(RETURN_TRANSITIONS, 'RECEIVED', 'EXCHANGED'), true);
  assert.equal(canTransition(RETURN_TRANSITIONS, 'REFUNDED', 'APPROVED'), false);
});

test('derived order status remains terminal and follows payment/fulfillment facts', () => {
  assert.equal(deriveOrderStatus({paymentStatus:'PAID',fulfillmentStatus:'UNFULFILLED',currentStatus:'PENDING_PAYMENT'}), 'PROCESSING');
  assert.equal(deriveOrderStatus({paymentStatus:'PAID',fulfillmentStatus:'FULFILLED',currentStatus:'PROCESSING'}), 'FULFILLED');
  assert.equal(deriveOrderStatus({paymentStatus:'REFUNDED',fulfillmentStatus:'FULFILLED',currentStatus:'FULFILLED'}), 'REFUNDED');
  assert.equal(deriveOrderStatus({paymentStatus:'PAID',fulfillmentStatus:'UNFULFILLED',currentStatus:'CANCELLED'}), 'CANCELLED');
});


test('payment attempt state machine never revives terminal attempts', () => {
  assert.equal(canTransition(PAYMENT_ATTEMPT_TRANSITIONS, 'CREATED', 'SUCCEEDED'), true);
  assert.equal(canTransition(PAYMENT_ATTEMPT_TRANSITIONS, 'UNKNOWN', 'SUCCEEDED'), true);
  assert.equal(canTransition(PAYMENT_ATTEMPT_TRANSITIONS, 'FAILED', 'SUCCEEDED'), false);
  assert.equal(canTransition(PAYMENT_ATTEMPT_TRANSITIONS, 'CANCELLED', 'SUCCEEDED'), false);
  assert.equal(canTransition(PAYMENT_ATTEMPT_TRANSITIONS, 'SUCCEEDED', 'FAILED'), false);
});
