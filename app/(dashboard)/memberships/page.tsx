"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGroupMembers,
  getClients,
  getGroups,
  createGroupMember,
  updateGroupMember,
  deleteGroupMember,
  getPayments,
} from "@/lib/firestore";
import type { GroupMember, Client, Group } from "@/types";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function MembershipsPage() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<GroupMember | null>(null);
  const [deletingMembership, setDeletingMembership] = useState<GroupMember | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    groupId: "",
    chitCount: "1",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [membershipsData, clientsData, groupsData] = await Promise.all([
        getGroupMembers(user!.uid),
        getClients(user!.uid),
        getGroups(user!.uid),
      ]);

      setMemberships(membershipsData);
      setAllClients(clientsData);
      setAllGroups(groupsData);
    } catch (error) {
      toast.error("Failed to load memberships");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (membership?: GroupMember) => {
    if (membership) {
      setEditingMembership(membership);
      setFormData({
        clientId: membership.clientId,
        groupId: membership.groupId,
        chitCount: membership.chitCount.toString(),
        notes: membership.notes,
      });
    } else {
      setEditingMembership(null);
      setFormData({
        clientId: "",
        groupId: "",
        chitCount: "1",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMembership(null);
    setFormData({
      clientId: "",
      groupId: "",
      chitCount: "1",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const selectedClient = allClients.find((c) => c.id === formData.clientId);
      const selectedGroup = allGroups.find((g) => g.id === formData.groupId);

      if (!selectedClient || !selectedGroup) {
        toast.error("Invalid client or group selection");
        return;
      }

      if (editingMembership) {
        await updateGroupMember(user!.uid, editingMembership.id, {
          chitCount: parseInt(formData.chitCount),
          notes: formData.notes,
        });
        toast.success("Membership updated successfully");
      } else {
        // Check if client is already in this group
        const existing = memberships.find(
          (m) => m.clientId === formData.clientId && m.groupId === formData.groupId
        );
        if (existing) {
          toast.error("Client is already a member of this group");
          return;
        }

        await createGroupMember(user!.uid, {
          groupId: selectedGroup.id,
          groupName: selectedGroup.groupName,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          chitCount: parseInt(formData.chitCount),
          notes: formData.notes,
        });
        toast.success("Membership created successfully");
      }

      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error("Error saving membership:", error);
      const errorMessage = error?.message || "Failed to save membership";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (membership: GroupMember) => {
    setDeletingMembership(membership);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingMembership) return;

    try {
      // Check if member has any payments for this group
      const payments = await getPayments(user!.uid, {
        clientId: deletingMembership.clientId,
        groupId: deletingMembership.groupId,
      });

      if (payments.length > 0) {
        toast.error("Cannot delete membership with existing payments");
        setShowDeleteModal(false);
        setDeletingMembership(null);
        return;
      }

      await deleteGroupMember(user!.uid, deletingMembership.id);
      toast.success("Membership deleted successfully");
      setShowDeleteModal(false);
      setDeletingMembership(null);
      loadData();
    } catch (error: any) {
      console.error("Error deleting membership:", error);
      const errorMessage = error?.message || "Failed to delete membership";
      toast.error(errorMessage);
    }
  };

  // Paginate memberships
  const totalPages = Math.ceil(memberships.length / itemsPerPage);
  const paginatedMemberships = memberships.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
        <h1 className="text-3xl font-bold text-gray-800">Memberships</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + Add Membership
        </button>
      </div>

      <div className="card">
        {memberships.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No memberships yet. Add your first membership!
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Group</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Chit Count</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMemberships.map((membership) => (
                    <tr key={membership.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/clients`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {membership.clientName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/groups/${membership.groupId}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {membership.groupName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{membership.chitCount}</td>
                      <td className="py-3 px-4 text-gray-600">{membership.notes || "-"}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(membership.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(membership)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(membership)}
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
                  {Math.min(currentPage * itemsPerPage, memberships.length)} of{" "}
                  {memberships.length} memberships
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingMembership ? "Edit Membership" : "Add Membership"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="input-field"
                  disabled={!!editingMembership}
                >
                  <option value="">Select a client</option>
                  {allClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group *
                </label>
                <select
                  required
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="input-field"
                  disabled={!!editingMembership}
                >
                  <option value="">Select a group</option>
                  {allGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName}
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
                  {editingMembership ? "Update" : "Create"}
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
      {showDeleteModal && deletingMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Membership</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{deletingMembership.clientName}</strong> from
              <strong> {deletingMembership.groupName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingMembership(null);
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
