import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'default' | 'large' | 'xlarge';
};

export function Logo({ className, size = 'default' }: LogoProps) {
  const imageSize =
    size === 'xlarge' ? 64 : size === 'large' ? 48 : 24;

  const textSizeClasses =
    size === 'xlarge' ? 'text-4xl' : size === 'large' ? 'text-3xl' : 'text-lg';

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-headline text-primary',
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="HighPoint HouseKeep Logo"
        width={imageSize}
        height={imageSize}
        className="rounded-md"
      />
      <span className={cn('font-bold', textSizeClasses, 'group-data-[collapsible=icon]:hidden')}>HighPoint HouseKeep</span>
    </div>
  );
}
