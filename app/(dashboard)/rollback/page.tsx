"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPaymentLogs, rollbackPaymentTransaction } from "@/lib/firestore";
import type { PaymentLog } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function RollbackPage() {
  const { user } = useAuth();
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"clientName" | "groupName" | "chitMonth" | "amountPaid" | "paymentDate">("paymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLog, setDeletingLog] = useState<PaymentLog | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentLogs();
    }
  }, [user]);

  const loadPaymentLogs = async () => {
    try {
      setLoading(true);
      const data = await getPaymentLogs(user!.uid);
      setPaymentLogs(data);
    } catch (error: any) {
      console.error("Error loading payment logs:", error);
      toast.error(error?.message || "Failed to load payment logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (log: PaymentLog) => {
    setDeletingLog(log);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingLog(null);
  };

  const handleRollback = async () => {
    if (!deletingLog) return;

    setProcessing(true);
    try {
      await rollbackPaymentTransaction(user!.uid, deletingLog.id);
      toast.success("Payment transaction rolled back successfully");
      handleCloseDeleteModal();
      loadPaymentLogs();
    } catch (error: any) {
      console.error("Error rolling back transaction:", error);
      const errorMessage = error?.message || "Failed to rollback transaction";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Filter and sort payment logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = paymentLogs.filter(
      (log) =>
        log.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.chitMonth.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort logs
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
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
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [paymentLogs, searchTerm, sortField, sortDirection]);

  // Paginate sorted logs
  const totalPages = Math.ceil(filteredAndSortedLogs.length / itemsPerPage);
  const paginatedLogs = filteredAndSortedLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rollback Transactions</h1>
          <p className="text-gray-600 mt-2">
            Delete payment entries to revert payment updates. This will restore the pending amount
            and update the payment status accordingly.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by client, group, or month..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-auto max-w-xs"
          />
        </div>

        {filteredAndSortedLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {searchTerm ? "No payment logs found matching your search." : "No payment logs found."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="paymentDate">Payment Date</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="clientName">Client Name</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="groupName">Group</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="chitMonth">Auction Month</SortButton>
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="amountPaid">Amount Paid</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Payment Method
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(log.paymentDate)}</td>
                      <td className="py-3 px-4 font-medium">{log.clientName}</td>
                      <td className="py-3 px-4">{log.groupName}</td>
                      <td className="py-3 px-4">{log.chitMonth}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(log.amountPaid)}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteClick(log)}
                          className="text-danger-600 hover:text-danger-700 font-medium"
                        >
                          Rollback
                        </button>
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedLogs.length)} of{" "}
                  {filteredAndSortedLogs.length} transactions
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Rollback Transaction</h2>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">Warning:</p>
              <p className="text-sm text-yellow-700">
                This will reverse the payment and restore it to pending. The payment amount will be
                added back to the pending amount.
              </p>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Client:</span> {deletingLog.clientName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Group:</span> {deletingLog.groupName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Month:</span> {deletingLog.chitMonth}
              </p>
              <p className="text-sm">
                <span className="font-medium">Payment Date:</span> {formatDate(deletingLog.paymentDate)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Amount to Rollback:</span>{" "}
                <span className="font-semibold text-primary-700">
                  {formatCurrency(deletingLog.amountPaid)}
                </span>
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to rollback this transaction? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRollback}
                disabled={processing}
                className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Rolling back..." : "Rollback Transaction"}
              </button>
              <button
                onClick={handleCloseDeleteModal}
                disabled={processing}
                className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

