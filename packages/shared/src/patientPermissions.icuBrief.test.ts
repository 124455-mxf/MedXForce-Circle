import assert from 'node:assert/strict';
import { canSeePatientScheduleNudgeTiles, canViewIcuDailyBrief } from './patientPermissions';

assert.equal(canViewIcuDailyBrief('proxy'), true);
assert.equal(canViewIcuDailyBrief('caregiver'), true);
assert.equal(canViewIcuDailyBrief('professional_caregiver'), true);
assert.equal(canViewIcuDailyBrief('family'), false);
assert.equal(canViewIcuDailyBrief('friend'), false);
assert.equal(canViewIcuDailyBrief('facility_staff'), false);
assert.equal(canSeePatientScheduleNudgeTiles('proxy'), true);
assert.equal(canSeePatientScheduleNudgeTiles('family'), false);
