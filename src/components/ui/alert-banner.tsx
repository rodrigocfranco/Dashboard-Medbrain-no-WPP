interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

const STYLES = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  success: 'bg-green-50 text-green-800 border-green-200',
};

export default function AlertBanner({ type, message }: AlertBannerProps) {
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm mb-4 ${STYLES[type]}`}>
      {message}
    </div>
  );
}
