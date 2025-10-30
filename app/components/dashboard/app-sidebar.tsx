import {
  LayoutDashboard,
  Trophy,
  Wallet,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Building2,
  ShoppingCart,
  TrendingUp,
  Bitcoin,
  Briefcase,
  Store,
  Dice5,
  Bolt,
  Shield,
} from "lucide-react";
import { Link } from "react-router";
import { NavMain } from "./nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { UserButton } from "@clerk/react-router";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const baseNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Portfolio",
    url: "/portfolio",
    icon: Briefcase,
  },
  {
    title: "Stocks",
    url: "/stocks",
    icon: TrendingUp,
  },
  {
    title: "Crypto",
    url: "/crypto",
    icon: Bitcoin,
  },
  {
    title: "Marketplace",
    url: "/marketplace",
    icon: ShoppingCart,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Wallet,
  },
  {
    title: "Transfers",
    url: "/transfers",
    icon: ArrowLeftRight,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: Receipt,
  },
  {
    title: "Loans",
    url: "/loans",
    icon: CreditCard,
  },
  {
    title: "Companies",
    url: "/companies",
    icon: Building2,
  },
  {
    title: "Company Marketplace",
    url: "/company-marketplace",
    icon: Store,
  },
  {
    title: "Casino",
    url: "/gamble",
    icon: Dice5,
  },
  {
    title: "Upgrades",
    url: "/upgrades",
    icon: Bolt,
  },
];

export function AppSidebar({
  variant,
  user,
}: {
  variant: "sidebar" | "floating" | "inset";
  user: any;
}) {
  // @ts-ignore - moderation API will be available after Convex regenerates types
  const moderationAccess = useQuery(api.moderation?.checkModerationAccess);

  // Add moderation panel link if user is mod or admin
  const navItems = moderationAccess?.hasAccess
    ? [
        ...baseNavItems,
        {
          title: "Mod Panel",
          url: "/panel",
          icon: Shield,
        },
      ]
    : baseNavItems;

  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/" prefetch="viewport">
              <div className="flex items-center gap-2 py-1">
                {/* Optimized light/dark logos */}
                <img
                  src="/betav1-light.png"
                  alt="Quickbuck"
                  width="120"
                  height="28"
                  className="dark:hidden block"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <img
                  src="/betav1-dark.png"
                  alt="Quickbuck"
                  width="120"
                  height="28"
                  className="hidden dark:block"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
