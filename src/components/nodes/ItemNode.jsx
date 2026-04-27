import { Handle, Position } from '@xyflow/react';

export default function ItemNode({ data }) {
    const bg = data.color || '#60a5fa';
    const isLeaf = data.isLeaf;

    return (
        <div
            className={`rf-node rf-node-item ${data.highlighted ? 'rf-highlighted' : ''}`}
            style={{ '--node-color': bg }}
        >
            <Handle type="target" position={Position.Left} className="rf-handle" />
            <div className="rf-node-inner rf-item-inner" style={{ background: bg }}>
                <span className="rf-node-label" title={data.fullLabel || data.label}>
                    {data.label}
                </span>
            </div>
            {!isLeaf && (
                <Handle type="source" position={Position.Right} className="rf-handle" />
            )}
        </div>
    );
}
