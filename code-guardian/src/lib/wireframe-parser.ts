/**
 * UI WIREFRAME PARSER
 * ====================
 * Parses React/TSX files to extract UI structure, components, and click handlers
 */

import type {
  ComponentDefinition,
  UIElement,
  ClickHandler,
  HandlerAction,
  StateDefinition,
  HookUsage,
  ImportDefinition,
  PropDefinition,
  PageDefinition,
  PageLink,
  WireframeData,
  WireframeStats,
} from './wireframe-types';

// =============================================================================
// REGEX PATTERNS
// =============================================================================

const PATTERNS = {
  // Component detection
  functionComponent: /(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
  arrowComponent: /(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::\s*React\.FC[^=]*)?=\s*(?:\([^)]*\)|[^=])\s*=>/g,
  
  // JSX Elements
  jsxElement: /<(\w+)([^>]*)(?:\/>|>)/g,
  jsxButton: /<(?:button|Button)([^>]*)(?:\/>|>)/gi,
  jsxInput: /<(?:input|Input|textarea|TextArea)([^>]*)(?:\/>|>)/gi,
  jsxLink: /<(?:Link|a|NavLink)([^>]*)(?:\/>|>)/gi,
  jsxForm: /<(?:form|Form)([^>]*)(?:\/>|>)/gi,
  
  // Event handlers
  onClick: /onClick\s*=\s*\{([^}]+)\}/g,
  onSubmit: /onSubmit\s*=\s*\{([^}]+)\}/g,
  onChange: /onChange\s*=\s*\{([^}]+)\}/g,
  
  // State
  useState: /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState(?:<[^>]+>)?\(([^)]*)\)/g,
  
  // Hooks
  useEffect: /useEffect\s*\(\s*\(\)\s*=>\s*\{/g,
  useCallback: /const\s+(\w+)\s*=\s*useCallback/g,
  useMemo: /const\s+(\w+)\s*=\s*useMemo/g,
  useRef: /const\s+(\w+)\s*=\s*useRef/g,
  useContext: /const\s+(\w+)\s*=\s*useContext/g,
  customHook: /const\s+(?:\{[^}]+\}|\w+)\s*=\s*(use\w+)\(/g,
  
  // Imports
  importStatement: /import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/g,
  
  // Props
  propsInterface: /interface\s+(\w+Props)\s*\{([^}]+)\}/g,
  propsType: /type\s+(\w+Props)\s*=\s*\{([^}]+)\}/g,
  
  // Routes
  routePath: /path\s*[=:]\s*['"]([^'"]+)['"]/g,
  linkTo: /to\s*=\s*['"]([^'"]+)['"]/g,
  
  // Function handlers
  functionHandler: /(?:const|function)\s+(\w+)\s*=?\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{/g,
  
  // API calls
  apiCall: /(?:fetch|axios|supabase)\s*[.(]/g,
  
  // Navigation
  navigate: /navigate\s*\(\s*['"]([^'"]+)['"]/g,
  useNavigate: /const\s+(\w+)\s*=\s*useNavigate/g,
};

// =============================================================================
// PARSER CLASS
// =============================================================================

export class WireframeParser {
  private fileContent: string = '';
  private filePath: string = '';
  private lines: string[] = [];

  // ===========================================================================
  // MAIN PARSE METHOD
  // ===========================================================================

  parseFile(content: string, filePath: string): ComponentDefinition | null {
    this.fileContent = content;
    this.filePath = filePath;
    this.lines = content.split('\n');

    // Find the main component
    const componentName = this.extractComponentName();
    if (!componentName) return null;

    const componentType = this.determineComponentType(filePath, componentName);
    const componentLine = this.findComponentLine(componentName);

    const component: ComponentDefinition = {
      id: this.generateId(filePath, componentName),
      name: componentName,
      filePath,
      type: componentType,
      line: componentLine,
      props: this.extractProps(componentName),
      state: this.extractState(),
      hooks: this.extractHooks(),
      elements: this.extractUIElements(),
      imports: this.extractImports(),
      childComponents: this.extractChildComponents(),
      lastModified: new Date().toISOString(),
      hash: this.generateHash(content),
    };

    return component;
  }

  // ===========================================================================
  // COMPONENT EXTRACTION
  // ===========================================================================

  private extractComponentName(): string | null {
    // Try function component
    const funcMatch = /(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\(/m.exec(this.fileContent);
    if (funcMatch && this.isValidComponentName(funcMatch[1])) {
      return funcMatch[1];
    }

    // Try arrow component
    const arrowMatch = /(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::\s*React\.FC[^=]*)?=\s*(?:\([^)]*\)|[^=])\s*=>/m.exec(this.fileContent);
    if (arrowMatch && this.isValidComponentName(arrowMatch[1])) {
      return arrowMatch[1];
    }

    // Try export default
    const defaultMatch = /export\s+default\s+(\w+)/m.exec(this.fileContent);
    if (defaultMatch && this.isValidComponentName(defaultMatch[1])) {
      return defaultMatch[1];
    }

    return null;
  }

  private isValidComponentName(name: string): boolean {
    // React components start with uppercase
    return /^[A-Z]/.test(name);
  }

  private findComponentLine(componentName: string): number {
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].includes(`function ${componentName}`) || 
          this.lines[i].includes(`const ${componentName}`)) {
        return i + 1;
      }
    }
    return 1;
  }

  private determineComponentType(filePath: string, name: string): ComponentDefinition['type'] {
    const lowerPath = filePath.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerPath.includes('/pages/') || lowerPath.includes('page.tsx') || lowerName.includes('page')) {
      return 'page';
    }
    if (lowerPath.includes('/layouts/') || lowerName.includes('layout')) {
      return 'layout';
    }
    if (lowerPath.includes('/modals/') || lowerName.includes('modal') || lowerName.includes('dialog')) {
      return 'modal';
    }
    if (lowerPath.includes('/forms/') || lowerName.includes('form')) {
      return 'form';
    }
    if (lowerPath.includes('/widgets/') || lowerName.includes('widget')) {
      return 'widget';
    }
    return 'component';
  }

  // ===========================================================================
  // UI ELEMENT EXTRACTION
  // ===========================================================================

  extractUIElements(): UIElement[] {
    const elements: UIElement[] = [];
    let elementId = 0;

    // Extract buttons
    this.extractElementsByPattern(
      /<(?:button|Button)([^>]*)(?:>([^<]*)<\/(?:button|Button)>|\/>)/gi,
      'button',
      elements,
      () => `btn-${++elementId}`
    );

    // Extract inputs
    this.extractElementsByPattern(
      /<(?:input|Input|textarea|TextArea)([^>]*)(?:\/>|>)/gi,
      'input',
      elements,
      () => `input-${++elementId}`
    );

    // Extract links
    this.extractElementsByPattern(
      /<(?:Link|a|NavLink)([^>]*)(?:>([^<]*)<\/(?:Link|a|NavLink)>|\/>)/gi,
      'link',
      elements,
      () => `link-${++elementId}`
    );

    // Extract forms
    this.extractElementsByPattern(
      /<(?:form|Form)([^>]*)/gi,
      'form',
      elements,
      () => `form-${++elementId}`
    );

    // Extract modals/dialogs
    this.extractElementsByPattern(
      /<(?:Modal|Dialog|Sheet|Drawer)([^>]*)/gi,
      'modal',
      elements,
      () => `modal-${++elementId}`
    );

    // Extract tabs
    this.extractElementsByPattern(
      /<(?:Tab|TabsTrigger|TabsContent)([^>]*)/gi,
      'tab',
      elements,
      () => `tab-${++elementId}`
    );

    // Extract dropdowns
    this.extractElementsByPattern(
      /<(?:Select|Dropdown|DropdownMenu|Menu)([^>]*)/gi,
      'dropdown',
      elements,
      () => `dropdown-${++elementId}`
    );

    // Extract cards
    this.extractElementsByPattern(
      /<(?:Card|CardContent|CardHeader)([^>]*)/gi,
      'card',
      elements,
      () => `card-${++elementId}`
    );

    return elements;
  }

  private extractElementsByPattern(
    pattern: RegExp,
    type: UIElement['type'],
    elements: UIElement[],
    idGenerator: () => string
  ): void {
    let match;
    while ((match = pattern.exec(this.fileContent)) !== null) {
      const props = this.parseJSXProps(match[1] || '');
      const label = match[2]?.trim() || props.children?.toString() || '';
      const line = this.getLineNumber(match.index);

      const element: UIElement = {
        id: idGenerator(),
        type,
        name: props.name?.toString() || props.id?.toString() || `${type}-${line}`,
        label: label || props.placeholder?.toString() || props.title?.toString(),
        line,
        props,
      };

      // Extract click handler
      if (props.onClick) {
        element.onClick = this.parseClickHandler(props.onClick.toString(), line);
      }
      if (props.onSubmit) {
        element.onSubmit = this.parseClickHandler(props.onSubmit.toString(), line);
      }
      if (props.onChange) {
        element.onChange = this.parseClickHandler(props.onChange.toString(), line);
      }

      elements.push(element);
    }
  }

  private parseJSXProps(propsString: string): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    
    // Match prop="value" or prop={value} or prop
    const propPattern = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]+)\}))?/g;
    let match;
    
    while ((match = propPattern.exec(propsString)) !== null) {
      const [, name, stringVal1, stringVal2, jsxVal] = match;
      if (name) {
        props[name] = stringVal1 || stringVal2 || jsxVal || true;
      }
    }
    
    return props;
  }

  // ===========================================================================
  // CLICK HANDLER PARSING
  // ===========================================================================

  private parseClickHandler(handlerCode: string, line: number): ClickHandler {
    const handler: ClickHandler = {
      name: this.extractHandlerName(handlerCode),
      line,
      type: this.determineHandlerType(handlerCode),
      actions: this.extractHandlerActions(handlerCode),
      code: handlerCode.trim(),
    };
    return handler;
  }

  private extractHandlerName(code: string): string {
    // Direct function reference: onClick={handleClick}
    const directRef = /^(\w+)$/.exec(code.trim());
    if (directRef) return directRef[1];

    // Arrow function call: onClick={() => handleClick()}
    const arrowCall = /=>\s*(\w+)\(/.exec(code);
    if (arrowCall) return arrowCall[1];

    // Inline arrow: onClick={() => setState(x)}
    if (code.includes('=>')) return 'inline';

    return 'anonymous';
  }

  private determineHandlerType(code: string): ClickHandler['type'] {
    if (/^(\w+)$/.test(code.trim())) return 'function';
    if (code.includes('=>')) return 'arrow';
    if (code.includes('function')) return 'function';
    return 'callback';
  }

  private extractHandlerActions(code: string): HandlerAction[] {
    const actions: HandlerAction[] = [];

    // State updates: setState, setX
    const stateUpdates = code.match(/set\w+\s*\(/g);
    if (stateUpdates) {
      stateUpdates.forEach(update => {
        actions.push({
          type: 'state_update',
          description: `Updates state: ${update.replace('(', '')}`,
          target: update.replace(/set(\w+)\s*\(/, '$1').toLowerCase(),
        });
      });
    }

    // API calls
    if (/fetch|axios|supabase|api\.|\.post|\.get|\.put|\.delete/i.test(code)) {
      actions.push({
        type: 'api_call',
        description: 'Makes API request',
      });
    }

    // Navigation
    const navMatch = /navigate\s*\(\s*['"]([^'"]+)['"]/.exec(code);
    if (navMatch) {
      actions.push({
        type: 'navigation',
        description: `Navigates to: ${navMatch[1]}`,
        target: navMatch[1],
      });
    }

    // Modal operations
    if (/setIsOpen|setShow|openModal|closeModal|onClose|onOpen/i.test(code)) {
      const isOpen = /setIsOpen\s*\(\s*true|openModal|onOpen/i.test(code);
      actions.push({
        type: isOpen ? 'modal_open' : 'modal_close',
        description: isOpen ? 'Opens modal/dialog' : 'Closes modal/dialog',
      });
    }

    // Form submission
    if (/handleSubmit|onSubmit|submit\(/i.test(code)) {
      actions.push({
        type: 'form_submit',
        description: 'Submits form data',
      });
    }

    // Validation
    if (/validate|isValid|checkValid/i.test(code)) {
      actions.push({
        type: 'validation',
        description: 'Performs validation',
      });
    }

    // If no specific actions found
    if (actions.length === 0) {
      actions.push({
        type: 'unknown',
        description: 'Executes handler logic',
      });
    }

    return actions;
  }

  // ===========================================================================
  // STATE & HOOKS EXTRACTION
  // ===========================================================================

  extractState(): StateDefinition[] {
    const states: StateDefinition[] = [];
    const pattern = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState(?:<([^>]+)>)?\(([^)]*)\)/g;
    let match;

    while ((match = pattern.exec(this.fileContent)) !== null) {
      states.push({
        name: match[1],
        setter: match[2],
        type: match[3] || 'unknown',
        initialValue: this.parseInitialValue(match[4]),
        line: this.getLineNumber(match.index),
      });
    }

    return states;
  }

  extractHooks(): HookUsage[] {
    const hooks: HookUsage[] = [];

    // useEffect
    let match;
    const effectPattern = /useEffect\s*\(/g;
    while ((match = effectPattern.exec(this.fileContent)) !== null) {
      hooks.push({
        name: 'useEffect',
        type: 'useEffect',
        line: this.getLineNumber(match.index),
      });
    }

    // useCallback
    const callbackPattern = /const\s+(\w+)\s*=\s*useCallback/g;
    while ((match = callbackPattern.exec(this.fileContent)) !== null) {
      hooks.push({
        name: match[1],
        type: 'useCallback',
        line: this.getLineNumber(match.index),
      });
    }

    // useMemo
    const memoPattern = /const\s+(\w+)\s*=\s*useMemo/g;
    while ((match = memoPattern.exec(this.fileContent)) !== null) {
      hooks.push({
        name: match[1],
        type: 'useMemo',
        line: this.getLineNumber(match.index),
      });
    }

    // useRef
    const refPattern = /const\s+(\w+)\s*=\s*useRef/g;
    while ((match = refPattern.exec(this.fileContent)) !== null) {
      hooks.push({
        name: match[1],
        type: 'useRef',
        line: this.getLineNumber(match.index),
      });
    }

    // Custom hooks
    const customPattern = /const\s+(?:\{[^}]+\}|(\w+))\s*=\s*(use\w+)\(/g;
    while ((match = customPattern.exec(this.fileContent)) !== null) {
      if (!['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext'].includes(match[2])) {
        hooks.push({
          name: match[2],
          type: 'custom',
          line: this.getLineNumber(match.index),
        });
      }
    }

    return hooks;
  }

  // ===========================================================================
  // IMPORTS & DEPENDENCIES
  // ===========================================================================

  extractImports(): ImportDefinition[] {
    const imports: ImportDefinition[] = [];
    const pattern = /import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = pattern.exec(this.fileContent)) !== null) {
      const defaultImport = match[1];
      const namedImports = match[2]?.split(',').map(s => s.trim().split(' as ')[0]) || [];
      const source = match[3];

      imports.push({
        source,
        items: defaultImport ? [defaultImport, ...namedImports] : namedImports,
        isDefault: !!defaultImport,
        line: this.getLineNumber(match.index),
      });
    }

    return imports;
  }

  extractChildComponents(): string[] {
    const children: string[] = [];
    const pattern = /<([A-Z]\w+)(?:\s|\/|>)/g;
    let match;

    while ((match = pattern.exec(this.fileContent)) !== null) {
      const componentName = match[1];
      // Exclude HTML-like elements and common UI library components
      if (!['Fragment', 'React', 'Suspense', 'ErrorBoundary'].includes(componentName)) {
        if (!children.includes(componentName)) {
          children.push(componentName);
        }
      }
    }

    return children;
  }

  extractProps(componentName: string): PropDefinition[] {
    const props: PropDefinition[] = [];
    
    // Look for interface or type definition
    const interfacePattern = new RegExp(`interface\\s+${componentName}Props\\s*\\{([^}]+)\\}`, 's');
    const typePattern = new RegExp(`type\\s+${componentName}Props\\s*=\\s*\\{([^}]+)\\}`, 's');
    
    const match = interfacePattern.exec(this.fileContent) || typePattern.exec(this.fileContent);
    if (match) {
      const propsBody = match[1];
      const propPattern = /(\w+)(\?)?:\s*([^;]+);/g;
      let propMatch;
      
      while ((propMatch = propPattern.exec(propsBody)) !== null) {
        props.push({
          name: propMatch[1],
          type: propMatch[3].trim(),
          required: !propMatch[2],
        });
      }
    }

    return props;
  }

  // ===========================================================================
  // PAGE EXTRACTION
  // ===========================================================================

  extractPageInfo(component: ComponentDefinition): PageDefinition | null {
    if (component.type !== 'page') return null;

    const links: PageLink[] = [];
    const linkPattern = /<(?:Link|NavLink)\s+[^>]*to\s*=\s*['"]([^'"]+)['"][^>]*>([^<]*)</g;
    let match;

    while ((match = linkPattern.exec(this.fileContent)) !== null) {
      links.push({
        to: match[1],
        label: match[2].trim(),
        type: match[1].startsWith('http') ? 'external' : match[1].startsWith('#') ? 'anchor' : 'internal',
        element: 'Link',
        line: this.getLineNumber(match.index),
      });
    }

    // Try to extract route from file path
    const route = this.inferRouteFromPath(component.filePath);

    return {
      id: component.id,
      name: component.name,
      route,
      filePath: component.filePath,
      components: component.childComponents.map((name, index) => ({
        componentId: name,
        name,
        position: { order: index },
      })),
      links,
      lastModified: component.lastModified,
    };
  }

  private inferRouteFromPath(filePath: string): string {
    // Convert file path to route
    const match = /pages?[/\\](.+?)(?:\.tsx?|[/\\]index\.tsx?)$/i.exec(filePath);
    if (match) {
      return '/' + match[1].replace(/\\/g, '/').replace(/\[(\w+)\]/g, ':$1');
    }
    return '/';
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  private getLineNumber(index: number): number {
    const textBefore = this.fileContent.substring(0, index);
    return textBefore.split('\n').length;
  }

  private parseInitialValue(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed);
    if (/^\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
    if (trimmed.startsWith('[')) return 'array';
    if (trimmed.startsWith('{')) return 'object';
    return trimmed || undefined;
  }

  private generateId(filePath: string, name: string): string {
    return `${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${name}`;
  }

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// =============================================================================
// WIREFRAME BUILDER
// =============================================================================

export function buildWireframeData(
  components: ComponentDefinition[],
  projectName: string,
  projectPath: string
): WireframeData {
  const pages = components
    .filter(c => c.type === 'page')
    .map(c => {
      const parser = new WireframeParser();
      return parser.extractPageInfo(c);
    })
    .filter((p): p is PageDefinition => p !== null);

  const componentIndex: Record<string, ComponentDefinition> = {};
  const pageIndex: Record<string, PageDefinition> = {};

  components.forEach(c => {
    componentIndex[c.id] = c;
  });

  pages.forEach(p => {
    pageIndex[p.id] = p;
  });

  const stats: WireframeStats = {
    totalPages: pages.length,
    totalComponents: components.length,
    totalElements: components.reduce((sum, c) => sum + c.elements.length, 0),
    totalClickHandlers: components.reduce((sum, c) => 
      sum + c.elements.filter(e => e.onClick || e.onSubmit || e.onChange).length, 0
    ),
    totalApiCalls: components.reduce((sum, c) => 
      sum + c.elements.filter(e => 
        e.onClick?.actions.some(a => a.type === 'api_call') ||
        e.onSubmit?.actions.some(a => a.type === 'api_call')
      ).length, 0
    ),
    totalStateVariables: components.reduce((sum, c) => sum + c.state.length, 0),
  };

  return {
    projectName,
    projectPath,
    lastUpdated: new Date().toISOString(),
    pages,
    components,
    componentIndex,
    pageIndex,
    stats,
  };
}

export default WireframeParser;
