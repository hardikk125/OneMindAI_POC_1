/**
 * UI WIREFRAME TYPES
 * ==================
 * Data models for the UI Wireframe Viewer
 */

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export interface UIElement {
  id: string;
  type: 'button' | 'input' | 'link' | 'form' | 'modal' | 'dropdown' | 'tab' | 'card' | 'list' | 'table' | 'icon' | 'text' | 'image' | 'container' | 'custom';
  name: string;
  label?: string;
  line: number;
  column?: number;
  props: Record<string, unknown>;
  children?: UIElement[];
  // Click handler info
  onClick?: ClickHandler;
  onSubmit?: ClickHandler;
  onChange?: ClickHandler;
}

export interface ClickHandler {
  name: string;
  line: number;
  type: 'function' | 'arrow' | 'inline' | 'callback';
  actions: HandlerAction[];
  code?: string;
}

export interface HandlerAction {
  type: 'state_update' | 'api_call' | 'navigation' | 'modal_open' | 'modal_close' | 'form_submit' | 'validation' | 'side_effect' | 'unknown';
  description: string;
  target?: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

export interface ComponentDefinition {
  id: string;
  name: string;
  filePath: string;
  type: 'page' | 'component' | 'layout' | 'modal' | 'form' | 'widget';
  line: number;
  endLine?: number;
  
  // Component structure
  props: PropDefinition[];
  state: StateDefinition[];
  hooks: HookUsage[];
  
  // UI Elements
  elements: UIElement[];
  
  // Dependencies
  imports: ImportDefinition[];
  childComponents: string[];
  
  // Metadata
  lastModified: string;
  hash: string;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface StateDefinition {
  name: string;
  setter: string;
  type: string;
  initialValue?: unknown;
  line: number;
}

export interface HookUsage {
  name: string;
  type: 'useState' | 'useEffect' | 'useCallback' | 'useMemo' | 'useRef' | 'useContext' | 'custom';
  line: number;
  dependencies?: string[];
}

export interface ImportDefinition {
  source: string;
  items: string[];
  isDefault: boolean;
  line: number;
}

// =============================================================================
// PAGE DEFINITION
// =============================================================================

export interface PageDefinition {
  id: string;
  name: string;
  route: string;
  filePath: string;
  
  // Page structure
  layout?: string;
  components: ComponentReference[];
  
  // Navigation
  links: PageLink[];
  
  // Metadata
  title?: string;
  description?: string;
  lastModified: string;
}

export interface ComponentReference {
  componentId: string;
  name: string;
  props?: Record<string, unknown>;
  position: {
    order: number;
    section?: string;
  };
}

export interface PageLink {
  to: string;
  label: string;
  type: 'internal' | 'external' | 'anchor';
  element: string;
  line: number;
}

// =============================================================================
// WIREFRAME DATA
// =============================================================================

export interface WireframeData {
  projectName: string;
  projectPath: string;
  lastUpdated: string;
  
  // Structure
  pages: PageDefinition[];
  components: ComponentDefinition[];
  
  // Index for quick lookup
  componentIndex: Record<string, ComponentDefinition>;
  pageIndex: Record<string, PageDefinition>;
  
  // Statistics
  stats: WireframeStats;
}

export interface WireframeStats {
  totalPages: number;
  totalComponents: number;
  totalElements: number;
  totalClickHandlers: number;
  totalApiCalls: number;
  totalStateVariables: number;
}

// =============================================================================
// CHANGE EVENTS
// =============================================================================

export interface WireframeChange {
  type: 'added' | 'modified' | 'deleted';
  timestamp: string;
  filePath: string;
  componentName?: string;
  changes: ChangeDetail[];
}

export interface ChangeDetail {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface WireframeResponse {
  success: boolean;
  data?: WireframeData;
  error?: string;
}

export interface ComponentResponse {
  success: boolean;
  component?: ComponentDefinition;
  error?: string;
}

export interface PageResponse {
  success: boolean;
  page?: PageDefinition;
  error?: string;
}
