import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Plane,
  Wallet,
  FileText,
  Settings,
  Building2,
  CreditCard,
  Percent,
  TrendingUp,
  User,
  Calculator,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Vendas", url: "/sales", icon: ShoppingCart },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Contas", url: "/accounts", icon: Wallet },
  { title: "Passagens", url: "/tickets", icon: Plane },
  { title: "Relatórios Financeiros", url: "/reports/financial", icon: TrendingUp },
  { title: "Cotações", url: "/quotes", icon: MessageSquare },
  { title: "Calculadora", url: "/calculator", icon: Calculator },
];

const settingsNavItems = [
  { title: "Meu Perfil", url: "/profile", icon: User },
  { title: "Configurações da Agência", url: "/settings/agency", icon: Building2 },
  { title: "Formas de Pagamento", url: "/settings/payment-methods", icon: CreditCard },
  { title: "Juros do Parcelamento", url: "/settings/payment-interest", icon: Percent },
  { title: "Minhas Companhias", url: "/settings/my-airlines", icon: Plane },
  { title: "Regras dos Programas", url: "/settings/programs", icon: FileText },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        {/* Logo / Brand */}
        <div className="px-4 mb-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold text-foreground">
                Hello Milhas
              </span>
            )}
          </Link>
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        {/* Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Botão de Logout */}
        <div className="mt-auto px-3 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {!isCollapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
