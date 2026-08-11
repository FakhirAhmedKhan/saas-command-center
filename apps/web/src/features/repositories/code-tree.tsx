'use client';

import type { CodeTreeNode } from './code-explorer.types';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useState } from 'react';

interface CodeTreeProps {
  nodes: CodeTreeNode[];

  activePath: string | null;

  onOpenFile(path: string): void;
}

export function CodeTree({ nodes, activePath, onOpenFile }: CodeTreeProps) {
  return (
    <div className='select-none py-1'>
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} activePath={activePath} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

interface TreeItemProps {
  node: CodeTreeNode;

  depth: number;

  activePath: string | null;

  onOpenFile(path: string): void;
}

function TreeItem({ node, depth, activePath, onOpenFile }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  const directory = node.type === 'directory';

  const active = node.path === activePath;

  return (
    <>
      <button
        type='button'
        onClick={() => {
          if (directory) {
            setExpanded((value) => !value);

            return;
          }

          if (node.type === 'file') {
            onOpenFile(node.path);
          }
        }}
        className={`flex h-8 w-full items-center gap-1.5 truncate px-2 text-left text-sm transition ${
          active ? 'bg-slate-200 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
        }`}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
        }}
      >
        {directory ? (
          expanded ? (
            <ChevronDown className='size-3.5 shrink-0' />
          ) : (
            <ChevronRight className='size-3.5 shrink-0' />
          )
        ) : (
          <span className='w-3.5 shrink-0' />
        )}

        {directory ? <Folder className='size-4 shrink-0 text-amber-500' /> : <File className='size-4 shrink-0 text-slate-500' />}

        <span className='truncate'>{node.name}</span>
      </button>

      {directory && expanded && node.children ? (
        <>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} activePath={activePath} onOpenFile={onOpenFile} />
          ))}
        </>
      ) : null}
    </>
  );
}
