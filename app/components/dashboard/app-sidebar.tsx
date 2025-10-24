import {
  IconDashboard,
  IconTrophy,
  IconWallet,
  IconArrowsLeftRight,
  IconReceipt,
  IconCreditCard,
  IconBuilding,
  IconShoppingCart,
  IconTrendingUp,
  IconCurrencyBitcoin,
  IconBriefcase,
  IconBuildingStore,
  IconDice,
  IconBolt,
} from "@tabler/icons-react";
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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: IconTrophy,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: IconWallet,
    },
    {
      title: "Transfers",
      url: "/transfers",
      icon: IconArrowsLeftRight,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: IconReceipt,
    },
    {
      title: "Loans",
      url: "/loans",
      icon: IconCreditCard,
    },
    {
      title: "Manage Companies",
      url: "/companies",
      icon: IconBuilding,
    },
    {
      title: "Marketplace",
      url: "/marketplace",
      icon: IconShoppingCart,
    },
    {
      title: "Stocks",
      url: "/stocks",
      icon: IconTrendingUp,
    },
    {
      title: "Crypto",
      url: "/crypto",
      icon: IconCurrencyBitcoin,
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: IconBriefcase,
    },
    {
      title: "Company Sales",
      url: "/company-sales",
      icon: IconBuildingStore,
    },
    {
      title: "Casino",
      url: "/gamble",
      icon: IconDice,
    },
    {
      title: "Upgrades",
      url: "/upgrades",
      icon: IconBolt,
    },
  ],
};

export function AppSidebar({
  variant,
  user,
}: {
  variant: "sidebar" | "floating" | "inset";
  user: any;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/" prefetch="viewport">
              <span className="text-base font-semibold">Quickbuck</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex justify-center">
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
