import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
      <p className="text-gray-500 mb-4">Página não encontrada</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
