import React from 'react';
import Link from 'next/link';
import { FileImage, TestTube, Pill, ClipboardList } from 'lucide-react';

interface QuickAccessCardProps {
  title: string;
  icon: React.ElementType;
  count: number;
  subtitle: string;
  link: string;
  color: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ 
  title, 
  icon: Icon, 
  count, 
  subtitle, 
  link, 
  color 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  };

  return (
    <Link href={link}>
      <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-6 cursor-pointer transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between mb-4">
          <Icon className="w-8 h-8" />
          <span className="text-2xl font-bold">{count}</span>
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm mt-1 opacity-75">{subtitle}</p>
      </div>
    </Link>
  );
};

const QuickAccess = () => {
  const quickAccessItems = [
    {
      title: 'Imaging',
      icon: FileImage,
      count: 5,
      subtitle: 'New results',
      link: '/imaging',
      color: 'blue'
    },
    {
      title: 'Labs',
      icon: TestTube,
      count: 12,
      subtitle: 'Pending results',
      link: '/labs',
      color: 'green'
    },
    {
      title: 'Medications',
      icon: Pill,
      count: 8,
      subtitle: 'Active prescriptions',
      link: '/medications',
      color: 'purple'
    },
    {
      title: 'Treatment Plans',
      icon: ClipboardList,
      count: 3,
      subtitle: 'Active plans',
      link: '/treatment-plans',
      color: 'orange'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickAccessItems.map((item, index) => (
        <QuickAccessCard key={index} {...item} />
      ))}
    </div>
  );
};

export default QuickAccess;
