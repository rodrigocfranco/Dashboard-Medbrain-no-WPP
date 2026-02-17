'use client';

import { useState } from 'react';
// @nivo/treemap wrapper
import { ResponsiveTreeMap } from '@nivo/treemap';

interface TreemapChild {
  name: string;
  value?: number;
  children?: TreemapChild[];
}

interface TreemapData {
  name: string;
  children: TreemapChild[];
}

interface CategoryTreemapProps {
  data: TreemapData;
}

export default function CategoryTreemap({ data }: CategoryTreemapProps) {
  const [zoomedNode, setZoomedNode] = useState<string | null>(null);

  if (!data.children || data.children.length === 0) {
    return <div className="text-center text-gray-400 py-8">Sem dados de categorias para exibir</div>;
  }

  const displayData = zoomedNode
    ? { name: 'root', children: data.children.filter(c => c.name === zoomedNode).flatMap((c: any) => c.children || [{ name: c.name, value: c.value }]) }
    : data;

  return (
    <div>
      {zoomedNode && (
        <button onClick={() => setZoomedNode(null)} className="text-xs text-blue-600 mb-2 hover:underline">
          ← Voltar para todas categorias
        </button>
      )}
      <div style={{ height: 400 }}>
        <ResponsiveTreeMap
          data={displayData as any}
          identity="name"
          value="value"
          label={(node: any) => `${node.id} (${node.formattedValue})`}
          labelSkipSize={30}
          onClick={(node: any) => {
            if (!zoomedNode && node.data.children) {
              setZoomedNode(node.id as string);
            }
          }}
          colors={{ scheme: 'blues' }}
          borderWidth={2}
          borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        />
      </div>
    </div>
  );
}
