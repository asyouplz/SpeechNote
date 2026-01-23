import { readFileSync, writeFileSync } from 'fs';

/**
 * Update version in manifest.json, package.json, and versions.json
 * Called by semantic-release during the prepare step
 */
const targetVersion = process.argv[2];

if (!targetVersion) {
    console.error('❌ Error: Version argument required');
    console.error('Usage: node scripts/update-version.mjs <version>');
    process.exit(1);
}

console.log(`📦 Updating version to ${targetVersion}...`);

try {
    // Update manifest.json
    const manifestPath = 'manifest.json';
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const { minAppVersion } = manifest;
    manifest.version = targetVersion;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
    console.log(`  ✅ Updated ${manifestPath}`);

    // Update package.json
    const pkgPath = 'package.json';
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    pkg.version = targetVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
    console.log(`  ✅ Updated ${pkgPath}`);

    // Update versions.json
    const versionsPath = 'versions.json';
    const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
    versions[targetVersion] = minAppVersion;
    writeFileSync(versionsPath, JSON.stringify(versions, null, '\t') + '\n');
    console.log(`  ✅ Updated ${versionsPath}`);

    console.log(`✅ Successfully updated all version files to ${targetVersion}`);
} catch (error) {
    console.error('❌ Error updating version files:', error);
    process.exit(1);
}
