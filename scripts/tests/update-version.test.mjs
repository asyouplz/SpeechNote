/**
 * Tests for update-version.mjs script
 * 
 * Run: node scripts/tests/update-version.test.mjs
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, '..', 'update-version.mjs');
const TEST_DIR = join(__dirname, 'test-fixtures');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

let passCount = 0;
let failCount = 0;

function log(color, ...args) {
    console.log(color, ...args, NC);
}

function setup() {
    // Create test directory
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
}

function cleanup() {
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }
}

function createTestFiles(manifestVersion = '3.0.0', minAppVersion = '1.0.0') {
    writeFileSync(
        join(TEST_DIR, 'manifest.json'),
        JSON.stringify({ version: manifestVersion, minAppVersion }, null, '\t') + '\n'
    );
    writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ version: manifestVersion }, null, 4) + '\n'
    );
    writeFileSync(
        join(TEST_DIR, 'versions.json'),
        JSON.stringify({ [manifestVersion]: minAppVersion }, null, '\t') + '\n'
    );
}

function runScript(args, cwd = TEST_DIR) {
    const result = spawnSync('node', [SCRIPT_PATH, ...args], {
        cwd,
        encoding: 'utf8',
    });
    return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        status: result.status,
    };
}

function test(name, fn) {
    try {
        fn();
        log(GREEN, `✅ ${name}`);
        passCount++;
    } catch (error) {
        log(RED, `❌ ${name}`);
        console.error(`   ${error.message}`);
        failCount++;
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
    }
}

function assertIncludes(haystack, needle, message = '') {
    if (!haystack.includes(needle)) {
        throw new Error(`${message}\n   Expected to include: "${needle}"\n   In: "${haystack}"`);
    }
}

// Tests
console.log('\n🧪 Running update-version.mjs tests\n');

setup();

// Test 1: Valid version update
test('Valid semver version update', () => {
    createTestFiles('3.0.0');
    const result = runScript(['3.1.0']);
    assertEqual(result.status, 0, 'Should exit with code 0');

    const manifest = JSON.parse(readFileSync(join(TEST_DIR, 'manifest.json'), 'utf8'));
    assertEqual(manifest.version, '3.1.0', 'manifest.json version should be updated');

    const pkg = JSON.parse(readFileSync(join(TEST_DIR, 'package.json'), 'utf8'));
    assertEqual(pkg.version, '3.1.0', 'package.json version should be updated');

    const versions = JSON.parse(readFileSync(join(TEST_DIR, 'versions.json'), 'utf8'));
    assertEqual(versions['3.1.0'], '1.0.0', 'versions.json should include new version');
});

// Test 2: Dry-run mode
test('Dry-run mode does not modify files', () => {
    createTestFiles('3.0.0');
    const result = runScript(['4.0.0', '--dry-run']);
    assertEqual(result.status, 0, 'Should exit with code 0');
    assertIncludes(result.stdout, '[DRY-RUN]', 'Should indicate dry-run mode');

    const manifest = JSON.parse(readFileSync(join(TEST_DIR, 'manifest.json'), 'utf8'));
    assertEqual(manifest.version, '3.0.0', 'manifest.json should NOT be modified');
});

// Test 3: Invalid semver format
test('Rejects invalid semver format', () => {
    createTestFiles('3.0.0');
    const result = runScript(['invalid-version']);
    assertEqual(result.status, 1, 'Should exit with code 1');
    assertIncludes(result.stderr, 'Invalid semver format', 'Should show error message');
});

// Test 4: Missing version argument
test('Requires version argument', () => {
    createTestFiles('3.0.0');
    const result = runScript([]);
    assertEqual(result.status, 1, 'Should exit with code 1');
    assertIncludes(result.stderr, 'Version argument required', 'Should show error message');
});

// Test 5: Missing required files
test('Detects missing required files', () => {
    // Create only manifest.json, missing package.json and versions.json
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(
        join(TEST_DIR, 'manifest.json'),
        JSON.stringify({ version: '3.0.0', minAppVersion: '1.0.0' }, null, '\t') + '\n'
    );

    const result = runScript(['3.1.0']);
    assertEqual(result.status, 1, 'Should exit with code 1');
    assertIncludes(result.stderr, 'Missing required files', 'Should show error message');
});

// Test 6: Missing minAppVersion in manifest.json
test('Requires minAppVersion in manifest.json', () => {
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(
        join(TEST_DIR, 'manifest.json'),
        JSON.stringify({ version: '3.0.0' }, null, '\t') + '\n'  // No minAppVersion
    );
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ version: '3.0.0' }, null, 4) + '\n');
    writeFileSync(join(TEST_DIR, 'versions.json'), JSON.stringify({}, null, '\t') + '\n');

    const result = runScript(['3.1.0']);
    assertEqual(result.status, 1, 'Should exit with code 1');
    assertIncludes(result.stderr, 'minAppVersion not found', 'Should show error message');
});

// Test 7: Prerelease version
test('Handles prerelease versions', () => {
    createTestFiles('3.0.0');
    const result = runScript(['4.0.0-beta.1']);
    assertEqual(result.status, 0, 'Should exit with code 0');

    const manifest = JSON.parse(readFileSync(join(TEST_DIR, 'manifest.json'), 'utf8'));
    assertEqual(manifest.version, '4.0.0-beta.1', 'Should accept prerelease version');
});

cleanup();

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Tests: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('='.repeat(40) + '\n');

process.exit(failCount > 0 ? 1 : 0);
