import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'default' | 'large' | 'xlarge';
};

const logoUrl = "https://100.28.42.212/wp-content/uploads/2023/12/High-Point-Quincy-Logo-FOR-DARK-BG__TRANS-2048x1365.png";

export function Logo({ className, size = 'default' }: LogoProps) {
  const sizes = {
    // Aspect ratio ~1.5:1, based on original image dimensions
    default: { width: 54, height: 36 },
    large: { width: 108, height: 72 },
    xlarge: { width: 144, height: 96 },
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
        src={logoUrl}
        alt="High Point Quincy Logo"
        width={width}
        height={height}
        className="rounded-md"
        unoptimized
      />
    </div>
  );
}
