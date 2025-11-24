import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';

interface MindMapViewerProps {
  data: MindMapNode | null;
}

const MindMapViewer: React.FC<MindMapViewerProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create hierarchy
    const root = d3.hierarchy<MindMapNode>(data);
    
    // Tree layout
    const treeLayout = d3.tree<MindMapNode>().size([innerHeight, innerWidth]);
    treeLayout(root);

    // Links
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<MindMapNode>, d3.HierarchyPointNode<MindMapNode>>()
        .x(d => d.y)
        .y(d => d.x)
      )
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2);

    // Nodes
    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Node Circles
    nodes.append("circle")
      .attr("r", 6)
      .attr("fill", d => d.children ? "#4f46e5" : "#fff") // Primary color for parents, white for leaves
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", 2);

    // Node Labels
    nodes.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -12 : 12)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .style("font-size", "14px")
      .style("font-family", "sans-serif")
      .style("fill", "#1e293b")
      .clone(true).lower() // Outline for readability
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });

    d3.select(svgRef.current).call(zoom);

  }, [data]);

  if (!data) return <div className="text-gray-400 text-center mt-20">Generate a mind map to visualize concepts here.</div>;

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 overflow-hidden border border-slate-200 rounded-xl relative">
      <svg ref={svgRef} className="w-full h-full cursor-move"></svg>
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs text-slate-500 pointer-events-none">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  );
};

export default MindMapViewer;
