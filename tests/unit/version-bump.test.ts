import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const scriptPath = path.resolve(__dirname, '../../version-bump.mjs');

describe('version-bump script', () => {
    const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-'));

    const writeJson = (dir: string, file: string, data: unknown) => {
        const target = path.join(dir, file);
        fs.writeFileSync(target, JSON.stringify(data, null, '\t'));
        return target;
    };

    const runScript = (cwd: string, version?: string) => {
        const env = {
            ...process.env,
            npm_package_version: version,
        } as NodeJS.ProcessEnv;

        return execFileSync(process.execPath, [scriptPath], {
            cwd,
            env,
            encoding: 'utf8',
            stdio: 'pipe',
        });
    };

    it('updates manifest.json and versions.json with the new version', () => {
        const dir = createTempDir();
        const manifestPath = writeJson(dir, 'manifest.json', {
            id: 'speech-note',
            version: '0.0.1',
            minAppVersion: '1.5.0',
        });
        const versionsPath = writeJson(dir, 'versions.json', {
            '0.0.1': '1.4.0',
        });

        const output = runScript(dir, '1.2.3');
        expect(output).toContain('Updated version to 1.2.3');

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));

        expect(manifest.version).toBe('1.2.3');
        expect(versions['1.2.3']).toBe('1.5.0');
    });

    it('fails when version is missing', () => {
        const dir = createTempDir();
        writeJson(dir, 'manifest.json', {
            id: 'speech-note',
            version: '0.0.1',
            minAppVersion: '1.5.0',
        });
        writeJson(dir, 'versions.json', {});

        expect(() => runScript(dir)).toThrow('No version provided. Ensure npm_package_version is set.');
    });

    it('fails when manifest.json is missing minAppVersion', () => {
        const dir = createTempDir();
        writeJson(dir, 'manifest.json', {
            id: 'speech-note',
            version: '0.0.1',
        });
        writeJson(dir, 'versions.json', {});

        expect(() => runScript(dir, '1.2.3')).toThrow('manifest.json is missing minAppVersion.');
    });
});
