"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import {
  LayoutDashboard,
  Users,
  Ticket,
  BarChart3,
  LogOut,
  User,
  Clock,
  FileText,
  Menu,
  X,
  Bell,
  CheckCircle,
  Timer,
  Settings,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import { TimerWidget } from "@/components/timer-widget";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { useGlobalKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    name: "Tickets",
    href: "/dashboard/tickets",
    icon: Ticket,
  },
  {
    name: "Time Entries",
    href: "/dashboard/time-entries",
    icon: Clock,
  },
  {
    name: "Approvals",
    href: "/dashboard/approvals",
    icon: CheckCircle,
  },
  {
    name: "Invoices",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    name: "SLA",
    href: "/dashboard/sla",
    icon: Timer,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    name: "Settings",
    href: "/dashboard/settings/payments",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return profile?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-900/80" aria-hidden="true" />
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
              <div className="flex h-16 items-center justify-between px-6 border-b">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {profile?.tenant?.name || "Ticketing SaaS"}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="mt-6 px-3">
                <ul className="space-y-1">
                  {navigation.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "mr-3 h-5 w-5 flex-shrink-0",
                              isActive
                                ? "text-blue-500"
                                : "text-gray-400 group-hover:text-gray-500"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:shadow-lg">
          <div className="flex h-16 items-center px-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">
              {profile?.tenant?.name || "Ticketing SaaS"}
            </h1>
          </div>

          <nav className="mt-6 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0",
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex-1 lg:flex-none" />

              {/* Timer Widget */}
              <div className="mr-2 sm:mr-4">
                <TimerWidget />
              </div>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {getInitials(profile?.first_name, profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.first_name && profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings/payments">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Payment Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Page content */}
          <main className="p-4 sm:p-6">{children}</main>
        </div>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal />
      </div>
    </AuthGuard>
  );
}
