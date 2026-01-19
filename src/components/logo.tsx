import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'default' | 'large' | 'xlarge';
};

export function Logo({ className, size = 'default' }: LogoProps) {
  const sizes = {
    // Aspect ratio 1:1
    default: { width: 36, height: 36 },
    large: { width: 72, height: 72 },
    xlarge: { width: 96, height: 96 },
  };
  const { width, height } = sizes[size];

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-headline text-primary',
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="High Point Residence Logo"
        width={width}
        height={height}
        className="rounded-md"
      />
    </div>
  );
}
