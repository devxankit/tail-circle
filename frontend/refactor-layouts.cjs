const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all Layout files in Admin module
const findFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findFiles(fullPath, fileList);
    } else if (file.endsWith('Layout.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
};

const adminDir = path.join(__dirname, 'src', 'modules', 'Admin');
const layoutFiles = findFiles(adminDir);

let updatedCount = 0;

for (const file of layoutFiles) {
  // We already did AdminLayout and VendorLayout
  if (file.includes('AdminLayout.jsx') || file.includes('VendorLayout.jsx')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Sidebar open state
  content = content.replace(/const \[sidebarOpen, setSidebarOpen\] = useState\(true\);/, 'const [sidebarOpen, setSidebarOpen] = useState(false);');

  // 2. Sidebar container classes
  // e.g. "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 md:translate-x-0 bg-[#0F172A]", sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  content = content.replace(
    /"fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 md:translate-x-0 ([^"]+)",\s*sidebarOpen \? 'translate-x-0' : '-translate-x-full'/g,
    `"fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 $1",\n          "w-[280px] -translate-x-full sm:w-[64px] sm:translate-x-0 lg:w-[240px]",\n          sidebarOpen && "translate-x-0"`
  );

  // 3. Header heights (Sidebar Brand Header)
  content = content.replace(
    /<div className="h-\[72px\] px-6 flex items-center justify-between shrink-0 border-b/g,
    '<div className="h-[56px] lg:h-[72px] px-4 lg:px-6 flex items-center justify-between shrink-0 border-b overflow-hidden'
  );

  // 4. Sidebar close button
  content = content.replace(
    /className="md:hidden p-1\.5 rounded-lg text-white\/60 hover:text-white hover:bg-white\/10 cursor-pointer transition"\s*onClick=\{\(\) => setSidebarOpen\(false\)\}/g,
    'className="sm:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition"\n            onClick={() => setSidebarOpen(false)}'
  );

  // 5. Main Area wrapper
  content = content.replace(
    /className=\{cn\("flex-1 flex flex-col min-h-screen transition-all duration-300 md:pl-64"([^}]*)\)\}/g,
    'className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0 max-w-full overflow-x-hidden sm:ml-[64px] lg:ml-[240px]"$1)}'
  );
  
  content = content.replace(
    /className=\{cn\("flex-1 flex flex-col min-h-screen transition-all duration-300 md:pl-64 min-w-0 max-w-full overflow-x-hidden"([^}]*)\)\}/g,
    'className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0 max-w-full overflow-x-hidden sm:ml-[64px] lg:ml-[240px]"$1)}'
  );

  // 6. Top Navbar Header
  content = content.replace(
    /<header className="h-\[72px\] bg-white flex items-center justify-between px-6 sticky top-0 z-30"/g,
    '<header className="h-[56px] lg:h-[72px] bg-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30"'
  );

  // 7. Menu open button
  content = content.replace(
    /className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 cursor-pointer transition"\s*onClick=\{\(\) => setSidebarOpen\(!sidebarOpen\)\}/g,
    'className="p-2 -ml-2 rounded-xl text-gray-400 hover:bg-gray-100 cursor-pointer transition sm:hidden"\n              onClick={() => setSidebarOpen(true)}'
  );
  
  // Date and header title block visibility
  content = content.replace(
    /<div>\s*<p className="text-\[11px\] text-gray-400 font-semibold">/g,
    '<div className="hidden sm:block">\n              <p className="text-[11px] text-gray-400 font-semibold">'
  );

  // 8. Navigation Links Label text hiding
  // <span>{item.label}</span> -> <span className="block sm:hidden lg:block">{item.label}</span>
  content = content.replace(/<span>\{item\.label\}<\/span>/g, '<span className="block sm:hidden lg:block">{item.label}</span>');

  // 9. Overlay
  content = content.replace(
    /<div className="fixed inset-0 bg-black\/30 z-30 md:hidden"/g,
    '<div className="fixed inset-0 bg-black/50 z-30 sm:hidden backdrop-blur-sm"'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    updatedCount++;
  }
}

console.log(`Refactored ${updatedCount} layout files.`);
