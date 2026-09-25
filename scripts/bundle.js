const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'src/views/Index.html');
const outputPath = path.join(rootDir, 'src/Index_Complete.html');

let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]([^'"]+)['"]\)\s*\?>/g, (match, p1) => {
  let subPath = p1;
  if (!subPath.endsWith('.html')) subPath += '.html';
  let fullPath = path.join(rootDir, 'src', subPath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(rootDir, 'src/views', path.basename(subPath));
  }
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf8');
  } else {
    console.warn('Warning: Could not include ' + fullPath);
    return match;
  }
});

fs.writeFileSync(outputPath, indexHtml, 'utf8');
console.log('✅ Index_Complete.html compiled successfully (' + fs.statSync(outputPath).size + ' bytes)');
