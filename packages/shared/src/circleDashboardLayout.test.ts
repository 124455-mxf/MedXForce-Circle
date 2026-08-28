import assert from 'node:assert/strict';
import {
  hiddenDashboardWidgetsForRolePreset,
  isCircleDashboardWidgetAvailable,
  isPatientActivityCompactVisible,
  resolveCircleDashboardLayoutPreset,
  resolveEffectiveHiddenDashboardWidgets,
} from './circleDashboardLayout';

const compactProxyHidden = hiddenDashboardWidgetsForRolePreset('proxy', 'compact');
const detailedProxyHidden = hiddenDashboardWidgetsForRolePreset('proxy', 'detailed');

assert.equal(
  isPatientActivityCompactVisible(new Set(compactProxyHidden)),
  true,
  'compact proxy preset uses side-by-side Patient activity',
);
assert.equal(
  isPatientActivityCompactVisible(new Set(detailedProxyHidden)),
  false,
  'detailed proxy preset uses expanded Patient activity',
);

assert.equal(
  resolveCircleDashboardLayoutPreset(compactProxyHidden, 'proxy'),
  'compact',
);
assert.equal(
  resolveCircleDashboardLayoutPreset(detailedProxyHidden, 'proxy'),
  'detailed',
);

const legacyCompactHidden = compactProxyHidden.filter(
  (key) => key !== 'patient-activity' && key !== 'patient-activity-compact',
);
const migratedCompact = resolveEffectiveHiddenDashboardWidgets(
  { layout: { hiddenWidgets: legacyCompactHidden }, hasStoredLayout: true },
  'proxy',
);
assert.equal(
  isPatientActivityCompactVisible(new Set(migratedCompact)),
  true,
  'legacy compact layouts keep compact Patient activity',
);
assert.equal(resolveCircleDashboardLayoutPreset(migratedCompact, 'proxy'), 'compact');

const legacyDetailedHidden = detailedProxyHidden.filter(
  (key) => key !== 'patient-activity' && key !== 'patient-activity-compact',
);
const migratedDetailed = resolveEffectiveHiddenDashboardWidgets(
  { layout: { hiddenWidgets: legacyDetailedHidden }, hasStoredLayout: true },
  'proxy',
);
assert.equal(
  isPatientActivityCompactVisible(new Set(migratedDetailed)),
  false,
  'legacy detailed layouts keep expanded Patient activity',
);
assert.equal(resolveCircleDashboardLayoutPreset(migratedDetailed, 'proxy'), 'detailed');

assert.equal(
  isCircleDashboardWidgetAvailable('patient-activity', undefined, 'family'),
  false,
);
assert.equal(
  isCircleDashboardWidgetAvailable('patient-activity-compact', undefined, 'proxy'),
  true,
);

const familyEffective = resolveEffectiveHiddenDashboardWidgets(
  { layout: { hiddenWidgets: [] }, hasStoredLayout: true },
  'family',
);
assert.equal(isPatientActivityCompactVisible(new Set(familyEffective)), false);

console.log('circle dashboard layout patient-activity tests ok');
