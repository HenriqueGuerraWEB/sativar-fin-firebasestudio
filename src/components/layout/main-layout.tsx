
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Users, Package, Banknote, FileText, Settings, LogOut, Shapes, PanelLeft, CalendarCheck, BookText } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { SativarLogo } from '@/components/sativar-logo';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ModeToggle } from '../mode-toggle';
import { StorageService } from '@/lib/storage-service';
import type { CompanySettings } from '@/lib/types/company-settings-types';
import { Skeleton } from '../ui/skeleton';
import { NotificationBell } from './notification-bell';

function HeaderContent() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { isMobile, setOpenMobile } = useSidebar();
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [loadingName, setLoadingName] = useState(true);

    useEffect(() => {
        const fetchCompanyName = async () => {
            setLoadingName(true);
            try {
                const settings = await StorageService.getItem<CompanySettings>('company-settings', 'single-settings');
                if (settings?.name) {
                    setCompanyName(settings.name);
                } else {
                    setCompanyName('');
                }
            } catch (error) {
                console.error("Failed to fetch company name", error);
                setCompanyName('');
            } finally {
                setLoadingName(false);
            }
        };

        fetchCompanyName();
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    }

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setOpenMobile(true)}>
                        <PanelLeft />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                )}
                {loadingName ? (
                     <Skeleton className="h-6 w-32" />
                ) : (
                    <h1 className="text-lg font-bold text-foreground hidden sm:block">{companyName}</h1>
                )}
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
                <ModeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="h-9 w-9 cursor-pointer">
                            <AvatarImage src="" alt={user?.name ?? 'User'} data-ai-hint="person portrait" />
                            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/settings')}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}


function MainLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { isMobile, setOpenMobile } = useSidebar();

    const menuItems = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/tasks', label: 'Tarefas', icon: CalendarCheck },
      { href: '/clients', label: 'Clientes', icon: Users },
      { href: '/plans', label: 'Planos', icon: Package },
      { href: '/knowledge-base', label: 'Base de Conhecimento', icon: BookText },
      { href: '/settings/categories', label: 'Categorias', icon: Shapes },
      { href: '/finance', label: 'Financeiro', icon: Banknote },
      { href: '/invoices', label: 'Faturas', icon: FileText },
    ];
  
    const handleLinkClick = () => {
      if (isMobile) {
        setOpenMobile(false);
      }
    };
  
    const isActive = (href: string) => {
      if (href === '/dashboard') {
          return pathname === href;
      }
      if (['/clients', '/plans', '/finance', '/invoices', '/settings', '/tasks', '/knowledge-base'].includes(href)) {
          return pathname.startsWith(href);
      }
       if (href === '/settings/categories') {
          return pathname === href;
      }
      return false;
    }
  
    if (!user) {
      return null; 
    }

    return (
        <div className="flex h-screen w-full bg-background">
            <Sidebar>
                <SidebarHeader>
                    <Link href="/dashboard" onClick={handleLinkClick}>
                       <SativarLogo />
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                <SidebarMenu>
                    {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Link href={item.href} passHref onClick={handleLinkClick}>
                            <SidebarMenuButton
                                isActive={isActive(item.href)}
                                tooltip={item.label}
                            >
                                <item.icon />
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/settings" passHref onClick={handleLinkClick}>
                        <SidebarMenuButton isActive={isActive('/settings')} tooltip="Configurações">
                            <Settings />
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <div className="flex flex-1 flex-col">
                 <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
                    <HeaderContent />
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
  
    if (!user) {
      return null; 
    }
  
    return (
      <SidebarProvider>
          <MainLayoutContent>{children}</MainLayoutContent>
      </SidebarProvider>
    );
  }
