import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-monet',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { name: 'Alice', phone: '+1', wallet_balance: 10, wallet_id: 'monet_a' });
    await setDoc(doc(db, 'users/admin1'), { name: 'Admin', role: 'admin' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

describe('users/{uid}', () => {
  it('lets a user edit their own name, phone and photo', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { name: 'Alicia', phone: '+2', photoURL: null }));
  });

  it('blocks a user from changing their own balance', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { wallet_balance: 1000000 }));
  });

  it('blocks a user from making themselves admin', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { role: 'admin' }));
  });

  it('blocks a user from changing their wallet_id', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { wallet_id: 'monet_x' }));
  });

  it('lets a user clear force_logout but not set it', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { force_logout: false }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { force_logout: true }));
  });

  it('lets a new user create a profile with only safe fields', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob'), { email: 'bob@example.com' }));
  });

  it('blocks a new user from creating a profile with a balance or role', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users/bob'), { email: 'b@x.com', wallet_balance: 500 }));
    await assertFails(setDoc(doc(as('carl'), 'users/carl'), { email: 'c@x.com', role: 'admin' }));
  });

  it("blocks a user from editing someone else's profile", async () => {
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { name: 'Hacked' }));
  });

  it('still lets admins edit any profile', async () => {
    await assertSucceeds(updateDoc(doc(as('admin1'), 'users/alice'), { wallet_balance: 0 }));
  });

  it('blocks signed-out reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });
});
