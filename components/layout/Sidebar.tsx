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
    <div className="w-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white min-h-screen flex flex-col shadow-2xl border-r border-slate-700/50">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold">CM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Chit Manager
            </h1>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/30"
                  : "hover:bg-slate-700/50 text-slate-200 hover:text-white"
              }`}
            >
              <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 text-slate-200 hover:text-white transition-all duration-200 group"
        >
          <span className="text-lg transition-transform duration-200 group-hover:scale-110">🚪</span>
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
