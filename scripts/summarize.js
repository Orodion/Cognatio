const fs = require('fs');
const path = require('path');

function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function parseJest(logPath) {
  try {
    if (!fs.existsSync(logPath)) return 'no results';
    const content = fs.readFileSync(logPath, 'utf8');
    const line = content.split('\n').find((l) => l.includes('Tests:'));
    if (!line) return '0/0 test passed';

    const cleanLine = stripAnsi(line);
    const passedMatch = cleanLine.match(/(\d+)\s+passed/);
    const totalMatch = cleanLine.match(/(\d+)\s+total/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    return `${passed}/${total} test passed`;
  } catch (e) {
    return 'error';
  }
}

function parseVitest(logPath) {
  try {
    if (!fs.existsSync(logPath)) return 'no results';
    const content = fs.readFileSync(logPath, 'utf8');
    const line = content.split('\n').find((l) => l.includes('Tests') && !l.includes('Test Files'));
    if (!line) return '0/0 test passed';

    const cleanLine = stripAnsi(line);
    const passedMatch = cleanLine.match(/(\d+)\s+passed/);
    const totalMatch = cleanLine.match(/\((\d+)\)/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    return `${passed}/${total} test passed`;
  } catch (e) {
    return 'error';
  }
}

const backendSummary = parseJest(path.join(__dirname, '..', 'temp_backend.log'));
const frontendSummary = parseVitest(path.join(__dirname, '..', 'temp_frontend.log'));

console.log('==========================================');
console.log('Summary:');
console.log(`backend: ${backendSummary}`);
console.log(`frontend: ${frontendSummary}`);
console.log('==========================================');

// Clean up temp files
try {
  if (fs.existsSync(path.join(__dirname, '..', 'temp_backend.log'))) {
    fs.unlinkSync(path.join(__dirname, '..', 'temp_backend.log'));
  }
  if (fs.existsSync(path.join(__dirname, '..', 'temp_frontend.log'))) {
    fs.unlinkSync(path.join(__dirname, '..', 'temp_frontend.log'));
  }
} catch (e) {}
