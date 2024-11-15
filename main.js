import * as d3 from 'd3';
import * as d3Sankey from "d3-sankey";

const width = 928;
const height = 600;
const format = d3.format(",.0f");

// Create SVG container
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

// Configure Sankey generator
const sankey = d3Sankey.sankey()
  .nodeId(d => d.id)
  .nodeAlign(d3Sankey.sankeyJustify)
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 5], [width - 1, height - 5]]);

function wrangle(data) {
  const nodes = [];
  const links = [];
  const nodeMap = new Map(); // To ensure unique node IDs

  // "Auxiliary Comprehensive Fee" node
  const feeNodeId = nodes.length;
  nodes.push({ id: feeNodeId, name: "Auxiliary Comprehensive Fee", category: "Fee", title: "Auxiliary Comprehensive Fee", value: 0 });
  nodeMap.set("Auxiliary Comprehensive Fee", feeNodeId);

  // go through "student-costs"
  data["student-costs"].forEach(item => {
    if (item.type === "Auxiliary Comprehensive Fee Component") {
      const componentNodeId = nodes.length;
      nodes.push({
        id: componentNodeId,
        name: item.name,
        category: item.subtype,
        title: item.name,
        value: item.amount
      });
      nodeMap.set(item.name, componentNodeId);

      links.push({
        source: feeNodeId,
        target: componentNodeId,
        value: item.amount
      });

      nodes[feeNodeId].value += item.amount;
    }
  });

  return { nodes, links };
}

async function init() {
  const rawData = await d3.json("data/jmu.json"); // Load data
  const { nodes, links } = wrangle(rawData); // Wrangle data

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const rect = svg.append("g")
    .attr("stroke", "#000")
    .selectAll()
    .data(sankeyNodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => color(d.category));

  rect.append("title")
    .text(d => `${d.name}\nValue: ${format(d.value || 0)}`); // Handle missing value gracefully

  // Render links
  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll()
    .data(sankeyLinks)
    .join("path")
    .attr("d", d3Sankey.sankeyLinkHorizontal())
    .attr("stroke", d => color(d.source.category)) // Match link color to source node
    .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title")
    .text(d => `${d.source.name} → ${d.target.name}\nValue: ${format(d.value)}`);

  // Render node labels
  svg.append("g")
    .selectAll()
    .data(sankeyNodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => d.name);

  document.body.appendChild(svg.node());
}

init();