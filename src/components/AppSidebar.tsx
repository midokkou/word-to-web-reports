import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  BarChart3,
  FolderOpen,
  ListTodo,
  ChevronDown,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  FileBarChart,
  ListChecks,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

const taskItems = [
  { title: "المهام اليومية", url: "/tasks/daily", icon: CalendarDays },
  { title: "المهام الأسبوعية", url: "/tasks/weekly", icon: CalendarRange },
  { title: "المهام الشهرية", url: "/tasks/monthly", icon: CalendarCheck },
];

const statsItems = [
  { title: "إحصاءات الاستمارات", url: "/stats", icon: FileBarChart },
  { title: "إحصاءات المهام", url: "/stats/tasks", icon: ListChecks },
];

export function AppSidebar() {
  const currentPath = useRouterState({
    select: (r) => r.location.pathname,
  });
  const [tasksOpen, setTasksOpen] = useState(currentPath.startsWith("/tasks"));
  const [statsOpen, setStatsOpen] = useState(currentPath.startsWith("/stats"));

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === "/"}>
                  <Link to="/" className="flex items-center gap-2">
                    <ClipboardList className="size-4" />
                    <span>الشاشة الرئيسية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === "/records"}>
              <Link to="/records" className="flex items-center gap-2">
                <FolderOpen className="size-4" />
                <span>السجلات</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton isActive={currentPath.startsWith("/stats")}>
                  <BarChart3 className="size-4" />
                  <span>الإحصائيات</span>
                  <ChevronDown className={`mr-auto size-4 transition-transform ${statsOpen ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {statsItems.map((s) => (
                    <SidebarMenuSubItem key={s.url}>
                      <SidebarMenuSubButton asChild isActive={currentPath === s.url}>
                        <Link to={s.url} className="flex items-center gap-2">
                          <s.icon className="size-4" />
                          <span>{s.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
