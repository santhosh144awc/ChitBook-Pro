"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPayments, getPaymentLogs, updatePayment, createPaymentLog, getGroupMembers } from "@/lib/firestore";
import type { Payment, PaymentLog, GroupMember } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

type SortField = "clientName" | "groupName" | "chitMonth" | "amountExpected" | "amountPaid" | "pendingAmount" | "paymentDueDate" | "status";
type SortDirection = "asc" | "desc";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [paidPaymentLogs, setPaidPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    isOnline: false,
    paymentDate: new Date().toISOString().split("T")[0],
  });

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("paymentDueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paidCurrentPage, setPaidCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Sorting state for paid payments
  const [paidSortField, setPaidSortField] = useState<"clientName" | "groupName" | "chitMonth" | "amountPaid" | "paymentDate">("paymentDate");
  const [paidSortDirection, setPaidSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, logsData] = await Promise.all([
        getPayments(user!.uid),
        getPaymentLogs(user!.uid),
      ]);
      setAllPayments(paymentsData);
      // Get latest payment log for each payment (paid payments only)
      const paidPayments = paymentsData.filter(p => p.status === "Paid");
      const paidLogs = paidPayments.map(payment => {
        const paymentLogs = logsData.filter(log => log.paymentId === payment.id);
        // Get the latest payment log for this payment
        const latestLog = paymentLogs.sort((a, b) => 
          b.paymentDate.toMillis() - a.paymentDate.toMillis()
        )[0];
        return latestLog;
      }).filter(log => log !== undefined) as PaymentLog[];
      setPaidPaymentLogs(paidLogs);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      toast.error(error?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  // Get unique groups and clients for filters
  const uniqueGroups = useMemo(() => {
    const groups = [...new Set(allPayments.map(p => p.groupName))].sort();
    return groups;
  }, [allPayments]);

  const uniqueClients = useMemo(() => {
    const clients = [...new Set(allPayments.map(p => p.clientName))].sort();
    return clients;
  }, [allPayments]);

  const uniqueMonths = useMemo(() => {
    const months = [...new Set(allPayments.map(p => p.chitMonth))].sort().reverse();
    return months;
  }, [allPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = allPayments.filter(payment => {
      // Status filter
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }
      
      // Group filter
      if (groupFilter !== "all" && payment.groupName !== groupFilter) {
        return false;
      }
      
      // Client filter
      if (clientFilter !== "all" && payment.clientName !== clientFilter) {
        return false;
      }
      
      // Month filter
      if (monthFilter !== "all" && payment.chitMonth !== monthFilter) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          payment.clientName.toLowerCase().includes(query) ||
          payment.groupName.toLowerCase().includes(query) ||
          payment.chitMonth.toLowerCase().includes(query)
        );
      }
      
      return true;
    });

    // Sort payments
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "clientName":
          aValue = a.clientName;
          bValue = b.clientName;
          break;
        case "groupName":
          aValue = a.groupName;
          bValue = b.groupName;
          break;
        case "chitMonth":
          aValue = a.chitMonth;
          bValue = b.chitMonth;
          break;
        case "amountExpected":
          aValue = a.amountExpected;
          bValue = b.amountExpected;
          break;
        case "amountPaid":
          aValue = a.amountPaid;
          bValue = b.amountPaid;
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
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [allPayments, statusFilter, groupFilter, clientFilter, monthFilter, searchQuery, sortField, sortDirection]);

  // Paginate payments (only for pending/partial)
  const pendingPayments = filteredPayments.filter(p => p.status !== "Paid");
  const totalPages = Math.ceil(pendingPayments.length / itemsPerPage);
  const paginatedPayments = pendingPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, groupFilter, clientFilter, monthFilter, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
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

  const handleOpenPaymentModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentData({
      amount: payment.pendingAmount.toString(),
      isOnline: false,
      paymentDate: new Date().toISOString().split("T")[0],
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setPaymentData({ amount: "", isOnline: false, paymentDate: new Date().toISOString().split("T")[0] });
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    const amountPaid = parseFloat(paymentData.amount);

    if (amountPaid > selectedPayment.pendingAmount) {
      toast.error("Payment amount cannot exceed pending amount");
      return;
    }

    if (amountPaid <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    try {
      const newAmountPaid = selectedPayment.amountPaid + amountPaid;
      const newPendingAmount = selectedPayment.pendingAmount - amountPaid;
      let newStatus: "Pending" | "Partial" | "Paid" = "Partial";

      if (newPendingAmount <= 0) {
        newStatus = "Paid";
      } else if (newAmountPaid === 0) {
        newStatus = "Pending";
      }

      // Update payment
      await updatePayment(user!.uid, selectedPayment.id, {
        amountPaid: newAmountPaid,
        pendingAmount: Math.max(0, newPendingAmount),
        status: newStatus,
      });

      // Create payment log with specified payment date
      const paymentTimestamp = Timestamp.fromDate(new Date(paymentData.paymentDate));
      await createPaymentLog(user!.uid, {
        paymentId: selectedPayment.id,
        clientId: selectedPayment.clientId,
        clientName: selectedPayment.clientName,
        groupName: selectedPayment.groupName,
        chitMonth: selectedPayment.chitMonth,
        amountPaid,
        paymentDate: paymentTimestamp,
        paymentMethod: paymentData.isOnline ? "Online" : "Cash",
      });

      toast.success("Payment recorded successfully");
      handleClosePaymentModal();
      loadData();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      const errorMessage = error?.message || "Failed to record payment";
      toast.error(errorMessage);
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, group, or month..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Groups</option>
              {uniqueGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pending Payments Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending & Partial Payments</h2>
        {pendingPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pending payments found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="clientName">Client</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="groupName">Group</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="chitMonth">Month</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="amountExpected">Total Due</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="amountPaid">Amount Paid</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="pendingAmount">Pending</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="paymentDueDate">Due Date</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="status">Status</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => {
                    const overdue = isOverdue(payment.paymentDueDate);
                    return (
                      <tr
                        key={payment.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          overdue ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{payment.clientName}</td>
                        <td className="py-3 px-4">{payment.groupName}</td>
                        <td className="py-3 px-4">{payment.chitMonth}</td>
                        <td className="py-3 px-4">{formatCurrency(payment.amountExpected)}</td>
                        <td className="py-3 px-4">{formatCurrency(payment.amountPaid)}</td>
                        <td className={`py-3 px-4 font-semibold ${overdue ? "text-danger-600" : ""}`}>
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
                              payment.status === "Paid"
                                ? "bg-success-100 text-success-800"
                                : payment.status === "Partial"
                                ? "bg-warning-100 text-warning-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {payment.status !== "Paid" && (
                            <button
                              onClick={() => handleOpenPaymentModal(payment)}
                              className="btn-primary text-sm py-1 px-3"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, pendingPayments.length)} of{" "}
                  {pendingPayments.length} payments
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
      </div>

      {/* Paid Payments Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Paid Payments</h2>
        {paidPaymentLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No paid payments found.</p>
        ) : (
          <>
            {/* Sort and filter paid payments */}
            {(() => {
              // Sort paid payment logs
              const sortedPaidLogs = [...paidPaymentLogs].sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (paidSortField) {
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
                  case "amountPaid":
                    aValue = a.amountPaid;
                    bValue = b.amountPaid;
                    break;
                  case "paymentDate":
                    aValue = a.paymentDate.toMillis();
                    bValue = b.paymentDate.toMillis();
                    break;
                  default:
                    return 0;
                }

                if (typeof aValue === "string" && typeof bValue === "string") {
                  return paidSortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
                }

                return paidSortDirection === "asc" ? aValue - bValue : bValue - aValue;
              });

              // Paginate sorted logs
              const paidTotalPages = Math.ceil(sortedPaidLogs.length / itemsPerPage);
              const paginatedPaidLogs = sortedPaidLogs.slice(
                (paidCurrentPage - 1) * itemsPerPage,
                paidCurrentPage * itemsPerPage
              );

              const handlePaidSort = (field: typeof paidSortField) => {
                if (paidSortField === field) {
                  setPaidSortDirection(paidSortDirection === "asc" ? "desc" : "asc");
                } else {
                  setPaidSortField(field);
                  setPaidSortDirection("asc");
                }
                setPaidCurrentPage(1); // Reset to page 1 when sorting changes
              };

              const PaidSortButton = ({ field, children }: { field: typeof paidSortField; children: React.ReactNode }) => (
                <button
                  onClick={() => handlePaidSort(field)}
                  className="flex items-center gap-1 hover:text-primary-600"
                >
                  {children}
                  {paidSortField === field && (
                    <span className="text-xs">
                      {paidSortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              );

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            <PaidSortButton field="clientName">Name</PaidSortButton>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            <PaidSortButton field="groupName">Group</PaidSortButton>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            <PaidSortButton field="chitMonth">Auction Month</PaidSortButton>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            <PaidSortButton field="amountPaid">Payment Amount</PaidSortButton>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            <PaidSortButton field="paymentDate">Payment Date</PaidSortButton>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPaidLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{log.clientName}</td>
                            <td className="py-3 px-4">{log.groupName}</td>
                            <td className="py-3 px-4">{log.chitMonth}</td>
                            <td className="py-3 px-4">{formatCurrency(log.amountPaid)}</td>
                            <td className="py-3 px-4">{formatDate(log.paymentDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Paid Payments */}
                  {paidTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Showing {(paidCurrentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(paidCurrentPage * itemsPerPage, sortedPaidLogs.length)} of{" "}
                        {sortedPaidLogs.length} payments
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPaidCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={paidCurrentPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: paidTotalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setPaidCurrentPage(page)}
                              className={`px-3 py-2 border rounded-lg ${
                                paidCurrentPage === page
                                  ? "bg-primary-600 text-white border-primary-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            setPaidCurrentPage((p) =>
                              Math.min(paidTotalPages, p + 1)
                            )
                          }
                          disabled={paidCurrentPage === paidTotalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Make Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Make Payment</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Client: {selectedPayment.clientName}</p>
              <p className="text-sm text-gray-600 mb-1">Group: {selectedPayment.groupName}</p>
              <p className="text-sm text-gray-600 mb-1">Month: {selectedPayment.chitMonth}</p>
              <p className="text-sm font-semibold text-gray-800 mt-2">
                Pending Amount: {formatCurrency(selectedPayment.pendingAmount)}
              </p>
            </div>
            <form onSubmit={handleMakePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={selectedPayment.pendingAmount}
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {formatCurrency(selectedPayment.pendingAmount)}
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isOnline"
                  checked={paymentData.isOnline}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, isOnline: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="isOnline" className="ml-2 text-sm text-gray-700">
                  Online Payment
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
