"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { RowsIcon, SignOutIcon, UsersIcon, FileTextIcon } from "@phosphor-icons/react"
import { logoutAction } from "@/app/actions/auth"
import { Role } from "@/lib/roles"

type NavItem = {
  title: string
  url: string
  isActive?: boolean
  roles?: Role[] // undefined means visible to all
}

type NavMain = {
  title: string
  url: string
  icon?: React.ReactNode
  items?: NavItem[]
  roles?: Role[]
}

// This is sample data.
const data: { navMain: NavMain[] } = {
  navMain: [
    {
      title: "Permohonan Dana (PPD)",
      url: "/dashboard/ppd",
      icon: <FileTextIcon className="size-4" />,
    },
    {
      title: "Department",
      url: "/dashboard/department",
      icon: <RowsIcon className="size-4" />,
    },
   
    {
      title: "Kelola Pengguna",
      url: "/dashboard/users",
      icon: <UsersIcon className="size-4" />,
      roles: [Role.ADMIN], // Hanya role ADMIN
    },
  ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: { role: string } | null }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <RowsIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">ERP Bazma</span>
                <span className="text-xs text-muted-foreground">v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => {
              // Jika item memiliki pembatasan roles, periksa apakah user memiliki role tersebut
              if (item.roles && (!user || !item.roles.includes(user.role as Role))) {
                return null;
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} className="font-medium flex items-center gap-2" />}
                  >
                    {item.icon}
                    {item.title}
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={subItem.isActive}
                            render={<a href={subItem.url} />}
                          >
                            {subItem.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton
                type="submit"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <SignOutIcon className="size-4" />
                <span>Keluar (Logout)</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
