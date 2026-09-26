const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'src/views/Index.html');
const outputGasPath = path.join(rootDir, 'src/Index_Complete.html');
const outputPublicPath = path.join(rootDir, 'public/index.html');

let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Recursively replace <?!= include('...') ?>
function resolveIncludes(content) {
  return content.replace(/<\?!=\s*include\(['"]([^'"]+)['"]\)\s*\?>/g, (match, p1) => {
    let subPath = p1;
    if (!subPath.endsWith('.html')) subPath += '.html';
    let fullPath = path.join(rootDir, 'src', subPath);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(rootDir, 'src/views', path.basename(subPath));
    }
    if (fs.existsSync(fullPath)) {
      const childContent = fs.readFileSync(fullPath, 'utf8');
      return resolveIncludes(childContent);
    } else {
      console.warn('Warning: Could not include ' + fullPath);
      return match;
    }
  });
}

const bundledHtml = resolveIncludes(indexHtml);

// 1. Write to src/Index_Complete.html (for Google Apps Script HTMLService)
fs.writeFileSync(outputGasPath, bundledHtml, 'utf8');
console.log('✅ src/Index_Complete.html compiled successfully (' + fs.statSync(outputGasPath).size + ' bytes)');

// 2. Write to public/index.html (for Vercel Standalone SPA Deployment)
fs.writeFileSync(outputPublicPath, bundledHtml, 'utf8');
console.log('✅ public/index.html compiled successfully (' + fs.statSync(outputPublicPath).size + ' bytes)');
