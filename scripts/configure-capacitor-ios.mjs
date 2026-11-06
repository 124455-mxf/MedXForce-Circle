/**
 * After `cap add ios` / `cap sync ios`, set the device and orientations for this app
 * and add Sign in with Apple. Does not add push notifications.
 * iPad allows portrait and landscape. iPhone stays portrait.
 *
 *   node scripts/configure-capacitor-ios.mjs --form ipad
 *   node scripts/configure-capacitor-ios.mjs --form iphone --root apps/circle
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const form = args[args.indexOf('--form') + 1];
const rootFlag = args.indexOf('--root');
const root = path.resolve(rootFlag === -1 ? process.cwd() : args[rootFlag + 1]);

if (form !== 'ipad' && form !== 'iphone') {
  console.error('Pass --form ipad or --form iphone');
  process.exit(1);
}

const plistPath = path.join(root, 'ios', 'App', 'App', 'Info.plist');
const pbxPath = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const entitlementsPath = path.join(root, 'ios', 'App', 'App', 'App.entitlements');
const googlePlistPath = path.join(root, 'ios', 'App', 'App', 'GoogleService-Info.plist');

if (!fs.existsSync(plistPath) || !fs.existsSync(pbxPath)) {
  console.error(`iOS project not found under ${path.join(root, 'ios')}. Run npx cap add ios first.`);
  process.exit(1);
}

const ipadOrientations = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];
const iphoneOrientations = ['UIInterfaceOrientationPortrait'];
const orientations = form === 'ipad' ? ipadOrientations : iphoneOrientations;

function orientationBlock(key, values) {
  const lines = values.map((value) => `\t\t<string>${value}</string>`).join('\n');
  return `\t<key>${key}</key>\n\t<array>\n${lines}\n\t</array>`;
}

function replaceOrientation(plist, key, values) {
  const pattern = new RegExp(`\\t<key>${key}</key>\\s*<array>[\\s\\S]*?</array>`);
  if (!pattern.test(plist)) {
    throw new Error(`Info.plist is missing ${key}`);
  }
  return plist.replace(pattern, orientationBlock(key, values));
}

let plist = fs.readFileSync(plistPath, 'utf8');
plist = replaceOrientation(plist, 'UISupportedInterfaceOrientations', orientations);
plist = replaceOrientation(plist, 'UISupportedInterfaceOrientations~ipad', orientations);

function insertBeforeClosingDict(xml, fragment) {
  const lf = '</dict>\n</plist>';
  const crlf = '</dict>\r\n</plist>';
  if (xml.includes(crlf)) return xml.replace(crlf, `${fragment}${crlf}`);
  if (xml.includes(lf)) return xml.replace(lf, `${fragment}${lf}`);
  throw new Error('Info.plist does not end with a closing dict');
}

if (form === 'ipad' && !plist.includes('<key>UIRequiresFullScreen</key>')) {
  plist = insertBeforeClosingDict(plist, '\t<key>UIRequiresFullScreen</key>\n\t<true/>\n');
}

if (!plist.includes('<key>ITSAppUsesNonExemptEncryption</key>')) {
  plist = insertBeforeClosingDict(
    plist,
    '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n',
  );
}

const reversedClientId = fs.existsSync(googlePlistPath)
  ? (fs.readFileSync(googlePlistPath, 'utf8').match(
      /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/,
    )?.[1] ?? '')
  : '';

if (reversedClientId && !plist.includes(reversedClientId)) {
  const urlTypes = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${reversedClientId}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
  plist = insertBeforeClosingDict(plist, urlTypes);
}

fs.writeFileSync(plistPath, plist);

const deviceFamily = form === 'ipad' ? '2' : '1';
let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('TARGETED_DEVICE_FAMILY')) {
  throw new Error('project.pbxproj has no TARGETED_DEVICE_FAMILY');
}
pbx = pbx.replace(/TARGETED_DEVICE_FAMILY = "[^"]*";/g, `TARGETED_DEVICE_FAMILY = "${deviceFamily}";`);
if (!pbx.includes('DEVELOPMENT_TEAM')) {
  pbx = pbx.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = /g,
    'DEVELOPMENT_TEAM = UNSJ282CWN;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ',
  );
} else {
  pbx = pbx.replace(/DEVELOPMENT_TEAM = [^;]*;/g, 'DEVELOPMENT_TEAM = UNSJ282CWN;');
}
if (!pbx.includes('CODE_SIGN_ENTITLEMENTS')) {
  pbx = pbx.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = /g,
    'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ',
  );
}
if (reversedClientId && !pbx.includes('GoogleService-Info.plist')) {
  const fileRefId = 'F1A57E001FED796500168501';
  const buildId = 'F1A57E011FED796500168501';
  pbx = pbx.replace(
    '/* End PBXBuildFile section */',
    `\t\t${buildId} /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* GoogleService-Info.plist */; };\n/* End PBXBuildFile section */`,
  );
  pbx = pbx.replace(
    '/* End PBXFileReference section */',
    `\t\t${fileRefId} /* GoogleService-Info.plist */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = text.plist.xml; path = GoogleService-Info.plist; sourceTree = "<group>"; };\n/* End PBXFileReference section */`,
  );
  pbx = pbx.replace(
    '504EC3131FED79650016851F /* Info.plist */,',
    `504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\t${fileRefId} /* GoogleService-Info.plist */,`,
  );
  pbx = pbx.replace(
    '2FAD9763203C412B000D30F8 /* config.xml in Resources */,',
    `2FAD9763203C412B000D30F8 /* config.xml in Resources */,\n\t\t\t\t${buildId} /* GoogleService-Info.plist in Resources */,`,
  );
}
fs.writeFileSync(pbxPath, pbx);

const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
`;
fs.writeFileSync(entitlementsPath, entitlements);

console.log(
  `Configured ${form} shell in ${root} (device family ${deviceFamily}, Sign in with Apple, no push).`,
);
if (!reversedClientId) {
  console.log(
    'GoogleService-Info.plist is not in ios/App/App yet. Google sign-in needs that file and its reversed client ID URL scheme. Re-run this script after adding it.',
  );
}
