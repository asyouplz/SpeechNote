import { readFileSync, writeFileSync } from 'fs';

function readJson(path, fsImpl) {
    return JSON.parse(fsImpl.readFileSync(path, 'utf8'));
}

function writeJson(path, data, fsImpl) {
    fsImpl.writeFileSync(path, JSON.stringify(data, null, '\t'));
}

export function updateVersion({
    version,
    manifestPath = 'manifest.json',
    versionsPath = 'versions.json',
    fsImpl = { readFileSync, writeFileSync },
}) {
    if (!version) {
        throw new Error('No version provided. Ensure npm_package_version is set.');
    }

    const manifest = readJson(manifestPath, fsImpl);
    const { minAppVersion } = manifest;

    if (!minAppVersion) {
        throw new Error('manifest.json is missing minAppVersion.');
    }

    manifest.version = version;
    writeJson(manifestPath, manifest, fsImpl);

    const versions = readJson(versionsPath, fsImpl);
    versions[version] = minAppVersion;
    writeJson(versionsPath, versions, fsImpl);

    return { version, minAppVersion };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const targetVersion = process.env.npm_package_version;
    const { version } = updateVersion({ version: targetVersion });
    console.log(`Updated version to ${version}`);
}
