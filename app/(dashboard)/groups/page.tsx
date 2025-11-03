"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGroups, createGroup, updateGroup, deleteGroup } from "@/lib/firestore";
import type { Group } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"groupName" | "startDate" | "memberCount" | "chitValue" | "agentCommissionPercent">("groupName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    groupName: "",
    startDate: "",
    memberCount: "",
    chitValue: "",
    agentCommissionPercent: "",
  });

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      const data = await getGroups(user!.uid);
      setGroups(data);
    } catch (error) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      const startDate = group.startDate.toDate().toISOString().split("T")[0];
      setFormData({
        groupName: group.groupName,
        startDate,
        memberCount: group.memberCount.toString(),
        chitValue: group.chitValue.toString(),
        agentCommissionPercent: group.agentCommissionPercent.toString(),
      });
    } else {
      setEditingGroup(null);
      setFormData({
        groupName: "",
        startDate: "",
        memberCount: "",
        chitValue: "",
        agentCommissionPercent: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({
      groupName: "",
      startDate: "",
      memberCount: "",
      chitValue: "",
      agentCommissionPercent: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { Timestamp } = await import("firebase/firestore");
      const data = {
        groupName: formData.groupName,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        memberCount: parseInt(formData.memberCount),
        chitValue: parseFloat(formData.chitValue),
        agentCommissionPercent: parseFloat(formData.agentCommissionPercent),
      };

      if (editingGroup) {
        await updateGroup(user!.uid, editingGroup.id, data);
        toast.success("Group updated successfully");
      } else {
        await createGroup(user!.uid, data);
        toast.success("Group created successfully");
      }
      handleCloseModal();
      loadGroups();
    } catch (error: any) {
      console.error("Error saving group:", error);
      const errorMessage = error?.message || "Failed to save group";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (group: Group) => {
    setDeletingGroup(group);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    try {
      await deleteGroup(user!.uid, deletingGroup.id);
      toast.success("Group deleted successfully");
      setShowDeleteModal(false);
      setDeletingGroup(null);
      loadGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      const errorMessage = error?.message || "Failed to delete group";
      toast.error(errorMessage);
    }
  };

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter((group) =>
      group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort groups
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "groupName":
          aValue = a.groupName.toLowerCase();
          bValue = b.groupName.toLowerCase();
          break;
        case "startDate":
          aValue = a.startDate.toMillis();
          bValue = b.startDate.toMillis();
          break;
        case "memberCount":
          aValue = a.memberCount;
          bValue = b.memberCount;
          break;
        case "chitValue":
          aValue = a.chitValue;
          bValue = b.chitValue;
          break;
        case "agentCommissionPercent":
          aValue = a.agentCommissionPercent;
          bValue = b.agentCommissionPercent;
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
  }, [groups, searchTerm, sortField, sortDirection]);

  // Paginate filtered and sorted groups
  const totalPages = Math.ceil(filteredAndSortedGroups.length / itemsPerPage);
  const paginatedGroups = filteredAndSortedGroups.slice(
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
        <h1 className="text-3xl font-bold text-gray-800">Groups</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + Add Group
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-auto max-w-xs"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No groups yet. Add your first group!
          </p>
        ) : filteredAndSortedGroups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No groups found matching your search.
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
                      <SortButton field="startDate">Start Date</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="memberCount">Members</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="chitValue">Chit Value</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="agentCommissionPercent">Commission %</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map((group) => (
                    <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/groups/${group.id}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {group.groupName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{formatDate(group.startDate)}</td>
                      <td className="py-3 px-4">{group.memberCount}</td>
                      <td className="py-3 px-4">{formatCurrency(group.chitValue)}</td>
                      <td className="py-3 px-4">{group.agentCommissionPercent}%</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/groups/${group.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleOpenModal(group)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(group)}
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedGroups.length)} of{" "}
                  {filteredAndSortedGroups.length} groups
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
              {editingGroup ? "Edit Group" : "Add Group"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Member Count *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chit Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.chitValue}
                  onChange={(e) => setFormData({ ...formData, chitValue: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Commission % *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.agentCommissionPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, agentCommissionPercent: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingGroup ? "Update" : "Create"}
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
      {showDeleteModal && deletingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Group</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingGroup.groupName}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingGroup(null);
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
