import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trend?: string;
  loading?: boolean;
}

export default function KpiCard({
  title, value, icon: Icon, color, bgColor, trend, loading = false,
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      )}
      {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
    </div>
  );
}