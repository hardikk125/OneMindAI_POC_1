/**
 * DEPENDENCY DIAGRAM
 * ==================
 * Interactive visualization of codebase dependencies
 * Highlights impact paths when changes are detected
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DependencyGraph, ChangeAnalysis } from '../lib/client';

interface Node {
  id: string;
  label: string;
  type: 'component' | 'hook' | 'util' | 'api' | 'page' | 'other';
  x: number;
  y: number;
  risk?: number;
  isAffected?: boolean;
  isSource?: boolean;
}

interface Edge {
  from: string;
  to: string;
  isImpactPath?: boolean;
}

interface DependencyDiagramProps {
  graph: DependencyGraph | null;
  currentAnalysis: ChangeAnalysis | null;
  onNodeClick?: (nodeId: string) => void;
}

export function DependencyDiagram({ graph, currentAnalysis, onNodeClick }: DependencyDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build nodes and edges from graph
  useEffect(() => {
    if (!graph) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const affectedFiles = new Set(currentAnalysis?.affected?.direct || []);
    const sourceFile = currentAnalysis?.file;

    // Categorize files
    const categorize = (path: string): Node['type'] => {
      if (path.includes('/components/')) return 'component';
      if (path.includes('/hooks/') || path.includes('use')) return 'hook';
      if (path.includes('/api/') || path.includes('server/')) return 'api';
      if (path.includes('/pages/') || path.match(/App\.(tsx|jsx)$/)) return 'page';
      if (path.includes('/lib/') || path.includes('/utils/')) return 'util';
      return 'other';
    };

    // Create nodes with force-directed layout positions
    const files = Object.keys(graph);
    const angleStep = (2 * Math.PI) / files.length;
    const radius = Math.min(400, files.length * 8);

    files.forEach((file, i) => {
      const angle = i * angleStep;
      const type = categorize(file);
      
      // Group by type with different radii
      const typeRadius = {
        page: radius * 0.3,
        component: radius * 0.6,
        hook: radius * 0.8,
        util: radius * 0.9,
        api: radius * 1.0,
        other: radius * 1.1,
      }[type];

      newNodes.push({
        id: file,
        label: file.split('/').pop() || file,
        type,
        x: 450 + Math.cos(angle) * typeRadius,
        y: 300 + Math.sin(angle) * typeRadius,
        isAffected: affectedFiles.has(file),
        isSource: file === sourceFile,
        risk: file === sourceFile ? currentAnalysis?.riskScore : undefined,
      });

      // Create edges from dependencies
      const deps = graph[file];
      if (deps?.dependencies) {
        deps.dependencies.forEach(dep => {
          if (graph[dep]) {
            newEdges.push({
              from: file,
              to: dep,
              isImpactPath: affectedFiles.has(file) || file === sourceFile,
            });
          }
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, currentAnalysis]);

  // Draw the diagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      
      if (edge.isImpactPath) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;
      
      // Node colors by type
      const colors: Record<Node['type'], string> = {
        page: '#8b5cf6',
        component: '#3b82f6',
        hook: '#06b6d4',
        util: '#10b981',
        api: '#f59e0b',
        other: '#6b7280',
      };

      let radius = 6;
      let color = colors[node.type];

      // Highlight affected nodes
      if (node.isSource) {
        radius = 12;
        color = '#ef4444';
      } else if (node.isAffected) {
        radius = 9;
        color = '#f97316';
      }

      if (isHovered || isSelected) {
        radius += 3;
      }

      // Draw glow for high-risk source
      if (node.isSource && node.risk && node.risk >= 7) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isHovered || isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label for hovered/selected/affected nodes
      if (isHovered || isSelected || node.isSource || node.isAffected) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - radius - 5);
      }
    });

    ctx.restore();
  }, [nodes, edges, hoveredNode, selectedNode, zoom, pan]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    if (isDragging) {
      setPan({
        x: e.clientX - rect.left - dragStart.x,
        y: e.clientY - rect.top - dragStart.y,
      });
      return;
    }

    // Check if hovering over a node
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });

    setHoveredNode(hovered?.id || null);
  }, [nodes, zoom, pan, isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      onNodeClick?.(hoveredNode);
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      });
    }
  }, [hoveredNode, pan, onNodeClick]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        Loading dependency graph...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg p-3 text-xs z-10">
        <div className="font-semibold text-slate-300 mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-slate-400">Changed File</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-slate-400">Affected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-slate-400">Page</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-400">Component</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
            <span className="text-slate-400">Hook</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-400">API</span>
          </div>
        </div>
      </div>

      {/* Impact Warning */}
      {currentAnalysis && currentAnalysis.riskScore >= 7 && (
        <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-xs z-10 max-w-xs">
          <div className="font-semibold text-red-400 mb-1">⚠️ High Risk Change</div>
          <div className="text-red-300">{currentAnalysis.file}</div>
          <div className="text-red-400 mt-1">
            Risk: {currentAnalysis.riskScore}/10 • {currentAnalysis.affected.direct.length} files affected
          </div>
          {currentAnalysis.analysis.potentialIssues.filter(i => i.severity === 'high').map((issue, i) => (
            <div key={i} className="mt-2 text-red-300 text-xs">
              • {issue.description}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 text-xs z-10 max-w-sm">
          <div className="font-semibold text-slate-300 mb-1">{selectedNode}</div>
          {graph[selectedNode] && (
            <>
              <div className="text-slate-400">
                Imports: {graph[selectedNode].dependencies?.length || 0} files
              </div>
              <div className="text-slate-400">
                Dependents: {graph[selectedNode].dependents?.length || 0} files
              </div>
              {graph[selectedNode].components?.length > 0 && (
                <div className="text-blue-400 mt-1">
                  Components: {graph[selectedNode].components.join(', ')}
                </div>
              )}
              {graph[selectedNode].hooks?.length > 0 && (
                <div className="text-cyan-400">
                  Hooks: {graph[selectedNode].hooks.join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        className="w-full h-[600px] rounded-lg cursor-move"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}

export default DependencyDiagram;
