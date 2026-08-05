const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

if (!code.includes('import { lazy, Suspense }')) {
  code = "import { lazy, Suspense } from 'react';\n" + code;
}
if (!code.includes('PageLoader')) {
  code = "import { PageLoader } from './PageLoader';\n" + code;
}

const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"](\.\/modules\/(?:Admin|user)[^'"]+)['"];?/g;
let match;
let newImports = [];
let replacedCode = code;

while ((match = importRegex.exec(code)) !== null) {
  const components = match[1].split(',').map(s => s.trim());
  const path = match[2];
  
  if (path.includes('MobileWrapper') || path.includes('context') || path.includes('ErrorBoundary')) continue;

  components.forEach(comp => {
    let alias = comp;
    let actual = comp;
    if (comp.includes(' as ')) {
      [actual, alias] = comp.split(' as ').map(s => s.trim());
    }
    newImports.push(`const ${alias} = lazy(() => import('${path}').then(m => ({ default: m.${actual} })));`);
  });
  
  replacedCode = replacedCode.replace(match[0], '');
}

replacedCode = replacedCode.replace(/<Routes>/g, '<Suspense fallback={<PageLoader />}><Routes>');
replacedCode = replacedCode.replace(/<\/Routes>/g, '</Routes></Suspense>');

const lastImportIndex = replacedCode.lastIndexOf('import ');
const insertionPoint = replacedCode.indexOf('\n', lastImportIndex) + 1;
replacedCode = replacedCode.slice(0, insertionPoint) + '\n// Lazy Imports\n' + newImports.join('\n') + '\n' + replacedCode.slice(insertionPoint);

fs.writeFileSync('src/App.jsx', replacedCode);
console.log('Refactoring complete!');
