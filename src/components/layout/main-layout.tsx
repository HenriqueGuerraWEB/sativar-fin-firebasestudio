"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Users, Package, Banknote, FileText, Settings, PanelLeft } from 'lucide-react';
import React from 'react';
import { SativarLogo } from '@/components/sativar-logo';
import { ModeToggle } from '@/components/mode-toggle';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
    return pathname.startsWith(href);
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader>
              <SativarLogo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                        <SidebarMenuButton
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                  <Link href="/settings">
                    <SidebarMenuButton isActive={pathname.startsWith('/settings')} tooltip="Configurações">
                        <Settings />
                        <span>Configurações</span>
                    </SidebarMenuButton>
                  </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
              <SidebarTrigger className="flex items-center gap-2 md:hidden">
                  <PanelLeft />
                  <SativarLogo />
              </SidebarTrigger>
            <div className="ml-auto flex items-center gap-4">
              <ModeToggle />
              <Avatar className="h-9 w-9">
                  <AvatarImage src="https://placehold.co/36x36.png" alt="@admin" data-ai-hint="person portrait" />
                  <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
              {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
