import assert from 'node:assert/strict';
import {
  circleMemberIdentityFingerprint,
  circleMemberIdentityHasMismatch,
  circleMemberIdentityKey,
  type CircleMemberIdentitySnapshot,
} from './circleMemberIdentityMismatch';

function row(
  overrides: Partial<CircleMemberIdentitySnapshot> & Pick<CircleMemberIdentitySnapshot, 'patientId'>,
): CircleMemberIdentitySnapshot {
  return {
    patientName: overrides.patientName ?? overrides.patientId,
    firstName: '',
    lastName: '',
    name: '',
    dateOfBirth: '',
    ...overrides,
  };
}

const jamie = row({
  patientId: 'jamie',
  patientName: 'Jamie Ballard',
  name: 'Test-proxy-01',
});
const anita = row({
  patientId: 'anita',
  patientName: 'Anita Break',
  firstName: 'Proxy',
  lastName: 'Tester',
  name: 'Proxy Tester',
  dateOfBirth: '1998-12-10',
});
const anitaSameAsJamie = row({
  patientId: 'anita',
  patientName: 'Anita Break',
  name: 'Test-proxy-01',
});

assert.equal(circleMemberIdentityHasMismatch([jamie]), false);
assert.equal(circleMemberIdentityHasMismatch([jamie, anitaSameAsJamie]), false);
assert.equal(circleMemberIdentityHasMismatch([jamie, anita]), true);
assert.notEqual(circleMemberIdentityKey(jamie), circleMemberIdentityKey(anita));
assert.equal(
  circleMemberIdentityKey({ firstName: 'Proxy', lastName: 'Tester', name: 'Other' }),
  circleMemberIdentityKey({ firstName: 'Proxy', lastName: 'Tester', name: 'Proxy Tester' }),
);

const fp1 = circleMemberIdentityFingerprint([anita, jamie]);
const fp2 = circleMemberIdentityFingerprint([jamie, anita]);
assert.equal(fp1, fp2);

console.log('circleMemberIdentityMismatch.test.ts: ok');
