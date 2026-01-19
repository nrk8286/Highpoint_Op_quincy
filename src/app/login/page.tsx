'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import type { User } from '@/lib/types';
import { useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const preconfiguredUsers: { [email: string]: Partial<Omit<User, 'id' | 'createdAt'>> } = {
  'admin@example.com': { name: 'Nicholas Kelly', role: 'Admin', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwb3J0cmFpdHxlbnwwfHx8fDE3Njg1NjQxMDZ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  'supervisor@example.com': { name: 'Lonnie Kurr', role: 'Supervisor', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-1')?.imageUrl },
  'housekeeper@example.com': { name: 'Audry Howell', role: 'Housekeeper', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-2')?.imageUrl },
  'housekeeper2@example.com': { name: 'Hannah Steele', role: 'Housekeeper', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-3')?.imageUrl },
};


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { loading, isAuthenticated } = useUser();
  const loginBg = PlaceHolderImages.find((img) => img.id === 'login-bg');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, router]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const userEmail = user.email || '';
        const predefinedData = preconfiguredUsers[userEmail] || {};
        
        const newProfile: Omit<User, 'id'> = {
          name: predefinedData.name || 'New User',
          email: userEmail,
          role: predefinedData.role || 'Housekeeper',
          avatarUrl: predefinedData.avatarUrl || `https://i.pravatar.cc/150?u=${user.uid}`,
          createdAt: serverTimestamp(),
        };

        await setDoc(userDocRef, { ...newProfile, id: user.uid });

        toast({
            title: 'Profile Created',
            description: 'Your user profile has been initialized.',
        });
      }

      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo size="xlarge" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
      {loginBg && (
        <Image
          src={loginBg.imageUrl}
          alt={loginBg.description}
          fill
          className="object-cover opacity-10"
          data-ai-hint={loginBg.imageHint}
          priority
        />
      )}
      <div className="relative z-10 w-full max-w-md space-y-6">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="xlarge" />
            </div>
            <CardDescription className="text-lg">
              Sign in to HighPoint HouseKeep
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="supervisor@example.com"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="#"
                          className="text-sm text-primary/80 hover:text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
           <Link href="/" className="hover:underline">Return to homepage</Link>
        </p>
      </div>
    </div>
  );
}
