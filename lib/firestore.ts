import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Client,
  Group,
  GroupMember,
  Auction,
  Payment,
  PaymentLog,
} from "@/types";

// Helper to get user collection path
const getUserCollection = (userId: string, collectionName: string) =>
  `users/${userId}/${collectionName}`;

// Clients
export const getClients = async (userId: string): Promise<Client[]> => {
  const q = query(
    collection(db, getUserCollection(userId, "clients")),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Client)
  );
};

export const getClient = async (
  userId: string,
  clientId: string
): Promise<Client | null> => {
  const docRef = doc(db, getUserCollection(userId, "clients"), clientId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...docSnap.data() } as Client)
    : null;
};

export const createClient = async (
  userId: string,
  data: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, getUserCollection(userId, "clients")), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateClient = async (
  userId: string,
  clientId: string,
  data: Partial<Omit<Client, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "clients"), clientId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteClient = async (
  userId: string,
  clientId: string
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "clients"), clientId);
  await deleteDoc(docRef);
};

// Groups
export const getGroups = async (userId: string): Promise<Group[]> => {
  const q = query(
    collection(db, getUserCollection(userId, "groups")),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));
};

export const getGroup = async (
  userId: string,
  groupId: string
): Promise<Group | null> => {
  const docRef = doc(db, getUserCollection(userId, "groups"), groupId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...docSnap.data() } as Group)
    : null;
};

export const createGroup = async (
  userId: string,
  data: Omit<Group, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, getUserCollection(userId, "groups")), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateGroup = async (
  userId: string,
  groupId: string,
  data: Partial<Omit<Group, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "groups"), groupId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  // Get all group members first
  const members = await getGroupMembers(userId, groupId);
  
  // Delete all group members
  const batch = writeBatch(db);
  members.forEach((member) => {
    const memberRef = doc(db, getUserCollection(userId, "groupMembers"), member.id);
    batch.delete(memberRef);
  });
  
  // Delete the group
  const groupRef = doc(db, getUserCollection(userId, "groups"), groupId);
  batch.delete(groupRef);
  
  // Commit all deletions
  await batch.commit();
};

// Group Members
export const getGroupMembers = async (
  userId: string,
  groupId?: string
): Promise<GroupMember[]> => {
  try {
    const collectionRef = collection(db, getUserCollection(userId, "groupMembers"));
    let q;
    
    if (groupId) {
      // Use where clause only to avoid index requirement, then sort manually
      // This avoids needing a composite index for groupId + createdAt
      q = query(collectionRef, where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as GroupMember)
      );
      // Sort manually by createdAt descending
      return members.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order (newest first)
      });
    } else {
      q = query(collectionRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as GroupMember)
      );
    }
  } catch (error) {
    console.error("Error in getGroupMembers:", error);
    throw error;
  }
};

export const getGroupMember = async (
  userId: string,
  memberId: string
): Promise<GroupMember | null> => {
  const docRef = doc(db, getUserCollection(userId, "groupMembers"), memberId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...docSnap.data() } as GroupMember)
    : null;
};

export const createGroupMember = async (
  userId: string,
  data: Omit<GroupMember, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, getUserCollection(userId, "groupMembers")),
    {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  );
  return docRef.id;
};

export const updateGroupMember = async (
  userId: string,
  memberId: string,
  data: Partial<Omit<GroupMember, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "groupMembers"), memberId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteGroupMember = async (
  userId: string,
  memberId: string
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "groupMembers"), memberId);
  await deleteDoc(docRef);
};

