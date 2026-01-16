import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'default' | 'large' | 'xlarge';
};

export function Logo({ className, size = 'default' }: LogoProps) {
  const sizeClasses = 
      size === 'xlarge' ? 'h-16 w-16'
    : size === 'large' ? 'h-12 w-12' 
    : 'h-6 w-6';
  
  const textSizeClasses = 
      size === 'xlarge' ? 'text-4xl'
    : size === 'large' ? 'text-3xl'
    : 'text-lg';

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-primary font-headline',
        className
      )}
    >
      <Building2 className={cn(sizeClasses)} />
      <span className={cn('font-bold', textSizeClasses, 'group-data-[collapsible=icon]:hidden')}>HighPoint HouseKeep</span>
    </div>
  );
}
