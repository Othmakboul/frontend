import { Handle, Position } from '@xyflow/react';

export default function CategoryNode({ data }) {
    const bg = data.color || '#8b5cf6';

    return (
        <div className="rf-node rf-node-category" style={{ '--node-color': bg }}>
            <Handle type="target" position={Position.Left} className="rf-handle" />
            <div className="rf-node-inner rf-category-inner" style={{ background: bg }}>
                <span className="rf-node-label">{data.label}</span>
            </div>
            <Handle type="source" position={Position.Right} className="rf-handle" />
        </div>
    );
}
