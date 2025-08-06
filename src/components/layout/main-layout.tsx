
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
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Users, Package, Banknote, FileText, Settings, LogOut } from 'lucide-react';
import React from 'react';
import { SativarLogo, SativarLogoIcon } from '@/components/sativar-logo';
import { ModeToggle } from '@/components/mode-toggle';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

function HeaderContent() {
    const { user, logout } = useAuth();
    const router = useRouter();

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
        <div className="ml-auto flex items-center gap-4">
            <ModeToggle />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer">
                        <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} data-ai-hint="person portrait" />
                        <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
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
    );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/plans', label: 'Planos', icon: Package },
    { href: '/finance', label: 'Financeiro', icon: Banknote },
    { href: '/invoices', label: 'Faturas', icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
        return pathname === href;
    }
    if (['/clients', '/plans', '/finance', '/invoices', '/settings'].includes(href)) {
        return pathname.startsWith(href);
    }
    return false;
  }

  if (!user) {
    return null; 
  }

  return (
    <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 pl-[var(--sidebar-width-icon)] lg:h-[60px] lg:px-6 lg:pl-[var(--sidebar-width-icon)]">
                <HeaderContent />
            </header>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar>
                    <SidebarHeader>
                        <Link href="/dashboard">
                           <SativarLogoIcon />
                        </Link>
                    </SidebarHeader>
                    <SidebarContent>
                    <SidebarMenu>
                        {menuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} passHref>
                                <SidebarMenuButton
                                    isActive={isActive(item.href)}
                                    tooltip={item.label}
                                >
                                    <item.icon />
                                    <span className="hidden">{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/settings" passHref>
                            <SidebarMenuButton isActive={isActive('/settings')} tooltip="Configurações">
                                <Settings />
                                <span className="hidden">Configurações</span>
                            </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>
                <SidebarInset>
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </div>
    </SidebarProvider>
  );
}
