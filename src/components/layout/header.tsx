'use client';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </header>
  );
}
