import { Handle, Position } from '@xyflow/react';

export default function GroupNode({ data }) {
    const bg = data.color || '#3b82f6';

    return (
        <div className="rf-node rf-node-group" style={{ '--node-color': bg }}>
            <Handle type="target" position={Position.Left} className="rf-handle" />
            <div className="rf-node-inner rf-group-inner" style={{ background: bg }}>
                <span className="rf-node-label">{data.label}</span>
                {data.badge != null && (
                    <span className="rf-badge">{data.badge}</span>
                )}
            </div>
            <Handle type="source" position={Position.Right} className="rf-handle" />
        </div>
    );
}
