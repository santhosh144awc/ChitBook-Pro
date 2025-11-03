"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "Reports", href: "/reports", icon: "📈" },
  { name: "Auctions", href: "/auctions", icon: "🔨" },
  { name: "Payments", href: "/payments", icon: "💰" },
  { name: "Bulk Pay", href: "/bulk-pay", icon: "💳" },
  { name: "Clients", href: "/clients", icon: "👥" },
  { name: "Groups", href: "/groups", icon: "🏢" },
  { name: "Rollback", href: "/rollback", icon: "↩️" },
  { name: "Memberships", href: "/memberships", icon: "🔗" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="w-64 bg-gradient-to-b from-primary-700 to-primary-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-600">
        <h1 className="text-2xl font-bold">ChitBook Pro</h1>
        <p className="text-primary-200 text-sm mt-1">Chit Fund Management</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-white text-primary-700 font-semibold"
                  : "hover:bg-primary-600 text-primary-100"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-600">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-600 text-primary-100 transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
