'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ReactWordcloud = dynamic(() => import('react-wordcloud'), { ssr: false });

interface WordCloudProps {
  words: { text: string; value: number }[];
}

const options = {
  fontSizes: [14, 60] as [number, number],
  rotations: 0,
  rotationAngles: [0, 0] as [number, number],
  fontFamily: 'Inter, sans-serif',
  padding: 2,
};

class WordCloudErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-center text-gray-400 py-8">Não foi possível renderizar a nuvem de palavras</div>;
    }
    return this.props.children;
  }
}

export default function WordCloud({ words }: WordCloudProps) {
  if (!words || words.length === 0) {
    return <div className="text-center text-gray-400 py-8">Sem dados para nuvem de palavras</div>;
  }

  const validWords = words.filter(w => w.text && w.text.length > 0 && w.value > 0);
  if (validWords.length === 0) {
    return <div className="text-center text-gray-400 py-8">Sem dados para nuvem de palavras</div>;
  }

  return (
    <WordCloudErrorBoundary>
      <div style={{ height: 300, width: '100%' }}>
        <ReactWordcloud words={validWords} options={options} />
      </div>
    </WordCloudErrorBoundary>
  );
}
