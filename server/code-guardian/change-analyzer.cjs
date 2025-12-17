/**
 * CHANGE ANALYZER
 * ================
 * Analyzes code changes and their impact:
 * - Find affected components
 * - Detect breaking changes
 * - Validate API endpoints
 * - Check database schema compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// AFFECTED COMPONENTS FINDER
// =============================================================================

function findAffectedComponents(changedFile, dependencyGraph) {
  const affected = {
    direct: [],      // Files that directly import the changed file
    indirect: [],    // Files that import files that import the changed file
    components: [],  // React components that might be affected
    hooks: [],       // Hooks that might be affected
    apis: [],        // API endpoints that might be affected
    tables: [],      // Database tables that might be affected
  };
  
  const visited = new Set();
  
  // Find direct dependents
  const fileData = dependencyGraph[changedFile];
  if (fileData && fileData.dependents) {
    affected.direct = [...fileData.dependents];
  }
  
  // Find indirect dependents (2 levels deep)
  function findIndirect(file, depth = 0) {
    if (depth > 2 || visited.has(file)) return;
    visited.add(file);
    
    const data = dependencyGraph[file];
    if (!data || !data.dependents) return;
    
    for (const dependent of data.dependents) {
      if (!affected.direct.includes(dependent) && !affected.indirect.includes(dependent)) {
        affected.indirect.push(dependent);
      }
      findIndirect(dependent, depth + 1);
    }
  }
  
  for (const direct of affected.direct) {
    findIndirect(direct, 0);
  }
  
  // Categorize affected files
  const allAffected = [...affected.direct, ...affected.indirect];
  
  for (const file of allAffected) {
    const data = dependencyGraph[file];
    if (!data) continue;
    
    // Components
    if (data.components && data.components.length > 0) {
      affected.components.push(...data.components.map(c => ({ file, name: c })));
    }
    
    // Hooks
    if (data.hooks && data.hooks.length > 0) {
      affected.hooks.push(...data.hooks.map(h => ({ file, name: h })));
    }
    
    // API calls
    if (data.apiCalls && data.apiCalls.length > 0) {
      affected.apis.push(...data.apiCalls.map(a => ({ file, ...a })));
    }
    
    // Database tables
    if (data.supabaseTables && data.supabaseTables.length > 0) {
      affected.tables.push(...data.supabaseTables.map(t => ({ file, table: t })));
    }
  }
  
  // Deduplicate
  affected.components = dedupeByName(affected.components);
  affected.hooks = dedupeByName(affected.hooks);
  affected.apis = dedupeByUrl(affected.apis);
  affected.tables = dedupeByTable(affected.tables);
  
  return affected;
}

function dedupeByName(arr) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function dedupeByUrl(arr) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function dedupeByTable(arr) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item.table)) return false;
    seen.add(item.table);
    return true;
  });
}

// =============================================================================
// BREAKING CHANGE DETECTION
// =============================================================================

function detectBreakingChanges(oldContent, newContent, fileData) {
  const breaking = [];
  
  // Check for removed exports
  const oldExports = extractExports(oldContent);
  const newExports = extractExports(newContent);
  
  for (const exp of oldExports) {
    if (!newExports.includes(exp)) {
      breaking.push({
        type: 'removed_export',
        name: exp,
        severity: 'high',
        message: `Export "${exp}" was removed`,
      });
    }
  }
  
  // Check for changed function signatures
  const oldFunctions = extractFunctionSignatures(oldContent);
  const newFunctions = extractFunctionSignatures(newContent);
  
  for (const [name, oldSig] of Object.entries(oldFunctions)) {
    if (newFunctions[name] && newFunctions[name] !== oldSig) {
      breaking.push({
        type: 'changed_signature',
        name: name,
        severity: 'medium',
        message: `Function "${name}" signature changed`,
        old: oldSig,
        new: newFunctions[name],
      });
    }
  }
  
  // Check for removed functions
  for (const name of Object.keys(oldFunctions)) {
    if (!newFunctions[name]) {
      breaking.push({
        type: 'removed_function',
        name: name,
        severity: 'high',
        message: `Function "${name}" was removed`,
      });
    }
  }
  
  return breaking;
}

function extractExports(content) {
  const exports = [];
  
  // Named exports
  const namedRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = namedRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Default export
  const defaultRegex = /export\s+default\s+(?:function\s+)?(\w+)/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    exports.push(`default:${match[1]}`);
  }
  
  return exports;
}

function extractFunctionSignatures(content) {
  const signatures = {};
  
  // Function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    signatures[match[1]] = match[2].trim();
  }
  
  // Arrow functions
  const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    signatures[match[1]] = match[2].trim();
  }
  
  return signatures;
}

// =============================================================================
// GIT DIFF ANALYSIS
// =============================================================================

function getGitDiff(filePath, projectRoot) {
  try {
    const relativePath = path.relative(projectRoot, filePath);
    const diff = execSync(`git diff HEAD -- "${relativePath}"`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return parseDiff(diff);
  } catch (error) {
    return null;
  }
}

function parseDiff(diff) {
  if (!diff) return null;
  
  const lines = diff.split('\n');
  const changes = {
    added: [],
    removed: [],
    modified: [],
  };
  
  let lineNumber = 0;
  
  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse line numbers from @@ -X,Y +A,B @@
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        lineNumber = parseInt(match[2]);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      changes.added.push({ line: lineNumber, content: line.substring(1) });
      lineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      changes.removed.push({ line: lineNumber, content: line.substring(1) });
    } else if (!line.startsWith('\\')) {
      lineNumber++;
    }
  }
  
  return changes;
}

// =============================================================================
// API ENDPOINT VALIDATION
// =============================================================================

async function validateApiEndpoints(projectRoot) {
  const results = {
    endpoints: [],
    errors: [],
  };
  
  // Find all API endpoint definitions in server files
  const serverFiles = require('glob').sync('server/**/*.{js,cjs}', { cwd: projectRoot });
  
  for (const file of serverFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    
    // Find Express route definitions
    const routeRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      results.endpoints.push({
        file,
        method: match[1].toUpperCase(),
        path: match[2],
      });
    }
  }
  
  // Find all fetch calls in frontend
  const frontendFiles = require('glob').sync('src/**/*.{ts,tsx,js,jsx}', { cwd: projectRoot });
  
  const apiCalls = [];
  for (const file of frontendFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    
    const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = fetchRegex.exec(content)) !== null) {
      apiCalls.push({
        file,
        url: match[1],
      });
    }
  }
  
  // Check for mismatches
  for (const call of apiCalls) {
    const url = call.url.replace(/^https?:\/\/[^/]+/, ''); // Remove host
    const endpoint = results.endpoints.find(e => url.includes(e.path) || e.path.includes(url.split('?')[0]));
    
    if (!endpoint && url.startsWith('/api/')) {
      results.errors.push({
        type: 'missing_endpoint',
        file: call.file,
        url: call.url,
        message: `API call to "${call.url}" has no matching endpoint`,
      });
    }
  }
  
  return results;
}

// =============================================================================
// RISK SCORING
// =============================================================================

function calculateRiskScore(analysis) {
  let score = 0;
  
  // Breaking changes
  if (analysis.breakingChanges) {
    score += analysis.breakingChanges.filter(b => b.severity === 'high').length * 3;
    score += analysis.breakingChanges.filter(b => b.severity === 'medium').length * 2;
    score += analysis.breakingChanges.filter(b => b.severity === 'low').length * 1;
  }
  
  // Affected components
  if (analysis.affected) {
    score += analysis.affected.direct.length * 1;
    score += analysis.affected.indirect.length * 0.5;
    score += analysis.affected.components.length * 1;
    score += analysis.affected.apis.length * 2;
    score += analysis.affected.tables.length * 2;
  }
  
  // Cap at 10
  return Math.min(Math.round(score), 10);
}

function getRiskLevel(score) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

module.exports = {
  findAffectedComponents,
  detectBreakingChanges,
  getGitDiff,
  validateApiEndpoints,
  calculateRiskScore,
  getRiskLevel,
};
