"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPayments,
  getClients,
  getGroups,
  getGroupMembers,
  getPaymentLogs,
  getAuctions,
} from "@/lib/firestore";
import type { Payment, Client, PaymentLog, Group, Auction, GroupMember } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency, isOverdue, getCurrentMonth } from "@/lib/utils";
import Pagination from "@/components/common/Pagination";
import SortButton from "@/components/common/SortButton";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "client">("pending");

  // Pending Payments Report
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [pendingFilters, setPendingFilters] = useState({
    groupId: "",
    daysOverdue: "",
    month: "", // Default to all months to show all data
  });
  const [pendingSortField, setPendingSortField] = useState<"clientName" | "groupName" | "chitMonth" | "pendingAmount" | "paymentDueDate" | "status">("paymentDueDate");
  const [pendingSortDirection, setPendingSortDirection] = useState<"asc" | "desc">("asc");
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const pendingItemsPerPage = 10;

  // Client Activity Report
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isClientInputFocused, setIsClientInputFocused] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [clientGroups, setClientGroups] = useState<Array<{ groupName: string; chitCount: number }>>([]);
  const [clientPendingByGroup, setClientPendingByGroup] = useState<Array<{
    groupName: string;
    groupId: string;
    chitMonth: string;
    auctionValue: number;
    chitCount: number;
    amountDue: number;
    amountPaid: number;
    totalPending: number;
  }>>([]);
  const [clientPaymentHistory, setClientPaymentHistory] = useState<PaymentLog[]>([]);
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [clientGroupMembers, setClientGroupMembers] = useState<GroupMember[]>([]);
  const [clientGroupsSortField, setClientGroupsSortField] = useState<"groupName" | "chitCount">("groupName");
  const [clientGroupsSortDirection, setClientGroupsSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "client" && selectedClientId) {
      loadClientReport();
    }
  }, [selectedClientId, selectedMonth, activeTab, allAuctions, allGroups]);

  // Handle click outside to close client dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node) &&
        clientInputRef.current &&
        !clientInputRef.current.contains(event.target as Node)
      ) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    // Sort clients alphabetically
    const sortedClients = [...allClients].sort((a, b) => a.name.localeCompare(b.name));
    
    // If no search term, show first 50 clients
    if (!clientSearchTerm) {
      return sortedClients.slice(0, 50);
    }
    
    // If search term matches selected client name exactly, show all (user might want to change)
    const selectedClient = selectedClientId ? allClients.find(c => c.id === selectedClientId) : null;
    if (selectedClient && clientSearchTerm === selectedClient.name && showClientDropdown) {
      // When focused and showing exact selected client name, show all for easy switching
      return sortedClients.slice(0, 50);
    }
    
    // Otherwise filter by search term
    return sortedClients.filter((client) =>
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      client.phone.includes(clientSearchTerm) ||
      client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
  }, [allClients, clientSearchTerm, selectedClientId, showClientDropdown]);

  // Sort client groups
  const sortedClientGroups = useMemo(() => {
    const sorted = [...clientGroups];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (clientGroupsSortField === "groupName") {
        aValue = a.groupName.toLowerCase();
        bValue = b.groupName.toLowerCase();
      } else {
        aValue = a.chitCount;
        bValue = b.chitCount;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return clientGroupsSortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return clientGroupsSortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
    return sorted;
  }, [clientGroups, clientGroupsSortField, clientGroupsSortDirection]);

  // Calculate totals for pending by group footer
  const pendingByGroupTotals = useMemo(() => {
    const totalAmountPaid = clientPendingByGroup.reduce((sum, item) => sum + item.amountPaid, 0);
    const totalPending = clientPendingByGroup.reduce((sum, item) => sum + item.totalPending, 0);
    return { totalAmountPaid, totalPending };
  }, [clientPendingByGroup]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payments, groups, clients, auctions] = await Promise.all([
        getPayments(user!.uid),
        getGroups(user!.uid),
        getClients(user!.uid),
        getAuctions(user!.uid),
      ]);

      setAllPayments(payments);
      setAllGroups(groups);
      setAllClients(clients);
      setAllAuctions(auctions);
    } catch (error: any) {
      console.error("Error loading reports data:", error);
      toast.error(error?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Get unique months from payments
  const uniqueMonths = useMemo(() => {
    const months = [...new Set(allPayments.map(p => p.chitMonth))].sort().reverse();
    return months;
  }, [allPayments]);

  // Filter, sort, and paginate pending payments
  const processedPendingPayments = useMemo(() => {
    let filtered = allPayments.filter((p) => p.status !== "Paid");

    // Filter by group
    if (pendingFilters.groupId) {
      filtered = filtered.filter((p) => p.groupId === pendingFilters.groupId);
    }

    // Filter by month
    if (pendingFilters.month) {
      filtered = filtered.filter((p) => p.chitMonth === pendingFilters.month);
    }

    // Filter by days overdue
    if (pendingFilters.daysOverdue) {
      const days = parseInt(pendingFilters.daysOverdue);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      filtered = filtered.filter((p) => {
        const dueDate = p.paymentDueDate.toDate();
        return dueDate < cutoffDate;
      });
    }

    // Sort payments
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (pendingSortField) {
        case "clientName":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case "groupName":
          aValue = a.groupName.toLowerCase();
          bValue = b.groupName.toLowerCase();
          break;
        case "chitMonth":
          aValue = a.chitMonth;
          bValue = b.chitMonth;
          break;
        case "pendingAmount":
          aValue = a.pendingAmount;
          bValue = b.pendingAmount;
          break;
        case "paymentDueDate":
          aValue = a.paymentDueDate.toMillis();
          bValue = b.paymentDueDate.toMillis();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return pendingSortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return pendingSortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [allPayments, pendingFilters, pendingSortField, pendingSortDirection]);

  // Calculate total pending amount
  const totalPendingAmount = useMemo(() => {
    return processedPendingPayments.reduce((sum, p) => sum + p.pendingAmount, 0);
  }, [processedPendingPayments]);

  // Paginate sorted payments
  const pendingTotalPages = Math.ceil(processedPendingPayments.length / pendingItemsPerPage);
  const paginatedPendingPayments = processedPendingPayments.slice(
    (pendingCurrentPage - 1) * pendingItemsPerPage,
    pendingCurrentPage * pendingItemsPerPage
  );

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setPendingCurrentPage(1);
  }, [pendingFilters, pendingSortField, pendingSortDirection]);

  const handlePendingSort = (field: typeof pendingSortField) => {
    if (pendingSortField === field) {
      setPendingSortDirection(pendingSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPendingSortField(field);
      setPendingSortDirection("asc");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pending Payments Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .overdue { background-color: #ffebee; }
            .total-row { font-weight: bold; background-color: #e3f2fd; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Pending Payments Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          ${pendingFilters.groupId ? `<p><strong>Group:</strong> ${allGroups.find(g => g.id === pendingFilters.groupId)?.groupName || 'All'}</p>` : ''}
          ${pendingFilters.month ? `<p><strong>Month:</strong> ${new Date(pendingFilters.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>` : ''}
          ${pendingFilters.daysOverdue ? `<p><strong>Days Overdue:</strong> ${pendingFilters.daysOverdue}+ days</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Group</th>
                <th>Month</th>
                <th>Pending Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${processedPendingPayments.map((payment) => {
                const overdue = isOverdue(payment.paymentDueDate);
                return `
                  <tr class="${overdue ? 'overdue' : ''}">
                    <td>${payment.clientName}</td>
                    <td>${payment.groupName}</td>
                    <td>${payment.chitMonth}</td>
                    <td>${formatCurrency(payment.pendingAmount)}</td>
                    <td>${formatDate(payment.paymentDueDate)}</td>
                    <td>${payment.status}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total</strong></td>
                <td><strong>${formatCurrency(totalPendingAmount)}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Total Records: ${processedPendingPayments.length}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const loadClientReport = async () => {
    try {
      // Get all groups for this client
      const memberships = await getGroupMembers(user!.uid);
      const clientMemberships = memberships.filter(
        (m) => m.clientId === selectedClientId
      );
      setClientGroupMembers(clientMemberships);
      setClientGroups(
        clientMemberships.map((m) => ({
          groupName: m.groupName,
          chitCount: m.chitCount,
        }))
      );

      // Get pending by group with detailed information
      const payments = await getPayments(user!.uid, { clientId: selectedClientId });
      const allPaymentsForClient = payments;
      const pendingPayments = payments.filter((p) => p.status !== "Paid");

      // Group by groupId and chitMonth to get detailed breakdown
      const pendingByGroupMap = new Map<string, {
        groupId: string;
        groupName: string;
        chitMonth: string;
        auctionValue: number;
        chitCount: number;
        amountDue: number;
        amountPaid: number;
        totalPending: number;
        auctionDate: Date | null;
      }>();

      pendingPayments.forEach((p) => {
        const key = `${p.groupId}_${p.chitMonth}`;
        const existing = pendingByGroupMap.get(key);
        const membership = clientMemberships.find((m) => m.groupId === p.groupId);
        const auction = allAuctions.find((a) => a.id === p.auctionId);
        
        if (existing) {
          existing.totalPending += p.pendingAmount;
          existing.amountPaid += p.amountPaid;
          existing.amountDue += p.amountExpected;
        } else {
          pendingByGroupMap.set(key, {
            groupId: p.groupId,
            groupName: p.groupName,
            chitMonth: p.chitMonth,
            auctionValue: auction?.perMemberContribution || 0,
            chitCount: membership?.chitCount || 0,
            amountDue: p.amountExpected,
            amountPaid: p.amountPaid,
            totalPending: p.pendingAmount,
            auctionDate: auction ? auction.auctionDate.toDate() : null,
          });
        }
      });

      // Also calculate totals for paid payments to show in footer
      const paidPayments = allPaymentsForClient.filter((p) => p.status === "Paid" || p.status === "Partial");
      paidPayments.forEach((p) => {
        const key = `${p.groupId}_${p.chitMonth}`;
        const existing = pendingByGroupMap.get(key);
        if (existing) {
          // Already counted in pending
        } else {
          // This is a fully paid group/month, add it for completeness
          const membership = clientMemberships.find((m) => m.groupId === p.groupId);
          const auction = allAuctions.find((a) => a.id === p.auctionId);
          pendingByGroupMap.set(key, {
            groupId: p.groupId,
            groupName: p.groupName,
            chitMonth: p.chitMonth,
            auctionValue: auction?.perMemberContribution || 0,
            chitCount: membership?.chitCount || 0,
            amountDue: p.amountExpected,
            amountPaid: p.amountPaid,
            totalPending: p.pendingAmount,
            auctionDate: auction ? auction.auctionDate.toDate() : null,
          });
        }
      });

      const pendingByGroup = Array.from(pendingByGroupMap.values()).map((item) => {
        // Format group name with month/year in short form
        let monthYear = "";
        if (item.chitMonth) {
          const date = new Date(item.chitMonth + "-01");
          monthYear = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else if (item.auctionDate) {
          monthYear = item.auctionDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }
        
        const groupNameWithMonth = monthYear 
          ? `${item.groupName} (${monthYear})`
          : item.groupName;

        return {
          groupName: groupNameWithMonth,
          groupId: item.groupId,
          chitMonth: item.chitMonth,
          auctionValue: item.auctionValue,
          chitCount: item.chitCount,
          amountDue: item.amountDue,
          amountPaid: item.amountPaid,
          totalPending: item.totalPending,
        };
      });

      setClientPendingByGroup(pendingByGroup);

      // Get payment history for selected month
      if (selectedMonth) {
        try {
          const logs = await getPaymentLogs(user!.uid, {
            clientId: selectedClientId,
          });
          // Filter by month manually since getPaymentLogs month filter might not work correctly
          const filteredLogs = logs.filter((log) => {
            const logMonth = log.paymentDate.toDate().toISOString().slice(0, 7);
            return logMonth === selectedMonth;
          });
          setClientPaymentHistory(filteredLogs);
        } catch (logError: any) {
          console.error("Error loading payment logs:", logError);
          toast.error(logError?.message || "Failed to load payment history");
          setClientPaymentHistory([]);
        }
      } else {
        setClientPaymentHistory([]);
      }
    } catch (error: any) {
      console.error("Error loading client report:", error);
      toast.error(error?.message || "Failed to load client report");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Reports</h1>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "pending"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Pending Payments Report
        </button>
        <button
          onClick={() => setActiveTab("client")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "client"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Client Activity Report
        </button>
      </div>

      {/* Pending Payments Report */}
      {activeTab === "pending" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Payments Report</h2>
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2"
            >
              <span>🖨️</span>
              Print Report
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month</label>
              <select
                value={pendingFilters.month}
                onChange={(e) =>
                  setPendingFilters({ ...pendingFilters, month: e.target.value })
                }
                className="input-field"
              >
                <option value="">All Months</option>
                {uniqueMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Group</label>
              <select
                value={pendingFilters.groupId}
                onChange={(e) =>
                  setPendingFilters({ ...pendingFilters, groupId: e.target.value })
                }
                className="input-field"
              >
                <option value="">All Groups</option>
                {allGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Overdue
              </label>
              <select
                value={pendingFilters.daysOverdue}
                onChange={(e) =>
                  setPendingFilters({ ...pendingFilters, daysOverdue: e.target.value })
                }
                className="input-field"
              >
                <option value="">All Overdue</option>
                <option value="7">7+ days</option>
                <option value="15">15+ days</option>
                <option value="30">30+ days</option>
                <option value="60">60+ days</option>
                <option value="90">90+ days</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="bg-gray-50 rounded-lg p-3 w-full">
                <p className="text-sm text-gray-600">Total Results</p>
                <p className="text-lg font-semibold">{processedPendingPayments.length}</p>
              </div>
            </div>
          </div>

          {processedPendingPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending payments found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="clientName"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Client
                        </SortButton>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="groupName"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Group
                        </SortButton>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="chitMonth"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Month
                        </SortButton>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="pendingAmount"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Pending Amount
                        </SortButton>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="paymentDueDate"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Due Date
                        </SortButton>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <SortButton
                          field="status"
                          currentField={pendingSortField}
                          direction={pendingSortDirection}
                          onSort={handlePendingSort}
                        >
                          Status
                        </SortButton>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPendingPayments.map((payment) => {
                      const overdue = isOverdue(payment.paymentDueDate);
                      return (
                        <tr
                          key={payment.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            overdue ? "bg-red-50" : ""
                          }`}
                        >
                          <td className="py-3 px-4">{payment.clientName}</td>
                          <td className="py-3 px-4">{payment.groupName}</td>
                          <td className="py-3 px-4">{payment.chitMonth}</td>
                          <td
                            className={`py-3 px-4 font-semibold ${overdue ? "text-danger-600" : ""}`}
                          >
                            {formatCurrency(payment.pendingAmount)}
                          </td>
                          <td
                            className={`py-3 px-4 ${overdue ? "text-danger-600 font-semibold" : ""}`}
                          >
                            {formatDate(payment.paymentDueDate)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payment.status === "Partial"
                                  ? "bg-warning-100 text-warning-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="border-t-2 border-gray-300 bg-primary-50">
                      <td className="py-3 px-4 font-bold" colSpan={3}>
                        Total Pending Amount
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-700 text-lg">
                        {formatCurrency(totalPendingAmount)}
                      </td>
                      <td className="py-3 px-4" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={pendingCurrentPage}
                totalPages={pendingTotalPages}
                totalItems={processedPendingPayments.length}
                itemsPerPage={pendingItemsPerPage}
                onPageChange={setPendingCurrentPage}
                itemName="payments"
              />
            </>
          )}
        </div>
      )}

      {/* Client Activity Report */}
      {activeTab === "client" && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Client Activity Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <input
                ref={clientInputRef}
                type="text"
                value={clientSearchTerm || (selectedClientId ? allClients.find(c => c.id === selectedClientId)?.name || "" : "")}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientSearchTerm(value);
                  setShowClientDropdown(true);
                  // Clear selection if user is typing something different
                  if (value && selectedClientId) {
                    const selectedClient = allClients.find(c => c.id === selectedClientId);
                    if (selectedClient && value !== selectedClient.name) {
                      setSelectedClientId("");
                    }
                  } else if (!value) {
                    setSelectedClientId("");
                  }
                }}
                onFocus={() => {
                  setIsClientInputFocused(true);
                  setShowClientDropdown(true);
                  // When focused, if a client is selected, temporarily clear search to show all
                  if (selectedClientId) {
                    const selectedClient = allClients.find(c => c.id === selectedClientId);
                    if (selectedClient && clientSearchTerm === selectedClient.name) {
                      // Keep the search term as is so the input shows the selected client name
                      // The dropdown will show all clients because of the filter logic
                    }
                  }
                }}
                onBlur={() => {
                  setIsClientInputFocused(false);
                  // Small delay to allow click on dropdown item
                  setTimeout(() => {
                    if (selectedClientId) {
                      const selectedClient = allClients.find(c => c.id === selectedClientId);
                      if (selectedClient) {
                        setClientSearchTerm(selectedClient.name);
                      }
                    }
                    setShowClientDropdown(false);
                  }, 200);
                }}
                className="input-field"
                placeholder="Type to search client..."
              />
              {showClientDropdown && (
                <div
                  ref={clientDropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setClientSearchTerm(client.name);
                        setShowClientDropdown(false);
                      }}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.phone} {client.email && `• ${client.email}`}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-500 text-sm">No clients found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Month *
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {selectedClientId && (
            <div className="space-y-6">
              {/* Groups Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Groups</h3>
                {sortedClientGroups.length === 0 ? (
                  <p className="text-gray-500">Client is not in any groups.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                            <button
                              onClick={() => {
                                if (clientGroupsSortField === "groupName") {
                                  setClientGroupsSortDirection(
                                    clientGroupsSortDirection === "asc" ? "desc" : "asc"
                                  );
                                } else {
                                  setClientGroupsSortField("groupName");
                                  setClientGroupsSortDirection("asc");
                                }
                              }}
                              className="flex items-center gap-1 hover:text-primary-600"
                            >
                              Group Name
                              {clientGroupsSortField === "groupName" && (
                                <span className="text-xs">
                                  {clientGroupsSortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                            <button
                              onClick={() => {
                                if (clientGroupsSortField === "chitCount") {
                                  setClientGroupsSortDirection(
                                    clientGroupsSortDirection === "asc" ? "desc" : "asc"
                                  );
                                } else {
                                  setClientGroupsSortField("chitCount");
                                  setClientGroupsSortDirection("asc");
                                }
                              }}
                              className="flex items-center gap-1 hover:text-primary-600"
                            >
                              Chit Count
                              {clientGroupsSortField === "chitCount" && (
                                <span className="text-xs">
                                  {clientGroupsSortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedClientGroups.map((group, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-sm">{group.groupName}</td>
                            <td className="py-2 px-3 text-sm">{group.chitCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Pending by Group */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Total Pending by Group
                </h3>
                {clientPendingByGroup.length === 0 ? (
                  <p className="text-gray-500">No payments found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                            Group Name
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">
                            Payment Value
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">
                            Chit Count
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">
                            Amount Due
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">
                            Amount Paid
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">
                            Total Pending
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientPendingByGroup
                          .filter((item) => item.totalPending > 0) // Only show rows with pending amounts
                          .map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-sm">{item.groupName}</td>
                              <td className="py-2 px-3 text-sm text-right">
                                {formatCurrency(item.auctionValue)}
                              </td>
                              <td className="py-2 px-3 text-sm text-right">
                                {item.chitCount}
                              </td>
                              <td className="py-2 px-3 text-sm text-right">
                                {formatCurrency(item.amountDue)}
                              </td>
                              <td className="py-2 px-3 text-sm text-right">
                                {formatCurrency(item.amountPaid)}
                              </td>
                              <td className="py-2 px-3 text-sm font-semibold text-right">
                                {formatCurrency(item.totalPending)}
                              </td>
                            </tr>
                          ))}
                        {clientPendingByGroup.filter((item) => item.totalPending > 0).length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-4 px-3 text-center text-gray-500">
                              No pending payments.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-primary-50">
                          <td className="py-2 px-3 text-sm font-bold">Total</td>
                          <td className="py-2 px-3 text-sm text-right font-bold">
                            {/* No total for Payment Value */}
                          </td>
                          <td className="py-2 px-3 text-sm text-right font-bold">
                            {/* No total for Chit Count */}
                          </td>
                          <td className="py-2 px-3 text-sm text-right font-bold">
                            {formatCurrency(
                              clientPendingByGroup.reduce((sum, item) => sum + item.amountDue, 0)
                            )}
                          </td>
                          <td className="py-2 px-3 text-sm text-right font-bold text-primary-700">
                            {formatCurrency(pendingByGroupTotals.totalAmountPaid)}
                          </td>
                          <td className="py-2 px-3 text-sm text-right font-bold text-primary-700">
                            {formatCurrency(pendingByGroupTotals.totalPending)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment History</h3>
                {clientPaymentHistory.length === 0 ? (
                  <p className="text-gray-500">No payments found for selected month.</p>
                ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Date
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Group
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Amount
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Method
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientPaymentHistory.map((log) => (
                            <tr key={log.id} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-sm">
                                {formatDate(log.paymentDate)}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {log.groupName}
                              </td>
                              <td className="py-2 px-3 text-sm font-semibold">
                                {formatCurrency(log.amountPaid)}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    log.paymentMethod === "Online"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {log.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          )}

          {!selectedClientId && (
            <p className="text-gray-500 text-center py-8">Please select a client to view report.</p>
          )}
        </div>
      )}
    </div>
  );
}
