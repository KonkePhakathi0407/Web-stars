const fs = require('fs');
const path = require('path');

const adminRoutesDir = path.join(__dirname, 'routes', 'admin');

// List of files to fix
const files = [
    'dashboard.js',
    'crisis.js', 
    'appointment.js',
    'users.js',
    'admins.js',
    'audit.js',
    'settings.js',
    'analytics.js',
    'flagged.js',
    'forum.js'
];

console.log('\n🔧 Fixing admin route files...\n');

files.forEach(file => {
    const filePath = path.join(adminRoutesDir, file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix database path
        content = content.replace(
            /require\(['"]\.\.\/config\/database['"]\)/g,
            "require('../../config/database')"
        );
        
        // Fix adminAuth path
        content = content.replace(
            /require\(['"]\.\.\/middleware\/adminAuth['"]\)/g,
            "require('../../middleware/adminAuth')"
        );
        
        // Change pool to promisePool
        content = content.replace(
            /const { pool } =/g,
            "const { promisePool } ="
        );
        
        // Change pool.query to promisePool.query
        content = content.replace(/pool\.query/g, "promisePool.query");
        
        // Write back the file
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${file}`);
    } else {
        console.log(`⚠️ Not found: ${file}`);
    }
});

console.log('\n✅ All admin route files have been fixed!');
console.log('Now run: npm start\n');