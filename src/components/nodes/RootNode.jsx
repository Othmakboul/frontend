import { Handle, Position } from '@xyflow/react';

export default function RootNode({ data }) {
    return (
        <div className="rf-node rf-node-root">
            <div className="rf-node-inner rf-root-inner">
                <div className="rf-root-glow" />
                <span className="rf-node-label">{data.label}</span>
            </div>
            <Handle type="source" position={Position.Right} className="rf-handle" />
        </div>
    );
}
