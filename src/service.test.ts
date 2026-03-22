import { describe, it, expect, vi } from 'vitest';
import {
  createUserSessionState,
  processInboundMessage,
  recordOutboundSent,
  shouldAutoNotify,
  getEffectiveRemaining,
} from './service.js';

describe('user session state', () => {
  it('starts with null active user', () => {
    const state = createUserSessionState();
    expect(state.activeUser).toBeNull();
  });

  it('processInboundMessage sets active user and context token', () => {
    const state = createUserSessionState();
    processInboundMessage(state, { fromUserId: 'user1', contextToken: 'tok1' });
    expect(state.activeUser).toBe('user1');
    const us = state.sessions.get('user1')!;
    expect(us.contextToken).toBe('tok1');
    expect(us.sentCount).toBe(0);
    expect(us.exhausted).toBe(false);
  });

  it('new inbound message resets sentCount and exhausted', () => {
    const state = createUserSessionState();
    processInboundMessage(state, { fromUserId: 'user1', contextToken: 'tok1' });
    recordOutboundSent(state, 'user1');
    recordOutboundSent(state, 'user1');
    processInboundMessage(state, { fromUserId: 'user1', contextToken: 'tok2' });
    const us = state.sessions.get('user1')!;
    expect(us.sentCount).toBe(0);
    expect(us.exhausted).toBe(false);
    expect(us.contextToken).toBe('tok2');
  });

  it('recordOutboundSent increments sentCount and returns remaining', () => {
    const state = createUserSessionState();
    processInboundMessage(state, { fromUserId: 'u', contextToken: 't' });
    expect(recordOutboundSent(state, 'u')).toBe(9); // remaining after 1st send
    expect(recordOutboundSent(state, 'u')).toBe(8);
  });

  it('shouldAutoNotify returns true only at sentCount === 9', () => {
    const state = createUserSessionState();
    processInboundMessage(state, { fromUserId: 'u', contextToken: 't' });
    for (let i = 0; i < 8; i++) {
      recordOutboundSent(state, 'u');
      expect(shouldAutoNotify(state, 'u')).toBe(false);
    }
    recordOutboundSent(state, 'u'); // 9th
    expect(shouldAutoNotify(state, 'u')).toBe(true);
  });

  it('getEffectiveRemaining returns 0 when exhausted', () => {
    const state = createUserSessionState();
    processInboundMessage(state, { fromUserId: 'u', contextToken: 't' });
    for (let i = 0; i < 9; i++) recordOutboundSent(state, 'u');
    state.sessions.get('u')!.exhausted = true;
    expect(getEffectiveRemaining(state, 'u')).toBe(0);
  });
});
