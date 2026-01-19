import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'default' | 'large' | 'xlarge';
};

export function Logo({ className, size = 'default' }: LogoProps) {
  const sizes = {
    // Aspect ratio approx 3:2 from the image
    default: { width: 42, height: 28 },
    large: { width: 90, height: 60 },
    xlarge: { width: 120, height: 80 },
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
