module.exports = {
    branches: ['main'],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        [
            '@semantic-release/npm',
            {
                npmPublish: false,
            },
        ],
        [
            '@semantic-release/exec',
            {
                prepareCmd: 'node scripts/update-version.mjs ${nextRelease.version}',
            },
        ],
        [
            '@semantic-release/git',
            {
                assets: [
                    'CHANGELOG.md',
                    'package.json',
                    'package-lock.json',
                    'manifest.json',
                    'versions.json',
                ],
                message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
        [
            '@semantic-release/github',
            {
                assets: [
                    { path: 'main.js', label: 'main.js' },
                    { path: 'manifest.json', label: 'manifest.json' },
                    { path: 'styles.css', label: 'styles.css' },
                ],
            },
        ],
    ],
};
