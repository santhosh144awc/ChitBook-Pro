"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAuctions,
  getGroups,
  getGroupMembers,
  createAuction,
  updateAuction,
  deleteAuction,
  createPayment,
  getPayments,
  updatePayment,
  deletePaymentsByAuction,
} from "@/lib/firestore";
import { calculateAuctionAmounts } from "@/lib/utils";
import type { Auction, Group, GroupMember } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

export default function AuctionsPage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [deletingAuction, setDeletingAuction] = useState<Auction | null>(null);
  // Month filter with current month as default
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortField, setSortField] = useState<"groupName" | "chitMonth" | "winnerName" | "bidAmount" | "perMemberContribution" | "paymentDueDate">("paymentDueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [formData, setFormData] = useState({
    groupId: "",
    chitMonth: "",
    auctionDate: "",
    paymentDueDate: "",
    winnerClientId: [] as string[],
    winnerName: [] as string[],
    bidAmount: "",
    isCompanyBid: false,
  });
  const [calculations, setCalculations] = useState({
    payoutAmount: 0,
    agentCommission: 0,
    totalCollectionAmount: 0,
    perMemberContribution: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [auctionsData, groupsData] = await Promise.all([
        getAuctions(user!.uid),
        getGroups(user!.uid),
      ]);
      setAuctions(auctionsData);
      setGroups(groupsData);
    } catch (error) {
      toast.error("Failed to load auctions");
    } finally {
      setLoading(false);
    }
  };

  // Get unique months from auctions
  const uniqueMonths = Array.from(new Set(auctions.map(a => a.chitMonth))).sort().reverse();

  // Adjust monthFilter if current month doesn't exist in data
  useEffect(() => {
    if (auctions.length > 0 && uniqueMonths.length > 0 && !uniqueMonths.includes(monthFilter)) {
      setMonthFilter(uniqueMonths[0]);
    }
  }, [auctions.length, uniqueMonths, monthFilter]);

  // Filter groups that already have auctions for the selected chit month (only when creating new auction)
  const availableGroups = useMemo(() => {
    if (editingAuction) {
      // When editing, show all groups (including the current one)
      return groups;
    }
    // When creating new auction, filter out groups that already have an auction for the selected chit month
    if (!formData.chitMonth) {
      return groups;
    }
    const groupsWithAuctionForMonth = new Set(
      auctions
        .filter(auction => auction.chitMonth === formData.chitMonth)
        .map(auction => auction.groupId)
    );
    return groups.filter(group => !groupsWithAuctionForMonth.has(group.id));
  }, [groups, auctions, formData.chitMonth, editingAuction]);

  // Filter and sort auctions by selected month
  const filteredAndSortedAuctions = useMemo(() => {
    let filtered = monthFilter ? auctions.filter(auction => auction.chitMonth === monthFilter) : [];
    
    // Sort auctions
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "groupName":
          aValue = a.groupName.toLowerCase();
          bValue = b.groupName.toLowerCase();
          break;
        case "chitMonth":
          aValue = a.chitMonth;
          bValue = b.chitMonth;
          break;
        case "winnerName":
          const aWinnerStr = Array.isArray(a.winnerName) 
            ? a.winnerName.join(", ") 
            : (a.winnerName || "");
          const bWinnerStr = Array.isArray(b.winnerName)
            ? b.winnerName.join(", ")
            : (b.winnerName || "");
          aValue = aWinnerStr.toLowerCase();
          bValue = bWinnerStr.toLowerCase();
          break;
        case "bidAmount":
          aValue = a.bidAmount;
          bValue = b.bidAmount;
          break;
        case "perMemberContribution":
          aValue = a.perMemberContribution;
          bValue = b.perMemberContribution;
          break;
        case "paymentDueDate":
          aValue = a.paymentDueDate.toMillis();
          bValue = b.paymentDueDate.toMillis();
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
  }, [auctions, monthFilter, sortField, sortDirection]);

  // Paginate filtered and sorted auctions
  const totalPages = Math.ceil(filteredAndSortedAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAndSortedAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [monthFilter, sortField, sortDirection]);

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

  // Calculate amounts when form data changes
  useEffect(() => {
    const calculate = async () => {
      if (formData.groupId && formData.bidAmount && user) {
        const group = groups.find((g) => g.id === formData.groupId);
        if (group) {
          const members = await getGroupMembers(user.uid, formData.groupId);
          const actualMemberCount = members.reduce((sum, m) => sum + m.chitCount, 0);
          const amounts = calculateAuctionAmounts(
            group.chitValue,
            parseFloat(formData.bidAmount) || 0,
            group.agentCommissionPercent,
            actualMemberCount || group.memberCount
          );
          setCalculations(amounts);
        }
      }
    };
    calculate();
  }, [formData.groupId, formData.bidAmount, groups, user]);

  // Load group members when group is selected
  useEffect(() => {
    const loadMembers = async () => {
      if (formData.groupId && user) {
        try {
          const members = await getGroupMembers(user.uid, formData.groupId);
          setGroupMembers(members);
          // Clear winner selection when group changes (only for new auctions)
          if (!editingAuction) {
            setFormData(prev => ({
              ...prev,
              winnerClientId: [],
              winnerName: []
            }));
          }
        } catch (error) {
          console.error("Error loading group members:", error);
          setGroupMembers([]);
        }
      } else {
        setGroupMembers([]);
      }
    };
    loadMembers();
  }, [formData.groupId, user, editingAuction]);

  // Auto-update auction and payment dates when group or chit month changes
  useEffect(() => {
    if (formData.chitMonth && !editingAuction) {
      const selectedDate = new Date(formData.chitMonth + "-01");
      let auctionDate = "";
      
      // If group is selected, use the same day number as group's start date
      if (formData.groupId) {
        const group = groups.find((g) => g.id === formData.groupId);
        if (group) {
          const groupStartDay = group.startDate.toDate().getDate();
          selectedDate.setDate(groupStartDay);
        }
      }
      auctionDate = selectedDate.toISOString().split("T")[0];
      
      // Payment due date is 5 days after auction date
      const dueDate = new Date(auctionDate);
      dueDate.setDate(dueDate.getDate() + 5);
      const paymentDueDate = dueDate.toISOString().split("T")[0];
      
      setFormData(prev => ({
        ...prev,
        auctionDate,
        paymentDueDate
      }));
    }
  }, [formData.chitMonth, formData.groupId, groups, editingAuction]);

  const handleOpenModal = async (auction?: Auction) => {
    if (auction) {
      setEditingAuction(auction);
      const auctionDate = auction.auctionDate.toDate().toISOString().split("T")[0];
      const paymentDueDate = auction.paymentDueDate.toDate().toISOString().split("T")[0];
      
      // Convert winner data to arrays (handle both old single winner and new multiple winners)
      const winnerClientIds = Array.isArray(auction.winnerClientId) 
        ? auction.winnerClientId 
        : auction.winnerClientId ? [auction.winnerClientId] : [];
      const winnerNames = Array.isArray(auction.winnerName)
        ? auction.winnerName
        : auction.winnerName ? [auction.winnerName] : [];
      
      // Check if this is a company bid (winnerName contains "Company Bid")
      const isCompanyBid = winnerNames.length > 0 && 
        (winnerNames.includes("Company Bid") || winnerNames[0] === "Company Bid");
      
      // Load group members for editing first
      if (user && auction.groupId) {
        try {
          const members = await getGroupMembers(user.uid, auction.groupId);
          setGroupMembers(members);
          
          // Set form data after members are loaded
          setFormData({
            groupId: auction.groupId,
            chitMonth: auction.chitMonth,
            auctionDate,
            paymentDueDate,
            winnerClientId: isCompanyBid ? [] : winnerClientIds,
            winnerName: isCompanyBid ? [] : winnerNames,
            bidAmount: auction.bidAmount.toString(),
            isCompanyBid,
          });
        } catch (error) {
          console.error("Error loading group members:", error);
          // Still set form data even if members fail to load
          setFormData({
            groupId: auction.groupId,
            chitMonth: auction.chitMonth,
            auctionDate,
            paymentDueDate,
            winnerClientId: isCompanyBid ? [] : winnerClientIds,
            winnerName: isCompanyBid ? [] : winnerNames,
            bidAmount: auction.bidAmount.toString(),
            isCompanyBid,
          });
        }
      } else {
        setFormData({
          groupId: auction.groupId,
          chitMonth: auction.chitMonth,
          auctionDate,
          paymentDueDate,
          winnerClientId: isCompanyBid ? [] : winnerClientIds,
          winnerName: isCompanyBid ? [] : winnerNames,
          bidAmount: auction.bidAmount.toString(),
          isCompanyBid,
        });
      }
    } else {
      setEditingAuction(null);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setFormData({
        groupId: "",
        chitMonth: currentMonth,
        auctionDate: "",
        paymentDueDate: "",
        winnerClientId: [],
        winnerName: [],
        bidAmount: "",
        isCompanyBid: false,
      });
      setGroupMembers([]);
    }
    setCalculations({
      payoutAmount: 0,
      agentCommission: 0,
      totalCollectionAmount: 0,
      perMemberContribution: 0,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAuction(null);
    setGroupMembers([]);
    setFormData({
      groupId: "",
      chitMonth: "",
      auctionDate: "",
      paymentDueDate: "",
      winnerClientId: [],
      winnerName: [],
      bidAmount: "",
      isCompanyBid: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate that at least one winner is selected OR company bid is checked
      if (!formData.isCompanyBid && (!formData.winnerClientId || formData.winnerClientId.length === 0)) {
        toast.error("Please select at least one winner or mark as Company Bid");
        return;
      }

      const selectedGroup = groups.find((g) => g.id === formData.groupId);
      if (!selectedGroup) {
        toast.error("Group not found");
        return;
      }

      // Get actual member count
      const members = await getGroupMembers(user!.uid, formData.groupId);
      const actualMemberCount = members.reduce((sum, m) => sum + m.chitCount, 0);

      const amounts = calculateAuctionAmounts(
        selectedGroup.chitValue,
        parseFloat(formData.bidAmount),
        selectedGroup.agentCommissionPercent,
        actualMemberCount || selectedGroup.memberCount
      );

      // Ensure winner data is arrays
      // If company bid, set winner to "Company Bid"
      const winnerClientIds = formData.isCompanyBid 
        ? [] 
        : (Array.isArray(formData.winnerClientId) 
          ? formData.winnerClientId 
          : formData.winnerClientId ? [formData.winnerClientId] : []);
      const winnerNames = formData.isCompanyBid
        ? ["Company Bid"]
        : (Array.isArray(formData.winnerName)
          ? formData.winnerName
          : formData.winnerName ? [formData.winnerName] : []);

      const auctionData = {
        groupId: selectedGroup.id,
        groupName: selectedGroup.groupName,
        chitMonth: formData.chitMonth,
        auctionDate: Timestamp.fromDate(new Date(formData.auctionDate)),
        paymentDueDate: Timestamp.fromDate(new Date(formData.paymentDueDate)),
        winnerClientId: winnerClientIds,
        winnerName: winnerNames,
        bidAmount: parseFloat(formData.bidAmount),
        payoutAmount: amounts.payoutAmount,
        agentCommission: amounts.agentCommission,
        totalCollectionAmount: amounts.totalCollectionAmount,
        perMemberContribution: amounts.perMemberContribution,
      };

      if (editingAuction) {
        // Update auction
        await updateAuction(user!.uid, editingAuction.id, auctionData);

        // Update all associated payments
        const payments = await getPayments(user!.uid, { auctionId: editingAuction.id });
        for (const payment of payments) {
          const member = members.find((m) => m.clientId === payment.clientId);
          const newAmountExpected =
            amounts.perMemberContribution * (member?.chitCount || 1);
          const newPendingAmount = newAmountExpected - payment.amountPaid;

          let newStatus = payment.status;
          if (payment.amountPaid === 0) {
            newStatus = "Pending";
          } else if (payment.amountPaid >= newAmountExpected) {
            newStatus = "Paid";
          } else {
            newStatus = "Partial";
          }

          await updatePayment(user!.uid, payment.id, {
            amountExpected: newAmountExpected,
            pendingAmount: newPendingAmount,
            status: newStatus,
          });
        }

        toast.success("Auction updated successfully");
      } else {
        // Create auction
        const auctionId = await createAuction(user!.uid, auctionData);

        // Create payments for all members
        for (const member of members) {
          const amountExpected =
            amounts.perMemberContribution * member.chitCount;

          await createPayment(user!.uid, {
            auctionId,
            clientId: member.clientId,
            clientName: member.clientName,
            groupId: selectedGroup.id,
            groupName: selectedGroup.groupName,
            chitMonth: formData.chitMonth,
            amountExpected,
            amountPaid: 0,
            pendingAmount: amountExpected,
            paymentDueDate: Timestamp.fromDate(new Date(formData.paymentDueDate)),
            status: "Pending",
          });
        }

        toast.success("Auction created successfully");
      }

      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error("Error saving auction:", error);
      const errorMessage = error?.message || "Failed to save auction";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (auction: Auction) => {
    setDeletingAuction(auction);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingAuction) return;

    try {
      // Step 1: Get all payments related to this auction to count them
      const payments = await getPayments(user!.uid, { auctionId: deletingAuction.id });
      const paymentCount = payments.length;

      // Step 2: Delete all related data (payment logs and payment entries)
      // This function deletes:
      // - All payment logs (payment received records) for payments related to this auction
      // - All payment entries related to this auction
      if (paymentCount > 0) {
        await deletePaymentsByAuction(user!.uid, deletingAuction.id);
      }

      // Step 3: Delete the auction itself
      await deleteAuction(user!.uid, deletingAuction.id);

      // Step 4: Show success message
      if (paymentCount > 0) {
        toast.success(`Auction deleted successfully. All ${paymentCount} related payment(s) and payment records have been removed.`);
      } else {
        toast.success("Auction deleted successfully");
      }

      setShowDeleteModal(false);
      setDeletingAuction(null);
      loadData();
    } catch (error: any) {
      console.error("Error deleting auction:", error);
      const errorMessage = error?.message || "Failed to delete auction";
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
        <h1 className="text-3xl font-bold text-gray-800">Auctions</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + Add Auction
        </button>
      </div>

      {/* Month Filter */}
      {auctions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="input-field w-auto"
            >
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">
              Showing {filteredAndSortedAuctions.length} auction(s) for selected month
            </span>
          </div>
        </div>
      )}

      <div className="card">
        {auctions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No auctions yet. Add your first auction!
          </p>
        ) : filteredAndSortedAuctions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No auctions found for the selected month.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="groupName">Group</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="chitMonth">Month</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="winnerName">Winner(s)</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="bidAmount">Discount</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="perMemberContribution">Per Member</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="paymentDueDate">Due Date</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAuctions.map((auction) => (
                    <tr key={auction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{auction.groupName}</td>
                      <td className="py-3 px-4">{auction.chitMonth}</td>
                      <td className="py-3 px-4">
                        {Array.isArray(auction.winnerName) 
                          ? auction.winnerName.length > 0 
                            ? auction.winnerName.join(", ")
                            : "-"
                          : auction.winnerName || "-"}
                      </td>
                      <td className="py-3 px-4">{formatCurrency(auction.bidAmount)}</td>
                      <td className="py-3 px-4">{formatCurrency(auction.perMemberContribution)}</td>
                      <td className="py-3 px-4">{formatDate(auction.paymentDueDate)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(auction)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(auction)}
                            className="text-danger-600 hover:text-danger-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedAuctions.length)} of{" "}
                  {filteredAndSortedAuctions.length} auctions
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingAuction ? "Edit Auction" : "Add Auction"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group *
                  </label>
                  <select
                    required
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="input-field"
                    disabled={!!editingAuction}
                  >
                    <option value="">Select a group</option>
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.groupName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chit Month (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.chitMonth}
                    onChange={(e) => {
                      const selectedMonth = e.target.value;
                      
                      // Auto-generate auction date (1st day of selected month)
                      // If group is selected, use the day from group's start date
                      let auctionDate = "";
                      if (selectedMonth) {
                        const selectedDate = new Date(selectedMonth + "-01");
                        if (formData.groupId) {
                          const group = groups.find((g) => g.id === formData.groupId);
                          if (group) {
                            // Use the same day number as group's start date
                            const groupStartDay = group.startDate.toDate().getDate();
                            selectedDate.setDate(groupStartDay);
                          }
                        }
                        auctionDate = selectedDate.toISOString().split("T")[0];
                      }
                      
                      // Auto-generate payment due date (5 days after auction date)
                      let paymentDueDate = "";
                      if (auctionDate) {
                        const dueDate = new Date(auctionDate);
                        dueDate.setDate(dueDate.getDate() + 5);
                        paymentDueDate = dueDate.toISOString().split("T")[0];
                      }
                      
                      setFormData({ 
                        ...formData, 
                        chitMonth: selectedMonth,
                        auctionDate,
                        paymentDueDate
                      });
                    }}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.auctionDate}
                    onChange={(e) => setFormData({ ...formData, auctionDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDueDate: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              
              {/* Company Bid Checkbox - Prominent placement */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="companyBid"
                    checked={formData.isCompanyBid}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        isCompanyBid: e.target.checked,
                        winnerClientId: e.target.checked ? [] : formData.winnerClientId,
                        winnerName: e.target.checked ? [] : formData.winnerName,
                      });
                    }}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="companyBid" className="text-sm font-semibold text-gray-800 cursor-pointer">
                    Company Bid (No one bid for this auction - Company will bid and collect money from all members)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Winner Name(s) {!formData.isCompanyBid && "*"} (Select multiple if needed)
                  </label>
                  <select
                    required={!formData.isCompanyBid}
                    multiple
                    size={Math.min(6, Math.max(3, groupMembers.length || 3))}
                    value={formData.winnerClientId}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedMembers = groupMembers.filter(m => selectedIds.includes(m.clientId));
                      setFormData({ 
                        ...formData, 
                        winnerClientId: selectedIds,
                        winnerName: selectedMembers.map(m => m.clientName),
                        isCompanyBid: false, // Uncheck company bid if winner is selected
                      });
                    }}
                    className="input-field"
                    disabled={!formData.groupId || groupMembers.length === 0 || formData.isCompanyBid}
                  >
                    {groupMembers.map((member) => (
                      <option key={member.clientId} value={member.clientId}>
                        {member.clientName} {member.chitCount !== 1 ? `(${member.chitCount} ${member.chitCount === 0.5 ? 'chit' : 'chits'})` : ""}
                      </option>
                    ))}
                  </select>
                  {formData.isCompanyBid && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Company Bid selected - payments will still be collected from all members
                    </p>
                  )}
                  {formData.winnerClientId.length > 0 && !formData.isCompanyBid && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {formData.winnerName.join(", ")} ({formData.winnerClientId.length} winner{formData.winnerClientId.length > 1 ? "s" : ""})
                    </p>
                  )}
                  {!formData.groupId && (
                    <p className="text-xs text-gray-500 mt-1">Please select a group first</p>
                  )}
                  {formData.groupId && groupMembers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">No members in this group</p>
                  )}
                  {formData.groupId && groupMembers.length > 0 && !formData.isCompanyBid && (
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple winners</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (Bid Amount) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.bidAmount}
                    onChange={(e) => setFormData({ ...formData, bidAmount: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {calculations.perMemberContribution > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-700">Calculations:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Payout Amount:</span>
                      <span className="ml-2 font-semibold">
                        {formatCurrency(calculations.payoutAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Agent Commission:</span>
                      <span className="ml-2 font-semibold">
                        {formatCurrency(calculations.agentCommission)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Collection:</span>
                      <span className="ml-2 font-semibold">
                        {formatCurrency(calculations.totalCollectionAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Per Member Contribution:</span>
                      <span className="ml-2 font-semibold text-primary-600">
                        {formatCurrency(calculations.perMemberContribution)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingAuction ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAuction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Auction</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the auction for{" "}
              <strong>{deletingAuction.groupName}</strong> - {deletingAuction.chitMonth}?
              <br /><br />
              <strong className="text-red-600">This will permanently delete:</strong>
              <br />• The auction record
              <br />• All payment entries related to this auction
              <br />• All payment received records (payment logs) for those payments
              <br /><br />
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAuction(null);
                }}
                className="btn-secondary flex-1"
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
