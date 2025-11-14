"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getClients,
  getPayments,
  updatePayment,
  createPaymentLog,
} from "@/lib/firestore";
import type { Client, Payment } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

export default function BulkPayPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkAmount, setBulkAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isOnline, setIsOnline] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedClientId) {
      loadPendingPayments();
    } else {
      setPendingPayments([]);
    }
  }, [user, selectedClientId]);

  const loadClients = async () => {
    try {
      const data = await getClients(user!.uid);
      // Sort clients alphabetically by name
      const sortedClients = data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const allPayments = await getPayments(user!.uid, { clientId: selectedClientId });
      const pending = allPayments.filter((p) => p.status !== "Paid");
      
      // Get current month (first day of current month)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentMonthStart.setHours(0, 0, 0, 0);
      
      // Separate into backlog (due before current month) and current month
      const backlogPayments = pending.filter((p) => {
        const dueDate = p.paymentDueDate.toDate();
        return dueDate < currentMonthStart;
      });
      
      const currentMonthPayments = pending.filter((p) => {
        const dueDate = p.paymentDueDate.toDate();
        return dueDate >= currentMonthStart;
      });
      
      // Sort each group by payment due date (oldest first)
      backlogPayments.sort((a, b) => {
        const dateA = a.paymentDueDate.toMillis();
        const dateB = b.paymentDueDate.toMillis();
        return dateA - dateB; // Oldest first
      });
      
      currentMonthPayments.sort((a, b) => {
        const dateA = a.paymentDueDate.toMillis();
        const dateB = b.paymentDueDate.toMillis();
        return dateA - dateB; // Oldest first
      });
      
      // Combine: backlog first, then current month
      const sortedPayments = [...backlogPayments, ...currentMonthPayments];
      setPendingPayments(sortedPayments);
    } catch (error) {
      toast.error("Failed to load pending payments");
    }
  };

  const calculateTotalOutstanding = () => {
    return pendingPayments.reduce((sum, p) => sum + p.pendingAmount, 0);
  };

  const handleBulkPayment = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    const amount = parseFloat(bulkAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalOutstanding = calculateTotalOutstanding();
    if (amount > totalOutstanding) {
      toast.error(`Amount cannot exceed total outstanding: ${formatCurrency(totalOutstanding)}`);
      return;
    }

    setProcessing(true);

    try {
      let remainingAmount = amount;

      // Process payments in order (oldest first)
      for (const payment of pendingPayments) {
        if (remainingAmount <= 0) break;

        const amountToPay = Math.min(remainingAmount, payment.pendingAmount);
        const newAmountPaid = payment.amountPaid + amountToPay;
        const newPendingAmount = payment.pendingAmount - amountToPay;

        let newStatus: "Pending" | "Partial" | "Paid" = "Partial";
        if (newPendingAmount <= 0) {
          newStatus = "Paid";
        }

        // Update payment
        await updatePayment(user!.uid, payment.id, {
          amountPaid: newAmountPaid,
          pendingAmount: Math.max(0, newPendingAmount),
          status: newStatus,
        });

        // Create payment log with specified payment date and method
        const paymentTimestamp = Timestamp.fromDate(new Date(paymentDate));
        await createPaymentLog(user!.uid, {
          paymentId: payment.id,
          clientId: payment.clientId,
          clientName: payment.clientName,
          groupName: payment.groupName,
          chitMonth: payment.chitMonth,
          amountPaid: amountToPay,
          paymentDate: paymentTimestamp,
          paymentMethod: isOnline ? "Online" : "Cash",
        });

        remainingAmount -= amountToPay;
      }

      toast.success("Bulk payment processed successfully");
      setBulkAmount("");
      loadPendingPayments();
    } catch (error) {
      toast.error("Failed to process bulk payment");
    } finally {
      setProcessing(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const totalOutstanding = calculateTotalOutstanding();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Bulk Payment</h1>
        <p className="text-gray-600 mt-2">
          Select a client and enter a bulk payment amount. Payments will be automatically
          distributed to clear old backlog first, then current month pending, sorted by due date.
        </p>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Outstanding Balance</p>
                    <p className="text-2xl font-bold text-primary-700">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pending Chits</p>
                    <p className="text-2xl font-bold text-primary-700">
                      {pendingPayments.length}
                    </p>
                  </div>
                </div>
              </div>

              {pendingPayments.length > 0 && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Pending Payments (Backlog First, Then Current Month)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Group
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Month
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Due Date
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Total Due
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Paid
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Pending
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPayments.map((payment) => {
                            const overdue = isOverdue(payment.paymentDueDate);
                            return (
                              <tr
                                key={payment.id}
                                className={`border-b border-gray-100 ${
                                  overdue ? "bg-red-50" : ""
                                }`}
                              >
                                <td className="py-2 px-3 text-sm">{payment.groupName}</td>
                                <td className="py-2 px-3 text-sm">{payment.chitMonth}</td>
                                <td
                                  className={`py-2 px-3 text-sm ${
                                    overdue ? "text-danger-600 font-semibold" : ""
                                  }`}
                                >
                                  {formatDate(payment.paymentDueDate)}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  {formatCurrency(payment.amountExpected)}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  {formatCurrency(payment.amountPaid)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-sm font-semibold ${
                                    overdue ? "text-danger-600" : ""
                                  }`}
                                >
                                  {formatCurrency(payment.pendingAmount)}
                                </td>
                                <td className="py-2 px-3 text-sm">
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
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="input-field"
                        />
                        <div className="flex items-center mt-3">
                          <input
                            type="checkbox"
                            id="isOnlineBulk"
                            checked={isOnline}
                            onChange={(e) => setIsOnline(e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <label htmlFor="isOnlineBulk" className="ml-2 text-sm text-gray-700">
                            Online Payment
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bulk Payment Amount *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          max={totalOutstanding}
                          step="0.01"
                          value={bulkAmount}
                          onChange={(e) => setBulkAmount(e.target.value)}
                          className="input-field"
                          placeholder="Enter amount"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Max: {formatCurrency(totalOutstanding)}
                        </p>
                        <div className="flex-1"></div>
                      </div>
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2 invisible">
                          Button
                        </label>
                        <button
                          onClick={handleBulkPayment}
                          disabled={processing || !bulkAmount || parseFloat(bulkAmount) <= 0}
                          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                        >
                          {processing ? "Processing..." : "Process Payment"}
                        </button>
                        <div className="flex-1"></div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {pendingPayments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending payments for this client.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
