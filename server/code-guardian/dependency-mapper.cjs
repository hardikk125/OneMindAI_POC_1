/**
 * DEPENDENCY MAPPER
 * =================
 * Parses TypeScript/JavaScript files to extract:
 * - Import statements
 * - Export statements
 * - Function definitions
 * - Component definitions
 * - Hook usage
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// =============================================================================
// REGEX PATTERNS
// =============================================================================

const PATTERNS = {
  // Import patterns
  importDefault: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
  importNamed: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
  importAll: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
  importSideEffect: /import\s+['"]([^'"]+)['"]/g,
  dynamicImport: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  
  // Export patterns
  exportDefault: /export\s+default\s+(?:function\s+)?(\w+)/g,
  exportNamed: /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g,
  exportFrom: /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
  
  // Function patterns
  functionDeclaration: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g,
  arrowFunction: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
  
  // React patterns
  reactComponent: /(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)\s*\(/g,
  useHook: /use[A-Z]\w+/g,
  useState: /useState\s*<?\s*([^>)]+)?\s*>?\s*\(/g,
  useEffect: /useEffect\s*\(/g,
  
  // API patterns
  fetchCall: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
  apiEndpoint: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
  
  // Supabase patterns
  supabaseFrom: /\.from\s*\(\s*['"](\w+)['"]\s*\)/g,
  supabaseSelect: /\.select\s*\(\s*['"]([^'"]*)['"]\s*\)/g,
};

// =============================================================================
// PARSER
// =============================================================================

function parseFile(filePath, content) {
  const result = {
    path: filePath,
    imports: [],
    exports: [],
    functions: [],
    components: [],
    hooks: [],
    apiCalls: [],
    supabaseTables: [],
    dependencies: [],
    dependents: [],
  };
  
  // Parse imports
  let match;
  
  // Default imports
  const importDefaultRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importDefaultRegex.exec(content)) !== null) {
    result.imports.push({
      type: 'default',
      name: match[1],
      source: match[2],
    });
    result.dependencies.push(resolveImportPath(filePath, match[2]));
  }
  
  // Named imports
  const importNamedRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importNamedRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    names.forEach(name => {
      result.imports.push({
        type: 'named',
        name: name,
        source: match[2],
      });
    });
    result.dependencies.push(resolveImportPath(filePath, match[2]));
  }
  
  // Dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    result.imports.push({
      type: 'dynamic',
      source: match[1],
    });
    result.dependencies.push(resolveImportPath(filePath, match[1]));
  }
  
  // Require (for .cjs files)
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    result.imports.push({
      type: 'require',
      source: match[1],
    });
    if (!match[1].startsWith('.')) continue; // Skip node_modules
    result.dependencies.push(resolveImportPath(filePath, match[1]));
  }
  
  // Parse exports
  const exportDefaultRegex = /export\s+default\s+(?:function\s+)?(\w+)/g;
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    result.exports.push({
      type: 'default',
      name: match[1],
    });
  }
  
  const exportNamedRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
  while ((match = exportNamedRegex.exec(content)) !== null) {
    result.exports.push({
      type: 'named',
      name: match[1],
    });
  }
  
  // Parse functions
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
  while ((match = functionRegex.exec(content)) !== null) {
    result.functions.push(match[1]);
  }
  
  const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    result.functions.push(match[1]);
  }
  
  // Parse React components (PascalCase functions)
  const componentRegex = /(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)\s*\(/g;
  while ((match = componentRegex.exec(content)) !== null) {
    result.components.push(match[1]);
  }
  
  // Parse hooks usage
  const hookRegex = /use[A-Z]\w+/g;
  const hooks = new Set();
  while ((match = hookRegex.exec(content)) !== null) {
    hooks.add(match[0]);
  }
  result.hooks = Array.from(hooks);
  
  // Parse API calls
  const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = fetchRegex.exec(content)) !== null) {
    result.apiCalls.push({
      type: 'fetch',
      url: match[1],
    });
  }
  
  // Parse Supabase tables
  const supabaseRegex = /\.from\s*\(\s*['"](\w+)['"]\s*\)/g;
  const tables = new Set();
  while ((match = supabaseRegex.exec(content)) !== null) {
    tables.add(match[1]);
  }
  result.supabaseTables = Array.from(tables);
  
  // Clean up dependencies
  result.dependencies = [...new Set(result.dependencies.filter(d => d && !d.includes('node_modules')))];
  
  return result;
}

function resolveImportPath(fromFile, importPath) {
  // Skip node_modules
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }
  
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, importPath);
  
  // Try common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '/index.ts', '/index.tsx', '/index.js'];
  
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      return path.relative(process.cwd(), withExt).replace(/\\/g, '/');
    }
  }
  
  // Already has extension
  if (fs.existsSync(resolved)) {
    return path.relative(process.cwd(), resolved).replace(/\\/g, '/');
  }
  
  return importPath;
}

// =============================================================================
// FULL GRAPH BUILDER
// =============================================================================

async function buildFullGraph(projectRoot) {
  const graph = {};
  
  // Find all source files
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{js,cjs}',
  ];
  
  const files = [];
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, { 
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });
    files.push(...matches);
  }
  
  console.log(`[DependencyMapper] Found ${files.length} files to analyze`);
  
  // Parse each file
  for (const file of files) {
    try {
      const fullPath = path.join(projectRoot, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = parseFile(fullPath, content);
      parsed.path = file; // Use relative path
      graph[file] = parsed;
    } catch (error) {
      console.error(`[DependencyMapper] Error parsing ${file}:`, error.message);
    }
  }
  
  // Build reverse dependencies (dependents)
  for (const [file, data] of Object.entries(graph)) {
    for (const dep of data.dependencies) {
      if (graph[dep]) {
        graph[dep].dependents = graph[dep].dependents || [];
        if (!graph[dep].dependents.includes(file)) {
          graph[dep].dependents.push(file);
        }
      }
    }
  }
  
  return graph;
}

// =============================================================================
// UTILITIES
// =============================================================================

function getFileType(filePath) {
  const ext = path.extname(filePath);
  if (['.tsx', '.jsx'].includes(ext)) return 'component';
  if (filePath.includes('/hooks/')) return 'hook';
  if (filePath.includes('/lib/')) return 'utility';
  if (filePath.includes('/server/')) return 'backend';
  if (filePath.includes('/admin/')) return 'admin';
  return 'other';
}

function getComplexityScore(parsed) {
  let score = 0;
  
  score += parsed.imports.length * 1;
  score += parsed.exports.length * 2;
  score += parsed.functions.length * 3;
  score += parsed.components.length * 5;
  score += parsed.hooks.length * 2;
  score += parsed.apiCalls.length * 4;
  score += parsed.supabaseTables.length * 3;
  
  return score;
}

module.exports = {
  parseFile,
  buildFullGraph,
  resolveImportPath,
  getFileType,
  getComplexityScore,
  PATTERNS,
};
