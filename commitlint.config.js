module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Subject line can be lowercase or sentence-case (more flexible)
        'subject-case': [2, 'always', ['lower-case', 'sentence-case']],
        // Maximum subject line length
        'subject-max-length': [2, 'always', 72],
        // Maximum body line length
        'body-max-line-length': [1, 'always', 100],
        // Type must be one of the allowed types
        'type-enum': [
            2,
            'always',
            [
                'feat',     // New feature
                'fix',      // Bug fix
                'docs',     // Documentation only
                'style',    // Code style (formatting, semicolons, etc)
                'refactor', // Code change that neither fixes a bug nor adds a feature
                'perf',     // Performance improvement
                'test',     // Adding or updating tests
                'build',    // Build system or external dependencies
                'ci',       // CI/CD configuration
                'chore',    // Other changes that don't modify src or test files
                'revert',   // Reverts a previous commit
            ],
        ],
    },
};
