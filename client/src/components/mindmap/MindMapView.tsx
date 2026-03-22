import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Map, RefreshCw, ZoomIn } from 'lucide-react';
import { useStore } from '../../stores/useStore';

const TIER_COLORS: Record<number, string> = {
  0: '#ef4444', 1: '#f97316', 2: '#f59e0b', 3: '#eab308',
  4: '#84cc16', 5: '#22c55e', 6: '#14b8a6', 7: '#06b6d4', 8: '#22c55e',
};

// Custom node for topics
function TopicNode({ data }: NodeProps) {
  return (
    <div className="bg-surface border-2 border-accent rounded-xl px-5 py-3 shadow-lg shadow-accent/10 min-w-[140px] text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
      <div className="text-white font-heading font-bold text-sm">{data.label}</div>
      {data.subtitle && <div className="text-gray-400 text-xs mt-0.5">{data.subtitle}</div>}
    </div>
  );
}

// Custom node for card sets
function SetNode({ data }: NodeProps) {
  return (
    <div
      className="bg-surface-elevated border border-border rounded-lg px-4 py-2.5 shadow-md min-w-[120px] text-center hover:border-accent/40 transition-colors"
      style={{ borderLeftColor: data.color || '#6366f1', borderLeftWidth: 3 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
      <div className="text-gray-200 font-medium text-xs">{data.label}</div>
      <div className="text-gray-500 text-[10px] mt-0.5 font-mono">{data.cardCount} cards</div>
    </div>
  );
}

// Custom node for cards
function CardNode({ data }: NodeProps) {
  return (
    <div
      className="bg-surface-base border border-border rounded-md px-3 py-1.5 shadow-sm min-w-[100px] max-w-[180px] text-center"
      style={{ borderColor: TIER_COLORS[data.tier] + '60' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-1.5 !h-1.5" />
      <div className="text-gray-300 text-[11px] truncate">{data.label}</div>
      <div className="flex justify-center gap-0.5 mt-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: i <= data.tier ? TIER_COLORS[data.tier] : '#2e3348' }}
          />
        ))}
      </div>
    </div>
  );
}

const nodeTypes = {
  topic: TopicNode,
  cardSet: SetNode,
  card: CardNode,
};

export function MindMapView() {
  const { selectedTopicId, topics, cardSets, cards, fetchCardSets, fetchCards } = useStore();
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allCards, setAllCards] = useState<Record<string, any[]>>({});
  const [generating, setGenerating] = useState(false);

  // Fetch all card sets and their cards when topic changes
  useEffect(() => {
    if (selectedTopicId) {
      fetchCardSets(selectedTopicId);
    }
  }, [selectedTopicId, fetchCardSets]);

  const generateMap = useCallback(async () => {
    if (!selectedTopicId || !selectedTopic) return;
    setGenerating(true);

    // Fetch cards for each set
    const cardsBySet: Record<string, any[]> = {};
    for (const set of cardSets) {
      try {
        const res = await fetch(`/api/sets/${set.id}/cards`);
        const setCards = await res.json();
        cardsBySet[set.id] = setCards;
      } catch {
        cardsBySet[set.id] = [];
      }
    }
    setAllCards(cardsBySet);

    // Build nodes
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Topic root node
    newNodes.push({
      id: `topic-${selectedTopicId}`,
      type: 'topic',
      position: { x: 400, y: 30 },
      data: {
        label: selectedTopic.name,
        subtitle: `${cardSets.length} sets`,
      },
    });

    // Card set nodes — spread horizontally
    const setWidth = 220;
    const totalSetsWidth = cardSets.length * setWidth;
    const setStartX = 400 - totalSetsWidth / 2 + setWidth / 2;

    cardSets.forEach((set, si) => {
      const setId = `set-${set.id}`;
      const x = setStartX + si * setWidth;
      const y = 140;

      newNodes.push({
        id: setId,
        type: 'cardSet',
        position: { x, y },
        data: {
          label: set.name,
          cardCount: cardsBySet[set.id]?.length || 0,
          color: selectedTopic.color,
        },
      });

      newEdges.push({
        id: `e-topic-${set.id}`,
        source: `topic-${selectedTopicId}`,
        target: setId,
        type: 'smoothstep',
        style: { stroke: '#2e3348', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2e3348' },
      });

      // Card nodes under each set
      const setCards = cardsBySet[set.id] || [];
      const cardWidth = 190;
      const totalCardsWidth = setCards.length * cardWidth;
      const cardStartX = x - totalCardsWidth / 2 + cardWidth / 2;

      setCards.forEach((card: any, ci: number) => {
        const cardId = `card-${card.id}`;
        const frontText = card.front?.media_blocks?.find((b: any) => b.block_type === 'text');
        const label = frontText?.text_content?.slice(0, 40) || `Card ${ci + 1}`;

        newNodes.push({
          id: cardId,
          type: 'card',
          position: { x: cardStartX + ci * cardWidth, y: 260 + (ci % 2) * 50 },
          data: { label, tier: card.sr_slot },
        });

        newEdges.push({
          id: `e-${set.id}-${card.id}`,
          source: setId,
          target: cardId,
          type: 'smoothstep',
          style: { stroke: '#1e2030', strokeWidth: 1 },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setGenerating(false);
  }, [selectedTopicId, selectedTopic, cardSets, setNodes, setEdges]);

  // Auto-generate on topic or sets change
  useEffect(() => {
    if (selectedTopicId && cardSets.length > 0) {
      generateMap();
    }
  }, [selectedTopicId, cardSets.length]);

  if (!selectedTopicId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Map className="w-16 h-16 mb-4 text-gray-600" />
        <p className="text-lg font-medium">Select a topic to view its mind map</p>
        <p className="text-sm mt-1">Use the dropdown above to choose a topic</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] relative">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={generateMap}
          disabled={generating}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        className="bg-surface-base"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2030" />
        <Controls className="!bg-surface !border-border !shadow-lg [&>button]:!bg-surface-elevated [&>button]:!border-border [&>button]:!text-gray-400 [&>button:hover]:!bg-surface" />
      </ReactFlow>
    </div>
  );
}