// Auctions
export const getAuctions = async (
  userId: string,
  groupId?: string
): Promise<Auction[]> => {
  const collectionRef = collection(db, getUserCollection(userId, "auctions"));
  let q;
  
  if (groupId) {
    // Use where clause only to avoid index requirement, then sort manually
    q = query(collectionRef, where("groupId", "==", groupId));
    const snapshot = await getDocs(q);
    const auctions = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Auction)
    );
    // Sort manually by chitMonth descending (newest first)
    return auctions.sort((a, b) => {
      // Compare YYYY-MM format strings
      if (a.chitMonth > b.chitMonth) return -1;
      if (a.chitMonth < b.chitMonth) return 1;
      return 0;
    });
  } else {
    q = query(collectionRef, orderBy("chitMonth", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Auction)
    );
  }
};

export const getAuction = async (
  userId: string,
  auctionId: string
): Promise<Auction | null> => {
  const docRef = doc(db, getUserCollection(userId, "auctions"), auctionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...docSnap.data() } as Auction)
    : null;
};

export const createAuction = async (
  userId: string,
  data: Omit<Auction, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, getUserCollection(userId, "auctions")),
    {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  );
  return docRef.id;
};

export const updateAuction = async (
  userId: string,
  auctionId: string,
  data: Partial<Omit<Auction, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "auctions"), auctionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteAuction = async (
  userId: string,
  auctionId: string
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "auctions"), auctionId);
  await deleteDoc(docRef);
};

// Payments
export const getPayments = async (
  userId: string,
  filters?: {
    clientId?: string;
    groupId?: string;
    status?: string;
    auctionId?: string;
  }
): Promise<Payment[]> => {
  const collectionRef = collection(db, getUserCollection(userId, "payments"));
  let q = query(collectionRef);

  if (filters?.clientId) {
    q = query(q, where("clientId", "==", filters.clientId));
  }
  if (filters?.groupId) {
    q = query(q, where("groupId", "==", filters.groupId));
  }
  if (filters?.status) {
    q = query(q, where("status", "==", filters.status));
  }
  if (filters?.auctionId) {
    q = query(q, where("auctionId", "==", filters.auctionId));
  }

  // Fetch without orderBy to avoid index requirement, then sort manually
  const snapshot = await getDocs(q);
  const payments = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Payment)
  );
  
  // Sort manually by paymentDueDate ascending
  return payments.sort((a, b) => {
    const aTime = a.paymentDueDate?.toMillis() || 0;
    const bTime = b.paymentDueDate?.toMillis() || 0;
    return aTime - bTime; // Ascending order (earliest first)
  });
};

export const getPayment = async (
  userId: string,
  paymentId: string
): Promise<Payment | null> => {
  const docRef = doc(db, getUserCollection(userId, "payments"), paymentId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...docSnap.data() } as Payment)
    : null;
};

export const createPayment = async (
  userId: string,
  data: Omit<Payment, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, getUserCollection(userId, "payments")),
    {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  );
  return docRef.id;
};

export const updatePayment = async (
  userId: string,
  paymentId: string,
  data: Partial<Omit<Payment, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "payments"), paymentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deletePayment = async (
  userId: string,
  paymentId: string
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "payments"), paymentId);
  await deleteDoc(docRef);
};

export const deletePaymentsByAuction = async (
  userId: string,
  auctionId: string
): Promise<void> => {
  const payments = await getPayments(userId, { auctionId });
  
  if (payments.length === 0) {
    return; // No payments to delete
  }
  
  // Get all payment logs for these payments
  const allPaymentLogs: PaymentLog[] = [];
  for (const payment of payments) {
    const logs = await getPaymentLogs(userId, { paymentId: payment.id });
    allPaymentLogs.push(...logs);
  }
  
  // Delete payment logs and payments in batches (Firestore batch limit is 500)
  let batch = writeBatch(db);
  let operationCount = 0;
  
  // Delete payment logs first
  for (const log of allPaymentLogs) {
    if (operationCount >= 500) {
      await batch.commit();
      batch = writeBatch(db); // Create new batch
      operationCount = 0;
    }
    const logRef = doc(db, getUserCollection(userId, "paymentLogs"), log.id);
    batch.delete(logRef);
    operationCount++;
  }
  
  // Delete payments
  for (const payment of payments) {
    if (operationCount >= 500) {
      await batch.commit();
      batch = writeBatch(db); // Create new batch
      operationCount = 0;
    }
    const paymentRef = doc(db, getUserCollection(userId, "payments"), payment.id);
    batch.delete(paymentRef);
    operationCount++;
  }
  
  // Commit remaining operations
  if (operationCount > 0) {
    await batch.commit();
  }
};

