"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import {
  getGroup,
  getGroupMembers,
  getClients,
  createGroupMember,
  updateGroupMember,
  deleteGroupMember,
  getPayments,
  getAuctions,
} from "@/lib/firestore";
import type { Group, GroupMember, Client, Auction } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function GroupDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "auctions">("members");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<GroupMember | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    chitCount: "1",
    notes: "",
  });

  useEffect(() => {
    if (user && groupId && typeof groupId === 'string') {
      loadData();
    }
  }, [user, groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupData, membersData, auctionsData, clientsData] = await Promise.all([
        getGroup(user!.uid, groupId),
        getGroupMembers(user!.uid, groupId),
        getAuctions(user!.uid, groupId),
        getClients(user!.uid),
      ]);

      if (!groupData) {
        toast.error("Group not found");
        router.push("/groups");
        return;
      }

      setGroup(groupData);
      setMembers(membersData);
      setAuctions(auctionsData);
      setAllClients(clientsData);
    } catch (error: any) {
      console.error("Error loading group data:", error);
      const errorMessage = error?.message || "Failed to load group data";
      toast.error(errorMessage);
      
      // If it's a permission error, redirect back
      if (error?.code === "permission-denied" || errorMessage.includes("permission")) {
        router.push("/groups");
      }
    } finally {
      setLoading(false);
    }
  };

  // Get available clients (not already in group) and sort alphabetically by name
  const availableClients = allClients
    .filter((client) => !members.some((m) => m.clientId === client.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Calculate total member count (sum of chitCount)
  const totalMemberCount = members.reduce((sum, m) => sum + m.chitCount, 0);

  // Sort auctions by auction date (oldest first) for serial number calculation
  const sortedAuctions = useMemo(() => {
    return [...auctions].sort((a, b) => {
      const dateA = a.auctionDate.toMillis();
      const dateB = b.auctionDate.toMillis();
      return dateA - dateB; // Ascending order (oldest first)
    });
  }, [auctions]);

  const handleOpenAddModal = () => {
    setFormData({ clientId: "", chitCount: "1", notes: "" });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (member: GroupMember) => {
    setEditingMember(member);
    setFormData({
      clientId: member.clientId,
      chitCount: member.chitCount.toString(),
      notes: member.notes,
    });
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setFormData({ clientId: "", chitCount: "1", notes: "" });
    setEditingMember(null);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    try {
      const selectedClient = allClients.find((c) => c.id === formData.clientId);
      if (!selectedClient) {
        toast.error("Client not found");
        return;
      }

      await createGroupMember(user!.uid, {
        groupId: group.id,
        groupName: group.groupName,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        chitCount: parseInt(formData.chitCount),
        notes: formData.notes,
      });

      toast.success("Member added successfully");
      handleCloseModals();
      loadData();
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      await updateGroupMember(user!.uid, editingMember.id, {
        chitCount: parseInt(formData.chitCount),
        notes: formData.notes,
      });

      toast.success("Member updated successfully");
      handleCloseModals();
      loadData();
    } catch (error) {
      toast.error("Failed to update member");
    }
  };

  const handleDeleteClick = (member: GroupMember) => {
    setDeletingMember(member);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingMember || !group) return;

    try {
      // Check if member has any payments for this group
      const payments = await getPayments(user!.uid, {
        clientId: deletingMember.clientId,
        groupId: group.id,
      });

      if (payments.length > 0) {
        toast.error("Cannot delete member with existing payments");
        setShowDeleteModal(false);
        setDeletingMember(null);
        return;
      }

      await deleteGroupMember(user!.uid, deletingMember.id);
      toast.success("Member deleted successfully");
      setShowDeleteModal(false);
      setDeletingMember(null);
      loadData();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      const errorMessage = error?.message || "Failed to delete member";
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

  if (!group) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/groups")}
            className="text-primary-600 hover:text-primary-700 mb-2"
          >
            ← Back to Groups
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{group.groupName}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Start Date</p>
          <p className="text-lg font-semibold">{formatDate(group.startDate)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Members</p>
          <p className="text-lg font-semibold">{totalMemberCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Chit Value</p>
          <p className="text-lg font-semibold">{formatCurrency(group.chitValue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Commission</p>
          <p className="text-lg font-semibold">{group.agentCommissionPercent}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("members")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "members"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab("auctions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "auctions"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Auctions
            </button>
          </nav>
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Group Members</h2>
              <button onClick={handleOpenAddModal} className="btn-primary" disabled={availableClients.length === 0}>
                + Add Member
              </button>
            </div>
            {members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No members yet. Add your first member!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Client Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Chit Count</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{member.clientName}</td>
                        <td className="py-3 px-4">{member.chitCount}</td>
                        <td className="py-3 px-4 text-gray-600">{member.notes || "-"}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEditModal(member)}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(member)}
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
            )}
          </div>
        )}

        {/* Auctions Tab */}
        {activeTab === "auctions" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Auctions</h2>
            {auctions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No auctions yet for this group.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">S.No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Auction Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Winner Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Bid Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAuctions.map((auction, index) => (
                      <tr key={auction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">{formatDate(auction.auctionDate)}</td>
                        <td className="py-3 px-4 font-medium">{auction.winnerName}</td>
                        <td className="py-3 px-4">{formatCurrency(auction.bidAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select a client</option>
                  {availableClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chit Count *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.chitCount}
                  onChange={(e) => setFormData({ ...formData, chitCount: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Add
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Member</h2>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <input
                  type="text"
                  value={editingMember.clientName}
                  disabled
                  className="input-field bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chit Count *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.chitCount}
                  onChange={(e) => setFormData({ ...formData, chitCount: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Update
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
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
      {showDeleteModal && deletingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Member</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{deletingMember.clientName}</strong> from
              this group? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingMember(null);
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
