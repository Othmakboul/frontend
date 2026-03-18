import { Handle, Position } from '@xyflow/react';
import React from 'react';

/**
 * A stellar, modern glassmorphic node for React Flow.
 * Expects `data.color`, `data.label`, and optionally `data.type`.
 */
export default function GraphCustomNode({ data, selected }) {
    const { color = '#3b82f6', label = 'Node', type = 'default' } = data;

    // A subtle glowing effect based on the node's color, stronger when selected
    const glowStyle = {
        boxShadow: selected
            ? `0 0 20px 2px ${color}80, inset 0 0 10px 1px ${color}40`
            : `0 0 10px 1px ${color}40`,
        borderColor: selected ? '#ffffff' : `${color}80`,
    };

    return (
        <div
            className={`relative min-w-[140px] max-w-[200px] rounded-xl border px-4 py-3 transition-all duration-300 ${
                selected ? 'scale-105 z-50' : 'hover:scale-105 z-10 hover:z-40'
            }`}
            style={{
                ...glowStyle,
                background: 'rgba(15, 23, 42, 0.75)', // slate-900 with transparency
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
        >
            {/* Input Handle (Left) - hidden for root nodes usually, but dagre handles it */}
            {type !== 'root' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3 h-3 border-2 border-slate-900 !bg-slate-300 transition-colors"
                />
            )}

            <div className="flex flex-col items-center justify-center gap-1">
                {/* Optional type accent badge or just clean text */}
                <div
                    className="w-10 h-1 rounded-full mb-1"
                    style={{ backgroundColor: color }}
                />
                <span className="text-white text-sm font-semibold text-center leading-tight break-words line-clamp-3 w-full">
                    {label}
                </span>
                {data.subLabel && (
                    <span className="text-slate-400 text-xs text-center truncate w-full">
                        {data.subLabel}
                    </span>
                )}
            </div>

            {/* Output Handle (Right) */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 border-2 border-slate-900 transition-colors"
                style={{ backgroundColor: color }}
            />
        </div>
    );
}
