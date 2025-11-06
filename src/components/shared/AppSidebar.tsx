import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  List,
  Ticket,
  CreditCard,
  Building2,
  BarChart3,
  Settings,
  Plane,
  FileText,
  DollarSign,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const salesNavItems = [
  { title: "Nova Venda", url: "/sales/new", icon: PlusCircle },
  { title: "Todas as Vendas", url: "/sales", icon: List },
];

const operationsNavItems = [
  { title: "Passagens", url: "/tickets", icon: Ticket },
  { title: "Contas", url: "/accounts", icon: CreditCard },
  { title: "Fornecedores", url: "/suppliers", icon: Building2 },
];

const reportsNavItems = [
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
];

const settingsNavItems = [
  { title: "Minhas Companhias", url: "/settings/my-airlines", icon: Plane },
  { title: "Regras do Programa", url: "/settings/program-rules", icon: FileText },
  { title: "Plano & Pagamento", url: "/settings/billing", icon: DollarSign },
];

const legalNavItems = [
  { title: "Termos de Uso", url: "/legal/terms", icon: FileText },
  { title: "Política de Privacidade", url: "/legal/privacy", icon: Shield },
];

const adminNavItems = [
  { title: "Usuários", url: "/admin/users", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Vendas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={isActive(item.url) ? "bg-muted text-primary font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
