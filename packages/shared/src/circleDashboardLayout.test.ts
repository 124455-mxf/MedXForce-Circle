import assert from 'node:assert/strict';
import {
  applyExclusiveDashboardWidgetPairs,
  exclusivePartnerForDashboardWidget,
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
  { layout: { hiddenWidgets: legacyCompactHidden }, hasStoredLayout: true, hasStoredIcuLayout: false },
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
  { layout: { hiddenWidgets: legacyDetailedHidden }, hasStoredLayout: true, hasStoredIcuLayout: false },
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
  { layout: { hiddenWidgets: [] }, hasStoredLayout: true, hasStoredIcuLayout: false },
  'family',
);
assert.equal(isPatientActivityCompactVisible(new Set(familyEffective)), false);

assert.equal(
  exclusivePartnerForDashboardWidget('daily-check-in'),
  'check-in-wellness-ring',
);
assert.equal(
  exclusivePartnerForDashboardWidget('check-in-wellness-ring'),
  'daily-check-in',
);
assert.equal(
  compactProxyHidden.includes('check-in-wellness-ring'),
  true,
  'compact proxy default shows Check-in compact, not wellness',
);
assert.equal(
  compactProxyHidden.includes('daily-check-in'),
  false,
  'compact proxy default keeps Check-in compact on',
);
assert.equal(
  detailedProxyHidden.includes('daily-check-in'),
  true,
  'detailed proxy default hides Check-in compact',
);
assert.equal(
  detailedProxyHidden.includes('check-in-wellness-ring'),
  false,
  'detailed proxy default keeps wellness Check-In on',
);

const bothCheckInsVisible = applyExclusiveDashboardWidgetPairs(
  compactProxyHidden.filter(
    (key) => key !== 'daily-check-in' && key !== 'check-in-wellness-ring',
  ),
);
assert.equal(bothCheckInsVisible.includes('daily-check-in'), false);
assert.equal(
  bothCheckInsVisible.includes('check-in-wellness-ring'),
  true,
  'if both check-in tiles would be on, keep compact and hide wellness',
);

const icuProxyCompact = hiddenDashboardWidgetsForRolePreset(
  'proxy',
  'compact',
  'intensive_care',
);
assert.equal(
  icuProxyCompact.includes('last-7-days-overview'),
  true,
  'ICU compact hides Last 7 days analytics',
);
assert.equal(
  icuProxyCompact.includes('circle-map'),
  true,
  'ICU compact hides Circle map',
);
assert.equal(
  icuProxyCompact.includes('reminder-diary-entry'),
  false,
  'ICU compact keeps diary reminder',
);
assert.equal(
  isPatientActivityCompactVisible(new Set(icuProxyCompact)),
  true,
  'ICU compact keeps side-by-side appointment cards',
);
assert.equal(
  resolveCircleDashboardLayoutPreset(icuProxyCompact, 'proxy', 'intensive_care'),
  'compact',
);

const icuProxyDetailed = hiddenDashboardWidgetsForRolePreset(
  'proxy',
  'detailed',
  'intensive_care',
);
assert.equal(
  icuProxyDetailed.includes('last-7-days-overview'),
  false,
  'ICU more-tiles shows Last 7 days overview',
);
assert.equal(
  icuProxyDetailed.includes('circle-map'),
  true,
  'ICU more-tiles still hides Circle map',
);
assert.equal(
  resolveCircleDashboardLayoutPreset(icuProxyDetailed, 'proxy', 'intensive_care'),
  'detailed',
);

const dailyStoredIcuDefault = resolveEffectiveHiddenDashboardWidgets(
  {
    layout: { hiddenWidgets: compactProxyHidden },
    hasStoredLayout: true,
    hasStoredIcuLayout: false,
  },
  'proxy',
  'intensive_care',
);
assert.equal(
  dailyStoredIcuDefault.includes('last-7-days-overview'),
  true,
  'ICU Home ignores Daily Life stored layout until ICU layout is saved',
);
assert.deepEqual(dailyStoredIcuDefault, icuProxyCompact);

const icuStoredUsed = resolveEffectiveHiddenDashboardWidgets(
  {
    layout: {
      hiddenWidgets: compactProxyHidden,
      icuHiddenWidgets: icuProxyDetailed,
    },
    hasStoredLayout: true,
    hasStoredIcuLayout: true,
  },
  'proxy',
  'intensive_care',
);
assert.deepEqual(icuStoredUsed, applyExclusiveDashboardWidgetPairs(icuProxyDetailed));

const friendIcuKeepsDaily = resolveEffectiveHiddenDashboardWidgets(
  { layout: null, hasStoredLayout: false, hasStoredIcuLayout: false },
  'friend',
  'intensive_care',
);
assert.deepEqual(
  friendIcuKeepsDaily,
  hiddenDashboardWidgetsForRolePreset('friend', 'compact'),
  'Friend in ICU keeps Daily Life compact, not ICU quiet Home',
);

const hospitalKeepsDaily = resolveEffectiveHiddenDashboardWidgets(
  {
    layout: { hiddenWidgets: compactProxyHidden },
    hasStoredLayout: true,
    hasStoredIcuLayout: false,
  },
  'proxy',
  'hospital',
);
assert.deepEqual(hospitalKeepsDaily, applyExclusiveDashboardWidgetPairs(compactProxyHidden));

const familyIcuQuiet = hiddenDashboardWidgetsForRolePreset(
  'family',
  'compact',
  'intensive_care',
);
assert.equal(familyIcuQuiet.includes('last-7-days-overview'), true);
assert.equal(familyIcuQuiet.includes('reminder-gallery-upload'), false);

console.log('circle dashboard layout patient-activity tests ok');
