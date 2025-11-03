"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getClients, getGroups, getPayments, getPaymentLogs, getAuctions } from "@/lib/firestore";
import { formatCurrency, getCurrentMonth, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Payment, Auction, PaymentLog } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeGroups: 0,
    totalChitValue: 0,
    totalPendingDues: 0,
    paidThisMonth: 0,
    onlinePayments: 0,
    cashPayments: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  // Payment pending section states
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [pendingMonthFilter, setPendingMonthFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"auctionDate" | "groupName" | "chitMonth" | "totalPending">("auctionDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        const [clients, groups, payments, paymentLogs, auctions] = await Promise.all([
          getClients(user.uid),
          getGroups(user.uid),
          getPayments(user.uid),
          getPaymentLogs(user.uid),
          getAuctions(user.uid),
        ]);
        
        setAllPayments(payments);
        setAllAuctions(auctions);
        setPaymentLogs(paymentLogs);

        const totalChitValue = groups.reduce((sum, g) => sum + g.chitValue, 0);
        const totalPendingDues = payments
          .filter((p) => p.status !== "Paid")
          .reduce((sum, p) => sum + p.pendingAmount, 0);

        const currentMonthStart = new Date(selectedMonth + "-01");
        const currentMonthEnd = new Date(
          currentMonthStart.getFullYear(),
          currentMonthStart.getMonth() + 1,
          0
        );
        const monthPaymentLogs = paymentLogs.filter((log) => {
          const logDate = log.paymentDate.toDate();
          return logDate >= currentMonthStart && logDate <= currentMonthEnd;
        });
        
        const paidThisMonth = monthPaymentLogs.reduce((sum, log) => sum + log.amountPaid, 0);
        const onlinePayments = monthPaymentLogs
          .filter((log) => log.paymentMethod === "Online")
          .reduce((sum, log) => sum + log.amountPaid, 0);
        const cashPayments = monthPaymentLogs
          .filter((log) => log.paymentMethod === "Cash")
          .reduce((sum, log) => sum + log.amountPaid, 0);

        setStats({
          totalClients: clients.length,
          activeGroups: groups.length,
          totalChitValue,
          totalPendingDues,
          paidThisMonth,
          onlinePayments,
          cashPayments,
        });
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, selectedMonth]);

  // Get unique months from payments for the filter
  const uniqueMonths = useMemo(() => {
    const months = [...new Set(allPayments.map(p => p.chitMonth))].sort().reverse();
    return months;
  }, [allPayments]);

  // Process pending payments by group and month
  const pendingByGroup = useMemo(() => {
    // Filter by pending month filter
    let filteredPayments = allPayments.filter((p) => p.status !== "Paid");
    
    if (pendingMonthFilter !== "all") {
      filteredPayments = filteredPayments.filter(
        (p) => p.chitMonth === pendingMonthFilter
      );
    }

    // Create a map of auctionId to auction for quick lookup
    const auctionMap = new Map<string, Auction>();
    allAuctions.forEach(auction => {
      auctionMap.set(auction.id, auction);
    });

    // Group by groupId + chitMonth combination
    const pendingByGroupMonthMap = new Map<string, { 
      groupName: string; 
      chitMonth: string;
      auctionDate: Date | null;
      membersPending: Set<string>;
      totalPending: number; 
      groupId: string;
    }>();
    
    filteredPayments.forEach((payment) => {
      // Create a unique key for group + month combination
      const key = `${payment.groupId}_${payment.chitMonth}`;
      const existing = pendingByGroupMonthMap.get(key);
      const auction = auctionMap.get(payment.auctionId);
      
      if (existing) {
        existing.totalPending += payment.pendingAmount;
        existing.membersPending.add(payment.clientId);
        // Keep the earliest auction date if multiple payments exist
        if (auction && (!existing.auctionDate || auction.auctionDate.toDate() < existing.auctionDate)) {
          existing.auctionDate = auction.auctionDate.toDate();
        }
      } else {
        const membersSet = new Set<string>();
        membersSet.add(payment.clientId);
        pendingByGroupMonthMap.set(key, {
          groupName: payment.groupName,
          chitMonth: payment.chitMonth,
          auctionDate: auction ? auction.auctionDate.toDate() : null,
          membersPending: membersSet,
          totalPending: payment.pendingAmount,
          groupId: payment.groupId,
        });
      }
    });

    // Convert to array and calculate member counts
    return Array.from(pendingByGroupMonthMap.values())
      .map(item => ({
        groupName: item.groupName,
        chitMonth: item.chitMonth,
        auctionDate: item.auctionDate,
        membersPending: item.membersPending.size,
        totalPending: item.totalPending,
        groupId: item.groupId,
      }));
  }, [allPayments, allAuctions, pendingMonthFilter]);

  // Sort pending by group data
  const sortedPendingByGroup = useMemo(() => {
    const sorted = [...pendingByGroup];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "auctionDate":
          aValue = a.auctionDate?.getTime() || 0;
          bValue = b.auctionDate?.getTime() || 0;
          break;
        case "groupName":
          aValue = a.groupName;
          bValue = b.groupName;
          break;
        case "chitMonth":
          aValue = a.chitMonth;
          bValue = b.chitMonth;
          break;
        case "totalPending":
          aValue = a.totalPending;
          bValue = b.totalPending;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
    return sorted;
  }, [pendingByGroup, sortField, sortDirection]);

  // Paginate sorted data
  const totalPages = Math.ceil(sortedPendingByGroup.length / itemsPerPage);
  const paginatedPendingByGroup = sortedPendingByGroup.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [pendingMonthFilter, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortButton = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-primary-600"
    >
      {children}
      {sortField === field && (
        <span className="text-xs">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: "👥",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Active Groups",
      value: stats.activeGroups,
      icon: "🏢",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Total Chit Value",
      value: formatCurrency(stats.totalChitValue),
      icon: "💰",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Total Pending Dues",
      value: formatCurrency(stats.totalPendingDues),
      icon: "⚠️",
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Paid This Month",
      value: formatCurrency(stats.paidThisMonth),
      icon: "✅",
      color: "from-teal-500 to-teal-600",
    },
    {
      title: "Online Payments",
      value: formatCurrency(stats.onlinePayments),
      icon: "💳",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Cash Payments",
      value: formatCurrency(stats.cashPayments),
      icon: "💵",
      color: "from-yellow-500 to-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`card-colored bg-gradient-to-br ${card.color} transform hover:scale-105 transition-transform`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{card.icon}</span>
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Payment Pending by Group</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Month Filter:</label>
            <select
              value={pendingMonthFilter}
              onChange={(e) => setPendingMonthFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sortedPendingByGroup.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {pendingMonthFilter !== "all" ? "No pending payments for the selected month" : "No pending payments"}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="groupName">Group Name</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="auctionDate">Auction Date</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="chitMonth">Auction Month</SortButton>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Members Still Payment Pending</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="totalPending">Total Pending</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPendingByGroup.map((item, index) => (
                    <tr key={`${item.groupId}_${item.chitMonth}_${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.groupName}</td>
                      <td className="py-3 px-4">
                        {item.auctionDate ? formatDate(item.auctionDate) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(item.chitMonth + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{item.membersPending}</td>
                      <td className="py-3 px-4 text-right font-semibold text-primary-700">
                        {formatCurrency(item.totalPending)}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/groups/${item.groupId}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, sortedPendingByGroup.length)} of{" "}
                  {sortedPendingByGroup.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 border rounded-lg ${
                          currentPage === page
                            ? "bg-primary-600 text-white border-primary-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <div className="mt-4">
          <Link href="/payments" className="text-primary-600 hover:text-primary-700 font-medium">
            View all payments →
          </Link>
        </div>
      </div>
    </div>
  );
}
