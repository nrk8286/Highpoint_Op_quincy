import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from 'next/link';
import { NotificationsCenter } from '@/components/notifications-center';

// This is a placeholder for a more dynamic breadcrumb solution
const PageBreadcrumb = () => (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

interface PageHeaderProps {
  title?: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps = {}) {
  return (
    <div className="space-y-1 mb-6">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <PageBreadcrumb />
        </div>
        <div className="flex items-center gap-2">
          <NotificationsCenter />
        </div>
      </header>
      {title && (
        <div className="px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
    </div>
export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <PageBreadcrumb />
      </header>
      {(title || description) && (
        <div className="mb-6">
          {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
      )}
    </>
  );
}

// Default export for backwards compatibility
export default PageHeader;