// Payment Logs
export const getPaymentLogs = async (
  userId: string,
  filters?: {
    clientId?: string;
    paymentId?: string;
    month?: string; // YYYY-MM format
  }
): Promise<PaymentLog[]> => {
  const collectionRef = collection(db, getUserCollection(userId, "paymentLogs"));
  let q = query(collectionRef);

  if (filters?.clientId) {
    q = query(q, where("clientId", "==", filters.clientId));
  }
  if (filters?.paymentId) {
    q = query(q, where("paymentId", "==", filters.paymentId));
  }

  // Avoid index requirement by not using orderBy when filtering by clientId
  // Instead, we'll sort manually after fetching
  if (!filters?.clientId) {
    q = query(q, orderBy("paymentDate", "desc"));
  }

  const snapshot = await getDocs(q);
  
  let logs = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as PaymentLog)
  );

  // Sort manually if we filtered by clientId to avoid index requirement
  if (filters?.clientId) {
    logs.sort((a, b) => {
      const aTime = a.paymentDate.toMillis();
      const bTime = b.paymentDate.toMillis();
      return bTime - aTime; // Descending order (newest first)
    });
  }

  // Filter by month if provided
  if (filters?.month) {
    logs = logs.filter((log) => {
      const logMonth = log.paymentDate.toDate().toISOString().slice(0, 7);
      return logMonth === filters.month;
    });
  }

  return logs;
};

export const createPaymentLog = async (
  userId: string,
  data: Omit<PaymentLog, "id" | "createdAt">
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, getUserCollection(userId, "paymentLogs")),
    {
      ...data,
      createdAt: Timestamp.now(),
    }
  );
  return docRef.id;
};

export const deletePaymentLog = async (
  userId: string,
  logId: string
): Promise<void> => {
  const docRef = doc(db, getUserCollection(userId, "paymentLogs"), logId);
  await deleteDoc(docRef);
};

export const rollbackPaymentTransaction = async (
  userId: string,
  logId: string
): Promise<void> => {
  // Get the payment log
  const logRef = doc(db, getUserCollection(userId, "paymentLogs"), logId);
  const logSnap = await getDoc(logRef);
  
  if (!logSnap.exists()) {
    throw new Error("Payment log not found");
  }

  const log = { id: logSnap.id, ...logSnap.data() } as PaymentLog;

  // Get the payment record
  const payment = await getPayment(userId, log.paymentId);
  if (!payment) {
    throw new Error("Payment record not found");
  }

  // Calculate new amounts after rollback
  const newAmountPaid = payment.amountPaid - log.amountPaid;
  const newPendingAmount = payment.pendingAmount + log.amountPaid;
  
  // Determine new status
  let newStatus: "Pending" | "Partial" | "Paid";
  if (newPendingAmount >= payment.amountExpected) {
    newStatus = "Pending";
  } else if (newAmountPaid > 0) {
    newStatus = "Partial";
  } else {
    newStatus = "Pending";
  }

  // Update payment and delete log in a batch
  const batch = writeBatch(db);
  
  // Update payment
  const paymentRef = doc(db, getUserCollection(userId, "payments"), payment.id);
  batch.update(paymentRef, {
    amountPaid: Math.max(0, newAmountPaid),
    pendingAmount: newPendingAmount,
    status: newStatus,
    updatedAt: Timestamp.now(),
  });

  // Delete payment log
  batch.delete(logRef);

  // Commit the batch
  await batch.commit();
};
