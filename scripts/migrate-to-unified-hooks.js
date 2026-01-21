#!/usr/bin/env node

/**
 * Auto-Migration Script for Unified Hooks
 * 
 * This script automatically updates imports from old hooks to new unified hooks
 * 
 * Usage:
 *   node scripts/migrate-to-unified-hooks.js
 * 
 * What it does:
 * 1. Finds all files using old useUserData or useProfile
 * 2. Updates imports to use unified hook
 * 3. Creates backup files (.bak)
 * 4. Generates migration report
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

console.log('🚀 Starting Hook Migration...\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}\n`);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

// Stats
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  backupsCreated: 0,
  errors: []
};

// Patterns to find and replace
const patterns = [
  // useUserData imports
  {
    name: 'useUserData',
    find: /import\s+{\s*useUserData\s*}\s+from\s+['"]@\/features\/.*?\/useUserData['"]/g,
    replace: "import { useUserData } from '@/hooks/useUnifiedProfile'"
  },
  {
    name: 'useUserData (alt)',
    find: /import\s+{\s*useUserData\s*}\s+from\s+['"].*?\/useUserData['"]/g,
    replace: "import { useUserData } from '@/hooks/useUnifiedProfile'"
  },
  
  // useProfile imports
  {
    name: 'useProfile',
    find: /import\s+{\s*useProfile\s*}\s+from\s+['"]@\/features\/.*?\/useProfile['"]/g,
    replace: "import { useProfile } from '@/hooks/useUnifiedProfile'"
  },
  {
    name: 'useProfile (alt)',
    find: /import\s+{\s*useProfile\s*}\s+from\s+['"].*?\/useProfile['"]/g,
    replace: "import { useProfile } from '@/hooks/useUnifiedProfile'"
  },
];

/**
 * Recursively get all files in directory
 */
function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];
    
    // Apply each pattern
    for (const pattern of patterns) {
      if (pattern.find.test(content)) {
        const matches = content.match(pattern.find);
        if (matches) {
          content = content.replace(pattern.find, pattern.replace);
          modified = true;
          changes.push(pattern.name);
          stats.importsUpdated += matches.length;
        }
      }
    }
    
    if (modified) {
      const relativePath = path.relative(process.cwd(), filePath);
      
      if (VERBOSE || DRY_RUN) {
        console.log(`✅ ${relativePath}`);
        changes.forEach(change => console.log(`   - Updated: ${change}`));
      }
      
      if (!DRY_RUN) {
        // Create backup
        const backupPath = filePath + '.bak';
        fs.copyFileSync(filePath, backupPath);
        stats.backupsCreated++;
        
        // Write updated content
        fs.writeFileSync(filePath, content, 'utf8');
      }
      
      stats.filesModified++;
    }
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
  }
}

/**
 * Main migration function
 */
function migrate() {
  console.log('📂 Scanning files...\n');
  
  const files = getAllFiles(SRC_DIR);
  console.log(`Found ${files.length} files to process\n`);
  
  console.log('🔄 Processing files...\n');
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files scanned:     ${stats.filesScanned}`);
  console.log(`Files modified:    ${stats.filesModified}`);
  console.log(`Imports updated:   ${stats.importsUpdated}`);
  console.log(`Backups created:   ${stats.backupsCreated}`);
  console.log(`Errors:            ${stats.errors.length}`);
  console.log('='.repeat(60));
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    stats.errors.forEach(err => {
      console.log(`   ${err.file}: ${err.error}`);
    });
  }
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No files were modified');
    console.log('Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes');
    console.log('2. Test your application');
    console.log('3. Delete .bak files when satisfied');
    console.log('   find src -name "*.bak" -delete');
  }
}

// Run migration
migrate();
