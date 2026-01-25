import { readFileSync, writeFileSync, existsSync } from 'fs';

/**
 * Update version in manifest.json, package.json, and versions.json
 * Called by semantic-release during the prepare step
 * 
 * Usage:
 *   node scripts/update-version.mjs <version>          # Update files
 *   node scripts/update-version.mjs <version> --dry-run  # Preview changes
 * 
 * Formatting conventions (intentionally different per file):
 *   - manifest.json: tabs (Obsidian convention)
 *   - package.json: 4 spaces (npm convention)
 *   - versions.json: tabs (Obsidian convention)
 */

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetVersion = args.find(arg => !arg.startsWith('--'));

if (!targetVersion) {
    console.error('❌ Error: Version argument required');
    console.error('Usage: node scripts/update-version.mjs <version>');
    process.exit(1);
}

// Validate semver format (basic check for semantic-release compatibility)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
if (!semverRegex.test(targetVersion)) {
    console.error(`❌ Error: Invalid semver format: ${targetVersion}`);
    process.exit(1);
}

console.log(`📦 ${dryRun ? '[DRY-RUN] Would update' : 'Updating'} version to ${targetVersion}...`);

// Check if all required files exist before starting to avoid partial updates
const requiredFiles = ['manifest.json', 'package.json', 'versions.json'];
const missingFiles = requiredFiles.filter(file => !existsSync(file));

if (missingFiles.length > 0) {
    console.error(`❌ Error: Missing required files: ${missingFiles.join(', ')}`);
    process.exit(1);
}

try {
    // Update manifest.json
    const manifestPath = 'manifest.json';
    const manifestData = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);

    if (!manifest.minAppVersion) {
        console.error(`❌ Error: minAppVersion not found in ${manifestPath}`);
        process.exit(1);
    }

    const { minAppVersion } = manifest;
    const oldManifestVersion = manifest.version;
    manifest.version = targetVersion;
    const newManifestContent = JSON.stringify(manifest, null, '\t') + '\n';

    if (dryRun) {
        console.log(`  📋 ${manifestPath}: ${oldManifestVersion} → ${targetVersion}`);
    } else {
        writeFileSync(manifestPath, newManifestContent);
        console.log(`  ✅ Updated ${manifestPath}`);
    }

    // Update package.json
    const pkgPath = 'package.json';
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const oldPkgVersion = pkg.version;
    pkg.version = targetVersion;
    const newPkgContent = JSON.stringify(pkg, null, 4) + '\n';

    if (dryRun) {
        console.log(`  📋 ${pkgPath}: ${oldPkgVersion} → ${targetVersion}`);
    } else {
        writeFileSync(pkgPath, newPkgContent);
        console.log(`  ✅ Updated ${pkgPath}`);
    }

    // Update versions.json
    const versionsPath = 'versions.json';
    const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
    const hadVersion = versions[targetVersion] !== undefined;
    versions[targetVersion] = minAppVersion;
    const newVersionsContent = JSON.stringify(versions, null, '\t') + '\n';

    if (dryRun) {
        console.log(`  📋 ${versionsPath}: ${hadVersion ? 'update' : 'add'} "${targetVersion}": "${minAppVersion}"`);
    } else {
        writeFileSync(versionsPath, newVersionsContent);
        console.log(`  ✅ Updated ${versionsPath}`);
    }

    if (dryRun) {
        console.log(`\n✅ [DRY-RUN] Completed - no files were modified`);
    } else {
        console.log(`✅ Successfully updated all version files to ${targetVersion}`);
    }
} catch (error) {
    console.error('❌ Error updating version files:', error);
    process.exit(1);
}
