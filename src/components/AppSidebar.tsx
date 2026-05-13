import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, BarChart3, FolderOpen, ListTodo, ChevronDown, CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const items = [
  { title: "الشاشة الرئيسية", url: "/", icon: ClipboardList },
  { title: "السجلات", url: "/records", icon: FolderOpen },
  { title: "الإحصائيات", url: "/stats", icon: BarChart3 },
];

const taskItems = [
  { title: "المهام اليومية", url: "/tasks/daily", icon: CalendarDays },
  { title: "المهام الأسبوعية", url: "/tasks/weekly", icon: CalendarRange },
  { title: "المهام الشهرية", url: "/tasks/monthly", icon: CalendarCheck },
];

export function AppSidebar() {
  const currentPath = useRouterState({
    select: (r) => r.location.pathname,
  });
  const [tasksOpen, setTasksOpen] = useState(currentPath.startsWith("/tasks"));

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={currentPath.startsWith("/tasks")}>
                      <ListTodo className="size-4" />
                      <span>المهام</span>
                      <ChevronDown className={`mr-auto size-4 transition-transform ${tasksOpen ? "rotate-180" : ""}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {taskItems.map((t) => (
                        <SidebarMenuSubItem key={t.url}>
                          <SidebarMenuSubButton asChild isActive={currentPath === t.url}>
                            <Link to={t.url} className="flex items-center gap-2">
                              <t.icon className="size-4" />
                              <span>{t.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
