"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getPayments,
  getGroupMembersByClientId,
} from "@/lib/firestore";
import type { Client } from "@/types";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"name" | "phone">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [clientGroupMemberships, setClientGroupMemberships] = useState<Array<{ groupId: string; groupName: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const loadClients = async () => {
    try {
      const data = await getClients(user!.uid);
      setClients(data);
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", notes: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
  };

  const handleViewClient = (client: Client) => {
    setViewingClient(client);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(user!.uid, editingClient.id, formData);
        toast.success("Client updated successfully");
      } else {
        await createClient(user!.uid, formData);
        toast.success("Client created successfully");
      }
      handleCloseModal();
      loadClients();
    } catch (error: any) {
      console.error("Error saving client:", error);
      const errorMessage = error?.message || "Failed to save client";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = async (client: Client) => {
    setDeletingClient(client);
    
    // Check which groups this client belongs to
    try {
      const memberships = await getGroupMembersByClientId(user!.uid, client.id);
      const groupInfo = memberships.map(m => ({
        groupId: m.groupId,
        groupName: m.groupName
      }));
      setClientGroupMemberships(groupInfo);
      setShowDeleteModal(true);
    } catch (error) {
      console.error("Error fetching group memberships:", error);
      setClientGroupMemberships([]);
      setShowDeleteModal(true);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      // Check if client is a member of any groups
      if (clientGroupMemberships.length > 0) {
        toast.error(
          `Cannot delete client. Please remove them from ${clientGroupMemberships.length} group(s) first.`,
          { duration: 5000 }
        );
        setShowDeleteModal(false);
        setDeletingClient(null);
        setClientGroupMemberships([]);
        return;
      }

      // Check if client has any payments
      const payments = await getPayments(user!.uid, { clientId: deletingClient.id });
      if (payments.length > 0) {
        toast.error("Cannot delete client with existing payments");
        setShowDeleteModal(false);
        setDeletingClient(null);
        setClientGroupMemberships([]);
        return;
      }

      await deleteClient(user!.uid, deletingClient.id);
      toast.success("Client deleted successfully");
      setShowDeleteModal(false);
      setDeletingClient(null);
      setClientGroupMemberships([]);
      loadClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      const errorMessage = error?.message || "Failed to delete client";
      toast.error(errorMessage);
    }
  };

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort clients
    filtered.sort((a, b) => {
      let aValue: string;
      let bValue: string;

      if (sortField === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else {
        aValue = a.phone;
        bValue = b.phone;
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [clients, searchTerm, sortField, sortDirection]);

  // Paginate sorted clients
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const handleSort = (field: "name" | "phone") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortButton = ({ field, children }: { field: "name" | "phone"; children: React.ReactNode }) => (
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
        <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + Add Client
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-auto max-w-xs"
          />
        </div>

        {filteredAndSortedClients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {searchTerm ? "No clients found" : "No clients yet. Add your first client!"}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="name">Name</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <SortButton field="phone">Phone</SortButton>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {client.name}
                      </button>
                    </td>
                    <td className="py-3 px-4">{client.phone}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(client)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} of{" "}
                  {filteredAndSortedClients.length} clients
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
              {editingClient ? "Edit Client" : "Add Client"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  {editingClient ? "Update" : "Create"}
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

      {/* View Client Details Modal */}
      {showViewModal && viewingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Client Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900 font-medium">{viewingClient.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{viewingClient.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{viewingClient.email || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap">{viewingClient.notes || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-gray-900 text-sm">{formatDate(viewingClient.createdAt)}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleOpenModal(viewingClient);
                  }}
                  className="btn-primary flex-1"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Client</h2>
            
            {clientGroupMemberships.length > 0 ? (
              <div>
                <p className="text-red-600 font-semibold mb-3">
                  Cannot delete <strong>{deletingClient.name}</strong> because they are a member of the following group(s):
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {clientGroupMemberships.map((membership) => (
                      <li key={membership.groupId} className="flex items-center">
                        <span className="text-red-700 font-medium">• {membership.groupName}</span>
                        <Link
                          href={`/groups/${membership.groupId}`}
                          className="ml-2 text-primary-600 hover:text-primary-700 text-sm underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteModal(false);
                            setDeletingClient(null);
                            setClientGroupMemberships([]);
                          }}
                        >
                          (View Group)
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-gray-600 mb-4 text-sm">
                  Please remove this client from all groups before deleting.
                </p>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingClient(null);
                    setClientGroupMemberships([]);
                  }}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>{deletingClient.name}</strong>? This action
                  cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="btn-danger flex-1">
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingClient(null);
                      setClientGroupMemberships([]);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
