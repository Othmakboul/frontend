import dagre from 'dagre';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

/**
 * Compute hierarchical layout positions for React Flow nodes and edges using dagre.
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {string} direction - 'LR' (left-to-right) or 'TB' (top-to-bottom)
 * @returns {{ nodes: Array, edges: Array }}
 */
export function getLayoutedElements(nodes, edges, direction = 'LR') {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    g.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 200,
        edgesep: 30,
        marginx: 40,
        marginy: 40,
    });

    nodes.forEach((node) => {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            targetPosition: isHorizontal ? 'left' : 'top',
        };
    });

    return { nodes: layoutedNodes, edges };
}
