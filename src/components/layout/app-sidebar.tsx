'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Warehouse,
  BarChart3,
  FileText,
  Users,
  LogOut,
  ChevronUp,
  Bot,
  Wrench,
  ClipboardCheck as InspectionIcon,
  HeartPulse,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { useAuth } from '@/firebase';
import type { User } from '@/lib/types';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/ai-chat', label: 'AI Chat', icon: Bot },
  { href: '/dashboard/tasks', label: 'Daily Tasks', icon: ClipboardList },
  { href: '/dashboard/deep-cleaning', label: 'Deep Cleaning', icon: CalendarCheck },
  { href: '/dashboard/inspections', label: 'Inspections', icon: InspectionIcon, roles: ['Supervisor', 'Admin', 'Director', 'Administrator'] },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/dashboard/nursing', label: 'Nursing', icon: HeartPulse, roles: ['Nurse', 'Director', 'Administrator'] },
  { href: '/dashboard/performance', label: 'Performance', icon: BarChart3, roles: ['Supervisor', 'Admin', 'Director', 'Administrator'] },
  { href: '/dashboard/supervisor', label: 'User Management', icon: Users, roles: ['Supervisor', 'Admin', 'Director', 'Administrator'] },
  { href: '/dashboard/audit', label: 'Audit Compliance', icon: FileText, roles: ['Supervisor', 'Admin', 'Director', 'Administrator'] },
];

export default function AppSidebar({ currentUser }: { currentUser: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.roles && !item.roles.includes(currentUser.role)) {
              return null;
            }
            const isActive = pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={{ children: item.label }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent text-left">
              <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 mb-2" side="top" align="start">
            <div className="p-2">
                <p className="font-semibold">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.role}</p>
            </div>
            <SidebarSeparator/>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4"/>
                Logout
            </Button>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </Sidebar>
  );
}

    