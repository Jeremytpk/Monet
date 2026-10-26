import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Runs under `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST.
const app = initializeApp({ projectId: 'demo-monet' }, 'profiles-test');
const db = getFirestore(app);

after(() => deleteApp(app));

async function waitFor(check, timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for trigger');
    await new Promise((r) => setTimeout(r, 250));
  }
}

describe('syncPublicProfile', () => {
  it('copies only public fields from users/ to profiles/', async () => {
    await db.doc('users/agent1').set({
      name: 'Kiosk Ngaliema',
      phone: '+243000000000',
      email: 'agent@example.com',
      role: 'mcp',
      mcp_id: 'MCP1234567',
      wallet_id: 'monet_agent1',
      wallet_balance: 900,
      card_last4: '4242',
      card_encrypted: 'secret',
    });

    const profile = await waitFor(async () => {
      const snap = await db.doc('profiles/agent1').get();
      return snap.exists ? snap.data() : null;
    });

    assert.equal(profile.name, 'Kiosk Ngaliema');
    assert.equal(profile.phone, '+243000000000');
    assert.equal(profile.is_agent, true);
    assert.equal(profile.mcp_id, 'MCP1234567');
    assert.equal(profile.has_wallet, true);
    for (const key of ['email', 'role', 'wallet_id', 'wallet_balance', 'card_last4', 'card_encrypted']) {
      assert.ok(!(key in profile), `profile must not contain ${key}`);
    }
  });

  it('updates when the user changes and removes the profile when the user is deleted', async () => {
    await db.doc('users/u2').set({ name: 'Mama', wallet_id: 'monet_u2' });
    await waitFor(async () => (await db.doc('profiles/u2').get()).data()?.name === 'Mama');

    await db.doc('users/u2').update({ name: 'Mama Nzinga' });
    await waitFor(async () => (await db.doc('profiles/u2').get()).data()?.name === 'Mama Nzinga');

    await db.doc('users/u2').delete();
    await waitFor(async () => !(await db.doc('profiles/u2').get()).exists);
  });

  it('does not mark regular users as agents', async () => {
    await db.doc('users/u3').set({ name: 'Jean', role: 'user', mcp_id: 'MCP999' });
    const profile = await waitFor(async () => (await db.doc('profiles/u3').get()).data());
    assert.equal(profile.is_agent, false);
    assert.equal(profile.mcp_id, null);
    assert.equal(profile.has_wallet, false);
  });
});
