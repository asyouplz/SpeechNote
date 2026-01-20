const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');

if (!fs.existsSync(reportPath)) {
    console.warn('Coverage report not found. Skipping open step.');
    process.exit(0);
}

console.log(`Coverage report: ${reportPath}`);
