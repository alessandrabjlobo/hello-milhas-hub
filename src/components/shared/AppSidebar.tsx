// src/components/shared/AppSidebar.tsx
import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Ticket,
  CreditCard,
  Building2,
  Settings,
  Plane,
  FileText,
  Shield,
  Calculator,
  LogOut,
  Percent,
  User,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const toolsNavItems = [
  { title: "Calculadora de Milhas", url: "/calculator", icon: Calculator },
  { title: "Gerar Orçamento", url: "/quotes/new", icon: FileText },
  { title: "Histórico de Orçamentos", url: "/quotes", icon: List },
];

// 🔻 Aqui agora só tem Relatórios Financeiros
const reportsNavItems = [
  { title: "Relatórios Financeiros", url: "/reports/financial", icon: FileText },
];

// Configurações – agora só "Meu Perfil" fica como item direto
const settingsProfileItem = { title: "Meu Perfil", url: "/profile", icon: User };

// Esses vão para o submenu "Operação de Vendas"
const settingsOperationsItems = [
  { title: "Regras de Programas", url: "/settings/programs", icon: Plane },
  { title: "Formas de Pagamento", url: "/settings/payment-methods", icon: CreditCard },
  { title: "Juros - Débito/Crédito", url: "/settings/payment-interest", icon: Percent },
];

const legalNavItems = [
  { title: "Termos de Uso", url: "/legal/terms", icon: FileText },
  { title: "Política de Privacidade", url: "/legal/privacy", icon: Shield },
];

const adminNavItems = [
  { title: "Usuários", url: "/admin/users", icon: Shield },
];

const linkBase =
  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors";
const linkActive = "bg-muted text-primary font-medium";
const linkInactive =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function ItemLink({
  to,
  icon: Icon,
  title,
  collapsed,
  exact = false,
}: {
  to: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  title: string;
  collapsed: boolean;
  exact?: boolean;
}) {
  const location = useLocation();
  const isActivePath = exact
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={to}
          aria-current={isActivePath ? "page" : undefined}
          className={`${linkBase} ${isActivePath ? linkActive : linkInactive}`}
        >
          <Icon className="h-4 w-4" />
          {!collapsed && <span>{title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const location = useLocation();

  const userName =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const userEmail = user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const isPathActive = React.useCallback(
    (path: string, exact = false) =>
      exact
        ? location.pathname === path
        : location.pathname === path ||
          location.pathname.startsWith(path + "/"),
    [location.pathname],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada com sucesso");
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      {/* Cabeçalho com usuário */}
      <div className="p-3 border-b bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        {/* Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                  exact
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Vendas */}
        <SidebarGroup>
          <SidebarGroupLabel>Vendas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operações */}
        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ferramentas */}
        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Relatórios */}
        <SidebarGroup>
          <SidebarGroupLabel>Relatórios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Configurações</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Meu Perfil (dados pessoais, agência e assinatura) */}
              <ItemLink
                to={settingsProfileItem.url}
                icon={settingsProfileItem.icon}
                title={settingsProfileItem.title}
                collapsed={collapsed}
              />

              {/* Operação de Vendas (submenu) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={`${linkBase} ${linkInactive}`}
                  asChild
                >
                  <button type="button">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Operação de Vendas</span>}
                  </button>
                </SidebarMenuButton>

                <SidebarMenuSub>
                  {settingsOperationsItems.map((item) => (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isPathActive(item.url)}
                      >
                        <NavLink
                          to={item.url}
                          aria-current={
                            isPathActive(item.url) ? "page" : undefined
                          }
                          className="flex items-center gap-2 text-xs px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground"
                        >
                          <item.icon className="h-3 w-3" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <ItemLink
                    key={item.url}
                    to={item.url}
                    icon={item.icon}
                    title={item.title}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Legal */}
        <SidebarGroup>
          <SidebarGroupLabel>Legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalNavItems.map((item) => (
                <ItemLink
                  key={item.url}
                  to={item.url}
                  icon={item.icon}
                  title={item.title}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={`${linkBase} ${linkInactive}`}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
