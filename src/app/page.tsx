import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'login-bg');
  const feature1 = PlaceHolderImages.find(img => img.id === 'pre-clean-1');
  const feature2 = PlaceHolderImages.find(img => img.id === 'post-clean-1');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="#features" className="text-foreground/70 hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-foreground/70 hover:text-foreground">
              Pricing
            </Link>
            <Link href="#contact" className="text-foreground/70 hover:text-foreground">
              Contact
            </Link>
          </nav>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover opacity-10"
              data-ai-hint={heroImage.imageHint}
              priority
            />
          )}
          <div className="container relative mx-auto px-4 text-center md:px-6">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
              The Future of Facility Management
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80 md:text-xl">
              An all-in-one solution to streamline housekeeping, maintenance, and compliance for modern facilities.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">Request a Demo</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-32 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                Why Choose Our Platform?
              </h2>
              <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80">
                A toolkit designed for efficiency, compliance, and quality control.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Zap className="h-8 w-8 text-primary" />
                  <CardTitle>Streamline Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">
                    Assign and track daily tasks, manage maintenance work orders, and monitor inventory levels in real-time from a centralized dashboard.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  <CardTitle>Ensure Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">
                    Use our AI-powered reporting tool to generate draft audit reports for state requirements, and conduct digital inspections to ensure quality standards.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <CardTitle>Empower Your Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">
                    With an intuitive interface and a helpful AI assistant, your team has everything they need to perform their jobs effectively and efficiently.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-sm text-foreground/60">
            &copy; {new Date().getFullYear()} HighPoint Solutions. All rights reserved.
          </p>
          <div className="flex gap-4">
             <Link href="/login" className="text-sm text-foreground/60 hover:text-foreground">
                Sign In
            </Link>
            <Link href="#" className="text-sm text-foreground/60 hover:text-foreground">
                Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
