/**
 * @deprecated This file is being phased out.
 * 
 * Version updates are now handled by semantic-release via scripts/update-version.mjs
 * This file is kept temporarily for emergency manual releases only.
 * 
 * To perform a release:
 * - Automated: Merge PR to main branch (semantic-release handles everything)
 * - Manual: Use the existing release.yml workflow with workflow_dispatch
 * 
 * This file will be removed after semantic-release is fully stable.
 */

import { readFileSync, writeFileSync } from 'fs';

const targetVersion = process.env.npm_package_version;

// Update manifest.json
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));

// Update versions.json
let versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));

console.log(`Updated version to ${targetVersion}`);
