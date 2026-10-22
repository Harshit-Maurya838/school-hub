"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Percent,
  Ban,
  User,
  RotateCcw,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { StatCard } from "@/components/common/StatCard";

// ============================================================================
// Types
// ============================================================================

export type FeeFrequency = "ONE_TIME" | "ANNUAL" | "TERM" | "MONTHLY" | "CUSTOM";
export type InvoiceStatus =
  "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "DEMAND_DRAFT" | "OTHER";
export type AdjustmentType = "CONCESSION" | "SCHOLARSHIP" | "WAIVER" | "CORRECTION" | "DISCOUNT";
export type RefundMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export interface FeeHeadItem {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  _count?: { structureItems: number; invoiceItems: number };
}

export interface FeeStructureItem {
  id: string;
  feeHeadId: string;
  amount: string | number;
  isOptional: boolean;
  feeHead: { id: string; name: string; code: string | null };
}

export interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
  frequency: FeeFrequency;
  dueDate: string | null;
  isActive: boolean;
  academicYear: { id: string; name: string; isCurrent: boolean };
  class: { id: string; name: string } | null;
  items: FeeStructureItem[];
  totalAmount: string | number;
  _count?: { invoices: number };
}

export interface InvoiceItem {
  id: string;
  feeHeadId: string | null;
  headName: string;
  amount: string | number;
  concessionAmount: string | number;
  netAmount: string | number;
}

export interface PaymentItem {
  id: string;
  receiptNumber: string;
  amount: string | number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionReference: string | null;
  remarks: string | null;
  isReversed: boolean;
  reversalReason: string | null;
  recordedBy: { id: string; name: string; role: string };
  reversedBy?: { id: string; name: string } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    title: string;
    netAmount: string | number;
    paidAmount: string | number;
    student?: {
      name: string;
      admissionNumber: string;
    };
    enrollment?: {
      section?: {
        name: string;
        class?: {
          name: string;
        };
      };
    };
  };
}

export interface AdjustmentItem {
  id: string;
  type: AdjustmentType;
  amount: string | number;
  reason: string;
  approvedBy: { id: string; name: string };
  createdAt: string;
}

export interface RefundItem {
  id: string;
  refundNumber: string;
  amount: string | number;
  reason: string;
  reference: string | null;
  refundMethod: RefundMethod;
  approvedBy: { id: string; name: string };
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  billingPeriod: string | null;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  grossAmount: string | number;
  concessionAmount: string | number;
  netAmount: string | number;
  paidAmount: string | number;
  refundedAmount: string | number;
  outstandingAmount?: string | number;
  student: { id: string; name: string; admissionNumber: string };
  academicYear: { id: string; name: string };
  enrollment?: {
    section?: { name: string; class?: { name: string } };
  } | null;
  items?: InvoiceItem[];
  payments?: PaymentItem[];
  adjustments?: AdjustmentItem[];
  refunds?: RefundItem[];
}

export interface FinancialOverviewData {
  invoicedGross: string | number;
  concessions: string | number;
  invoicedNet: string | number;
  amountCollected: string | number;
  totalRefunds: string | number;
  netCollections: string | number;
  outstandingAmount: string | number;
  totalInvoices: number;
  counts: {
    paid: number;
    partiallyPaid: number;
    overdue: number;
    issued: number;
  };
  paymentMethods: Record<string, string>;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amountReceived: string | number;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  remarks?: string | null;
  invoiceNumber?: string;
  invoiceTitle?: string;
  schoolName?: string;
  studentName?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  invoicedAmount?: string | number;
  totalPaid?: string | number;
  remainingBalance?: string | number;
  recordedByName?: string;
}

export interface ClassWiseSummary {
  classId: string;
  className: string;
  studentCount: number;
  invoicedGross: string | number;
  concessions: string | number;
  invoicedNet: string | number;
  collected: string | number;
  outstanding: string | number;
  collectionPercentage: string;
}

export interface StudentAccountData {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    dob?: string | Date;
    gender?: string;
    currentEnrollment?: {
      id?: string;
      section?: {
        name: string;
        class?: {
          name: string;
        };
      };
    } | null;
  };
  summary: {
    totalGross: string | number;
    totalConcessions: string | number;
    totalNet: string | number;
    totalPaid: string | number;
    totalRefunded: string | number;
    outstandingAmount: string | number;
  };
  invoices: Invoice[];
  payments?: PaymentItem[];
}

export type TabType =
  "overview" | "invoices" | "structures" | "heads" | "reports" | "student-account";

export interface FeesClientProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  userRole: string;
  userName: string;
  userId?: string;
  activeAcademicYear: { id: string; name: string } | null;
  allAcademicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classes: Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>;
}

export function FeesClient({
  schoolSlug,
  schoolName,
  schoolCode,
  userRole,
  userName,
  activeAcademicYear,
  allAcademicYears,
  classes,
}: FeesClientProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Filter States
  const [selectedYearId, setSelectedYearId] = useState<string>(activeAcademicYear?.id || "");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [overview, setOverview] = useState<FinancialOverviewData | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHeadItem[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassWiseSummary[]>([]);
  const [collectionsReport, setCollectionsReport] = useState<PaymentItem[]>([]);

  // Student Account State
  const [studentSearchAdmission, setStudentSearchAdmission] = useState<string>("");
  const [studentAccount, setStudentAccount] = useState<StudentAccountData | null>(null);
  const [loadingStudentAccount, setLoadingStudentAccount] = useState<boolean>(false);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [showHeadModal, setShowHeadModal] = useState<boolean>(false);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showConcessionModal, setShowConcessionModal] = useState<boolean>(false);
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Selected Target for Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);

  // Forms State
  const [newHead, setNewHead] = useState({ name: "", code: "", description: "" });
  const [newStructure, setNewStructure] = useState({
    name: "",
    academicYearId: activeAcademicYear?.id || "",
    classId: "",
    frequency: "TERM" as FeeFrequency,
    dueDate: "",
    items: [{ feeHeadId: "", amount: "" }],
  });
  const [generateForm, setGenerateForm] = useState({
    feeStructureId: "",
    academicYearId: activeAcademicYear?.id || "",
    classId: "",
    billingPeriod: "Term 1",
    dueDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH" as PaymentMethod,
    transactionReference: "",
    remarks: "",
  });
  const [concessionForm, setConcessionForm] = useState({
    type: "CONCESSION" as AdjustmentType,
    amount: "",
    reason: "",
  });
  const [refundForm, setRefundForm] = useState({
    amount: "",
    reason: "",
    reference: "",
    refundMethod: "CASH" as RefundMethod,
  });
  const [cancelReason, setCancelReason] = useState("");

  const isSchoolAdmin = userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN";

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  }, []);

  // Format currency
  const fmt = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "₹0.00";
    const num = Number(v);
    return isNaN(num)
      ? "₹0.00"
      : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
  };

  // Status Badge
  const getInvoiceBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "PAID":
        return <Badge variant="paid">Paid</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="partial">Partially Paid</Badge>;
      case "OVERDUE":
        return <Badge variant="due">Overdue</Badge>;
      case "CANCELLED":
        return <Badge variant="alert">Cancelled</Badge>;
      case "REFUNDED":
        return <Badge variant="emerald">Refunded</Badge>;
      default:
        return <Badge variant="default">Issued</Badge>;
    }
  };

  // Fetch Data Handlers
  const fetchOverview = useCallback(async () => {
    try {
      const url = new URL(`/api/v1/school/${schoolSlug}/fees/overview`, window.location.origin);
      if (selectedYearId) url.searchParams.set("academicYearId", selectedYearId);
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setOverview(json.data);
      }
    } catch (err) {
      console.error("Failed to load overview", err);
    }
  }, [schoolSlug, selectedYearId]);

  const fetchFeeHeads = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/fees/heads`);
      if (res.ok) {
        const json = await res.json();
        setFeeHeads(json.data);
      }
    } catch (err) {
      console.error("Failed to load fee heads", err);
    }
  }, [schoolSlug]);

  const fetchFeeStructures = useCallback(async () => {
    try {
      const url = new URL(`/api/v1/school/${schoolSlug}/fees/structures`, window.location.origin);
      if (selectedYearId) url.searchParams.set("academicYearId", selectedYearId);
      if (selectedClassId) url.searchParams.set("classId", selectedClassId);
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setFeeStructures(json.data);
      }
    } catch (err) {
      console.error("Failed to load fee structures", err);
    }
  }, [schoolSlug, selectedYearId, selectedClassId]);

  const fetchInvoices = useCallback(async () => {
    try {
      const url = new URL(`/api/v1/school/${schoolSlug}/fees/invoices`, window.location.origin);
      if (selectedYearId) url.searchParams.set("academicYearId", selectedYearId);
      if (selectedClassId) url.searchParams.set("classId", selectedClassId);
      if (selectedStatus) url.searchParams.set("status", selectedStatus);
      if (searchQuery) url.searchParams.set("search", searchQuery);
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data);
      }
    } catch (err) {
      console.error("Failed to load invoices", err);
    }
  }, [schoolSlug, selectedYearId, selectedClassId, selectedStatus, searchQuery]);

  const fetchReports = useCallback(async () => {
    try {
      const url = new URL(
        `/api/v1/school/${schoolSlug}/fees/reports/class-summary`,
        window.location.origin
      );
      if (selectedYearId) url.searchParams.set("academicYearId", selectedYearId);
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setClassSummaries(json.data);
      }

      const colRes = await fetch(`/api/v1/school/${schoolSlug}/fees/reports/collections`);
      if (colRes.ok) {
        const colJson = await colRes.json();
        setCollectionsReport(colJson.data);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    }
  }, [schoolSlug, selectedYearId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await Promise.all([
        fetchOverview(),
        fetchFeeHeads(),
        fetchFeeStructures(),
        fetchInvoices(),
        fetchReports(),
      ]);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchFeeHeads, fetchFeeStructures, fetchInvoices, fetchReports]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshAll]);

  // Handle Search Student Account
  const handleSearchStudentAccount = async () => {
    if (!studentSearchAdmission.trim()) return;
    setLoadingStudentAccount(true);
    setStudentAccount(null);
    try {
      // Find student by admission number
      const sRes = await fetch(
        `/api/v1/school/${schoolSlug}/students?search=${encodeURIComponent(studentSearchAdmission.trim())}`
      );
      if (!sRes.ok) throw new Error("Student search failed");
      const sJson = await sRes.json();
      const students = sJson.data?.students || sJson.data || [];
      if (students.length === 0) {
        throw new Error(`No student found with query '${studentSearchAdmission}'`);
      }
      const targetStudent = students[0];

      const accRes = await fetch(`/api/v1/school/${schoolSlug}/fees/students/${targetStudent.id}`);
      if (!accRes.ok) throw new Error("Failed to load student fee ledger");
      const accJson = await accRes.json();
      setStudentAccount(accJson.data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not retrieve student fee account"
      );
    } finally {
      setLoadingStudentAccount(false);
    }
  };

  // Submit Handlers
  const handleCreateFeeHead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/fees/heads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHead),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create fee head");

      showToast(`Fee Head '${json.data.name}' created successfully`);
      setShowHeadModal(false);
      setNewHead({ name: "", code: "", description: "" });
      fetchFeeHeads();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create fee head");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const validItems = newStructure.items.filter((it) => it.feeHeadId && it.amount);
      if (validItems.length === 0) {
        throw new Error("Please add at least one fee head with a valid amount");
      }

      const res = await fetch(`/api/v1/school/${schoolSlug}/fees/structures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newStructure,
          classId: newStructure.classId || null,
          items: validItems.map((it) => ({
            feeHeadId: it.feeHeadId,
            amount: parseFloat(it.amount),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create fee structure");

      showToast(`Fee Structure '${json.data.name}' created successfully`);
      setShowStructureModal(false);
      setNewStructure({
        name: "",
        academicYearId: activeAcademicYear?.id || "",
        classId: "",
        frequency: "TERM",
        dueDate: "",
        items: [{ feeHeadId: "", amount: "" }],
      });
      fetchFeeStructures();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create fee structure");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/fees/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...generateForm,
          classId: generateForm.classId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to generate invoices");

      showToast(`Successfully generated ${json.data.generatedCount} student invoice(s)`);
      setShowGenerateModal(false);
      fetchInvoices();
      fetchOverview();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate invoices");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/fees/invoices/${selectedInvoice.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(paymentForm.amount),
            paymentMethod: paymentForm.paymentMethod,
            transactionReference: paymentForm.transactionReference,
            remarks: paymentForm.remarks,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to collect payment");

      setShowPaymentModal(false);
      setCurrentReceipt(json.data.receipt);
      setShowReceiptModal(true);
      showToast(`Payment recorded! Receipt #${json.data.receipt.receiptNumber}`);
      fetchInvoices();
      fetchOverview();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to collect payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/fees/invoices/${selectedInvoice.id}/adjustments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: concessionForm.type,
            amount: parseFloat(concessionForm.amount),
            reason: concessionForm.reason,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to apply concession");

      showToast(`Concession of ${fmt(json.data.amount)} applied successfully`);
      setShowConcessionModal(false);
      fetchInvoices();
      fetchOverview();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to apply concession");
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/fees/invoices/${selectedInvoice.id}/refunds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(refundForm.amount),
            reason: refundForm.reason,
            reference: refundForm.reference,
            refundMethod: refundForm.refundMethod,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to process refund");

      showToast(`Refund #${json.data.refundNumber} of ${fmt(json.data.amount)} processed`);
      setShowRefundModal(false);
      fetchInvoices();
      fetchOverview();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/fees/invoices/${selectedInvoice.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to cancel invoice");

      showToast(`Invoice ${selectedInvoice.invoiceNumber} cancelled`);
      setShowCancelModal(false);
      setCancelReason("");
      fetchInvoices();
      fetchOverview();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to cancel invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const openCollectPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const bal = Number(inv.outstandingAmount ?? Number(inv.netAmount) - Number(inv.paidAmount));
    setPaymentForm({
      amount: String(bal > 0 ? bal : ""),
      paymentMethod: "CASH",
      transactionReference: "",
      remarks: "",
    });
    setShowPaymentModal(true);
  };

  const openConcessionModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setConcessionForm({
      type: "CONCESSION",
      amount: "",
      reason: "",
    });
    setShowConcessionModal(true);
  };

  const openRefundModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const paid = Number(inv.paidAmount) - Number(inv.refundedAmount || 0);
    setRefundForm({
      amount: String(paid > 0 ? paid : ""),
      reason: "",
      reference: "",
      refundMethod: "CASH",
    });
    setShowRefundModal(true);
  };

  const openCancelModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const openDetailModal = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/fees/invoices/${inv.id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedInvoice(json.data);
        setShowDetailModal(true);
      }
    } catch {
      setSelectedInvoice(inv);
      setShowDetailModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/20">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Fees & Finance Management
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Fee heads, billing schedules, automated student invoices, partial payment
                reconciliation & receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50"
            title="Refresh financial data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (invoices.length > 0) openCollectPaymentModal(invoices[0]);
              else setActiveTab("invoices");
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-colors hover:bg-amber-700"
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Collect Payment</span>
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md shadow-slate-900/20 transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Invoices</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="font-bold text-rose-600 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Session Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            <span>Session:</span>
          </div>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
          >
            {allAcademicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Layers className="h-3.5 w-3.5 text-amber-600" />
            <span>Class:</span>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">Role:</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
            {userRole}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex space-x-1 overflow-x-auto border-b border-slate-200 pb-px">
        {[
          { id: "overview" as const, label: "Dashboard", icon: CreditCard },
          { id: "invoices" as const, label: "Invoices & Ledger", icon: FileText },
          { id: "structures" as const, label: "Fee Structures", icon: Layers },
          { id: "heads" as const, label: "Fee Heads", icon: SlidersHorizontal },
          { id: "student-account" as const, label: "Student Ledger", icon: User },
          { id: "reports" as const, label: "Collection Reports", icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? "rounded-t-xl border-amber-600 bg-amber-50/50 text-amber-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-amber-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OVERVIEW & DASHBOARD                                          */}
      {/* ==================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Financial Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Gross Invoiced"
              value={fmt(overview?.invoicedGross || 0)}
              subtitle={`${overview?.totalInvoices || 0} active student invoices`}
              variant="default"
              icon={FileText}
            />
            <StatCard
              title="Net Collections"
              value={fmt(overview?.netCollections || 0)}
              subtitle={`Gross collected: ${fmt(overview?.amountCollected || 0)}`}
              variant="emerald"
              icon={CheckCircle2}
            />
            <StatCard
              title="Outstanding Balance"
              value={fmt(overview?.outstandingAmount || 0)}
              subtitle={`${overview?.counts?.overdue || 0} overdue invoices`}
              variant="alert"
              icon={AlertTriangle}
            />
            <StatCard
              title="Concessions & Refunds"
              value={fmt(overview?.concessions || 0)}
              subtitle={`Refunds processed: ${fmt(overview?.totalRefunds || 0)}`}
              variant="default"
              icon={Percent}
            />
          </div>

          {/* Breakdown & Quick Status Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Status Breakdown */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
                Invoice Status Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">Fully Paid</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700">
                    {overview?.counts?.paid || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-amber-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-800">Partially Paid</span>
                  </div>
                  <span className="text-xs font-black text-amber-700">
                    {overview?.counts?.partiallyPaid || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-rose-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-800">Overdue Liabilities</span>
                  </div>
                  <span className="text-xs font-black text-rose-700">
                    {overview?.counts?.overdue || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-800">Issued / Current</span>
                  </div>
                  <span className="text-xs font-black text-slate-700">
                    {overview?.counts?.issued || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
                Collections by Payment Method
              </h3>
              {overview?.paymentMethods && Object.keys(overview.paymentMethods).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(overview.paymentMethods).map(([method, total]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                    >
                      <span className="text-xs font-bold text-slate-700">
                        {method.replace("_", " ")}
                      </span>
                      <span className="text-xs font-black text-slate-900">{fmt(total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                  <CreditCard className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No payment records yet</p>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-5 shadow-xs">
              <div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                  Cashier & Accounting Desk
                </span>
                <h3 className="mt-2 text-base font-black text-slate-900">
                  Instant Payment Counter
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Collect partial or full fees with offline cashier receipts, bank reconciliations,
                  and verified remaining balances.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    if (invoices.length > 0) openCollectPaymentModal(invoices[0]);
                    else setActiveTab("invoices");
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Record Fee Collection</span>
                </button>
                <button
                  onClick={() => setActiveTab("student-account")}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-2 text-xs font-bold text-amber-900 hover:bg-amber-50"
                >
                  <User className="h-4 w-4 text-amber-700" />
                  <span>Lookup Student Fee Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: INVOICES & LIABILITIES                                        */}
      {/* ==================================================================== */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Action and Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice or student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500"
              >
                <option value="">All Statuses</option>
                <option value="ISSUED">Issued</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Generate Batch Invoices</span>
            </button>
          </div>

          {/* Invoices Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">Concession</th>
                    <th className="px-4 py-3">Net Payable</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{inv.student.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {inv.student.admissionNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {inv.enrollment?.section?.class?.name || "All"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fmt(inv.grossAmount)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">
                          {Number(inv.concessionAmount) > 0 ? `-${fmt(inv.concessionAmount)}` : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{fmt(inv.netAmount)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">
                          {fmt(inv.paidAmount)}
                        </td>
                        <td className="px-4 py-3 font-black text-rose-700">
                          {fmt(
                            inv.outstandingAmount ?? Number(inv.netAmount) - Number(inv.paidAmount)
                          )}
                        </td>
                        <td className="px-4 py-3">{getInvoiceBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetailModal(inv)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="View Invoice Detail"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                              <button
                                onClick={() => openCollectPaymentModal(inv)}
                                className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                              >
                                Collect
                              </button>
                            )}

                            {isSchoolAdmin &&
                              inv.status !== "PAID" &&
                              inv.status !== "CANCELLED" && (
                                <button
                                  onClick={() => openConcessionModal(inv)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  title="Apply Concession"
                                >
                                  <Percent className="h-4 w-4" />
                                </button>
                              )}

                            {isSchoolAdmin && Number(inv.paidAmount) > 0 && (
                              <button
                                onClick={() => openRefundModal(inv)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Process Refund"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            {isSchoolAdmin && inv.status !== "CANCELLED" && (
                              <button
                                onClick={() => openCancelModal(inv)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Cancel Invoice"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-xs font-semibold">No invoices found matching criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FEE STRUCTURES                                                */}
      {/* ==================================================================== */}
      {activeTab === "structures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configured Fee Schedules</h2>
              <p className="text-xs text-slate-500">
                Templates mapped to classes and academic sessions for automated invoice issuance.
              </p>
            </div>
            {isSchoolAdmin && (
              <button
                onClick={() => setShowStructureModal(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Fee Structure</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feeStructures.length > 0 ? (
              feeStructures.map((structure) => (
                <div
                  key={structure.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {structure.frequency}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-slate-900">
                          {structure.name}
                        </h3>
                      </div>
                      <span className="text-sm font-black text-amber-700">
                        {fmt(structure.totalAmount)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Class:{" "}
                      <span className="font-semibold text-slate-700">
                        {structure.class?.name || "All Classes"}
                      </span>{" "}
                      • Session:{" "}
                      <span className="font-semibold text-slate-700">
                        {structure.academicYear.name}
                      </span>
                    </p>

                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Included Heads
                      </p>
                      {structure.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-xs text-slate-600">
                          <span>{it.feeHead.name}</span>
                          <span className="font-medium text-slate-800">{fmt(it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-medium text-slate-400">
                      {structure._count?.invoices || 0} invoices generated
                    </span>
                    <button
                      onClick={() => {
                        setGenerateForm({
                          ...generateForm,
                          feeStructureId: structure.id,
                          academicYearId: structure.academicYear.id,
                          classId: structure.class?.id || "",
                        });
                        setShowGenerateModal(true);
                      }}
                      className="cursor-pointer text-xs font-bold text-amber-700 hover:text-amber-800"
                    >
                      Issue Invoices →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400">
                <Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-xs font-semibold">No fee structures configured yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: FEE HEADS                                                     */}
      {/* ==================================================================== */}
      {activeTab === "heads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Catalog of Fee Heads</h2>
              <p className="text-xs text-slate-500">
                Define standard billing heads such as Tuition, Laboratory, Transport, Examination,
                Library.
              </p>
            </div>
            {isSchoolAdmin && (
              <button
                onClick={() => setShowHeadModal(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Fee Head</span>
              </button>
            )}
          </div>

          {!isSchoolAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Only School Administrators can add or edit fee heads. Accountants have read-only
              access.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3">Head Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Active Structures</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {feeHeads.length > 0 ? (
                  feeHeads.map((head) => (
                    <tr key={head.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{head.name}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        {head.code || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{head.description || "—"}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {head._count?.structureItems || 0} structures
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            head.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {head.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-xs font-semibold">No fee heads defined yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: STUDENT FEE ACCOUNT / LEDGER                                  */}
      {/* ==================================================================== */}
      {activeTab === "student-account" && (
        <div className="space-y-6">
          {/* Student Search Box */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">
                Student Name or Admission Number
              </label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. ADM-FEE-001 or Alice..."
                  value={studentSearchAdmission}
                  onChange={(e) => setStudentSearchAdmission(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchStudentAccount()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              onClick={handleSearchStudentAccount}
              disabled={loadingStudentAccount}
              className="mt-5 flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
            >
              {loadingStudentAccount ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Lookup Ledger</span>
            </button>
          </div>

          {/* Ledger Output */}
          {studentAccount ? (
            <div className="space-y-6">
              {/* Student Summary Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {studentAccount.student.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Admission Number:{" "}
                      <span className="font-mono font-bold text-slate-800">
                        {studentAccount.student.admissionNumber}
                      </span>{" "}
                      • Class:{" "}
                      <span className="font-bold text-slate-800">
                        {studentAccount.student.currentEnrollment?.section?.class?.name || "N/A"}{" "}
                        {studentAccount.student.currentEnrollment?.section?.name || ""}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">
                      Outstanding Dues
                    </p>
                    <p className="text-2xl font-black text-rose-700">
                      {fmt(studentAccount.summary.outstandingAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</p>
                    <p className="text-sm font-bold text-slate-800">
                      {fmt(studentAccount.summary.totalGross)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/50 p-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Concessions</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {fmt(studentAccount.summary.totalConcessions)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/50 p-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {fmt(studentAccount.summary.totalPaid)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/50 p-3">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Refunded</p>
                    <p className="text-sm font-bold text-amber-700">
                      {fmt(studentAccount.summary.totalRefunded)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h4 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
                  Invoice & Billing History
                </h4>
                <div className="space-y-4">
                  {studentAccount.invoices.map((inv: Invoice) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </span>
                          <span className="ml-2 text-xs font-bold text-slate-700">{inv.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getInvoiceBadge(inv.status)}
                          <button
                            onClick={() => openDetailModal(inv)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">Net Payable: </span>
                          <span className="font-bold text-slate-900">{fmt(inv.netAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Paid: </span>
                          <span className="font-bold text-emerald-700">{fmt(inv.paidAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Balance: </span>
                          <span className="font-bold text-rose-700">
                            {fmt(Number(inv.netAmount) - Number(inv.paidAmount))}
                          </span>
                        </div>
                      </div>

                      {/* Payment receipts under this invoice */}
                      {inv.payments && inv.payments.length > 0 && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px]">
                          <p className="mb-1 font-bold text-slate-500">Receipts Generated:</p>
                          {inv.payments.map((p: PaymentItem) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between py-0.5 text-slate-700"
                            >
                              <span className="font-mono font-bold text-slate-900">
                                {p.receiptNumber} ({p.paymentMethod})
                              </span>
                              <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <User className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-xs font-semibold">
                Enter a student admission number to display their ledger
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: REPORTS & SUMMARIES                                           */}
      {/* ==================================================================== */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Class-wise Collection Summary Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
              Class-wise Fee Collection Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase">
                    <th className="py-2.5">Class</th>
                    <th className="py-2.5">Students</th>
                    <th className="py-2.5">Gross Billed</th>
                    <th className="py-2.5">Concessions</th>
                    <th className="py-2.5">Net Billed</th>
                    <th className="py-2.5">Collected</th>
                    <th className="py-2.5">Outstanding</th>
                    <th className="py-2.5">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {classSummaries.map((cs) => (
                    <tr key={cs.classId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-900">{cs.className}</td>
                      <td className="py-3">{cs.studentCount}</td>
                      <td className="py-3">{fmt(cs.invoicedGross)}</td>
                      <td className="py-3 font-semibold text-emerald-600">{fmt(cs.concessions)}</td>
                      <td className="py-3 font-bold">{fmt(cs.invoicedNet)}</td>
                      <td className="py-3 font-bold text-emerald-700">{fmt(cs.collected)}</td>
                      <td className="py-3 font-bold text-rose-700">{fmt(cs.outstanding)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{
                                width: `${Math.min(100, Number(cs.collectionPercentage))}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-bold">{cs.collectionPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Collections Log */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
              Recent Offline Payment Receipts
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase">
                    <th className="py-2.5">Receipt #</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Ref #</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Recorded By</th>
                    <th className="py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {collectionsReport.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                      <td className="py-3 text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {p.invoice?.student?.name || "Student"}
                      </td>
                      <td className="py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-slate-500">
                        {p.transactionReference || "—"}
                      </td>
                      <td className="py-3 font-black text-emerald-700">{fmt(p.amount)}</td>
                      <td className="py-3 text-slate-500">{p.recordedBy?.name || "Staff"}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setCurrentReceipt({
                              receiptNumber: p.receiptNumber,
                              paymentDate: p.paymentDate,
                              amountReceived: p.amount,
                              paymentMethod: p.paymentMethod,
                              transactionReference: p.transactionReference,
                              remarks: p.remarks,
                              invoiceNumber: p.invoice?.invoiceNumber,
                              invoiceTitle: p.invoice?.title,
                              schoolName: schoolName,
                              studentName: p.invoice?.student?.name,
                              admissionNumber: p.invoice?.student?.admissionNumber,
                              className: p.invoice?.enrollment?.section?.class?.name,
                              sectionName: p.invoice?.enrollment?.section?.name,
                              invoicedAmount: p.invoice?.netAmount,
                              totalPaid: p.invoice?.paidAmount,
                              remainingBalance:
                                Number(p.invoice?.netAmount || 0) -
                                Number(p.invoice?.paidAmount || 0),
                              recordedByName: p.recordedBy?.name,
                            });
                            setShowReceiptModal(true);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CREATE FEE HEAD                                             */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showHeadModal}
        onClose={() => setShowHeadModal(false)}
        title="Create New Fee Head"
      >
        <form onSubmit={handleCreateFeeHead} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Fee Head Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tuition Fee"
              value={newHead.name}
              onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Code (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TUIT"
              value={newHead.code}
              onChange={(e) => setNewHead({ ...newHead, code: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium uppercase outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={2}
              placeholder="Detailed description..."
              value={newHead.description}
              onChange={(e) => setNewHead({ ...newHead, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowHeadModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? "Creating..." : "Save Fee Head"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE FEE STRUCTURE                                        */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        title="Create Fee Structure Template"
      >
        <form onSubmit={handleCreateFeeStructure} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Structure Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Class 10 Annual 2026-27"
                value={newStructure.name}
                onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Academic Session *
              </label>
              <select
                value={newStructure.academicYearId}
                onChange={(e) =>
                  setNewStructure({ ...newStructure, academicYearId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                {allAcademicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Applicable Class
              </label>
              <select
                value={newStructure.classId}
                onChange={(e) => setNewStructure({ ...newStructure, classId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                <option value="">All Classes (School-wide)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Billing Frequency
              </label>
              <select
                value={newStructure.frequency}
                onChange={(e) =>
                  setNewStructure({ ...newStructure, frequency: e.target.value as FeeFrequency })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                <option value="TERM">Term-wise</option>
                <option value="ANNUAL">Annual</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ONE_TIME">One-Time</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={newStructure.dueDate}
                onChange={(e) => setNewStructure({ ...newStructure, dueDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Dynamic Items Builder */}
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                Fee Heads & Fixed Amounts
              </label>
              <button
                type="button"
                onClick={() =>
                  setNewStructure({
                    ...newStructure,
                    items: [...newStructure.items, { feeHeadId: "", amount: "" }],
                  })
                }
                className="cursor-pointer text-[11px] font-bold text-amber-700 hover:text-amber-800"
              >
                + Add Another Head
              </button>
            </div>

            <div className="space-y-2">
              {newStructure.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    required
                    value={item.feeHeadId}
                    onChange={(e) => {
                      const updated = [...newStructure.items];
                      updated[idx].feeHeadId = e.target.value;
                      setNewStructure({ ...newStructure, items: updated });
                    }}
                    className="flex-1 rounded-xl border border-slate-200 p-2 text-xs font-medium outline-none focus:border-amber-500"
                  >
                    <option value="">Select Fee Head</option>
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.code ? `(${h.code})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-36">
                    <span className="absolute top-2 left-2.5 text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...newStructure.items];
                        updated[idx].amount = e.target.value;
                        setNewStructure({ ...newStructure, items: updated });
                      }}
                      className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-6 text-xs font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  {newStructure.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newStructure.items.filter((_, i) => i !== idx);
                        setNewStructure({ ...newStructure, items: updated });
                      }}
                      className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowStructureModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? "Saving..." : "Create Fee Structure"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: GENERATE INVOICES                                           */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Issue Student Invoices"
      >
        <form onSubmit={handleGenerateInvoices} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Fee Structure *</label>
            <select
              required
              value={generateForm.feeStructureId}
              onChange={(e) => {
                const selected = feeStructures.find((s) => s.id === e.target.value);
                setGenerateForm({
                  ...generateForm,
                  feeStructureId: e.target.value,
                  classId: selected?.class?.id || "",
                });
              }}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="">Select fee structure...</option>
              {feeStructures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({fmt(s.totalAmount)}) - {s.class?.name || "All Classes"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Billing Period</label>
              <input
                type="text"
                placeholder="e.g. Term 1 2026"
                value={generateForm.billingPeriod}
                onChange={(e) =>
                  setGenerateForm({ ...generateForm, billingPeriod: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={generateForm.dueDate}
                onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
            <p className="mb-1 font-bold">Immutable Snapshot Guarantee</p>
            <p className="text-[11px] text-amber-800">
              Invoices are issued as immutable snapshots. Subsequent changes to fee heads or
              structures will never rewrite historical liabilities. Duplicate prevention prevents
              generating multiple invoices for the same student and term.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {actionLoading ? "Generating..." : "Generate Invoices"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 4: COLLECT PAYMENT & RECEIPT                                   */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Offline Fee Collection"
      >
        {selectedInvoice && (
          <form onSubmit={handleCollectPayment} className="space-y-4">
            {/* Invoice Summary Pill */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedInvoice.student.name}
                  </h4>
                  <p className="font-mono text-[11px] text-slate-400">
                    Adm: {selectedInvoice.student.admissionNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Outstanding
                  </span>
                  <p className="text-lg font-black text-rose-700">
                    {fmt(
                      selectedInvoice.outstandingAmount ??
                        Number(selectedInvoice.netAmount) - Number(selectedInvoice.paidAmount)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Amount to Collect (₹) *
              </label>
              <div className="relative">
                <span className="absolute top-2.5 left-3 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-8 text-sm font-black text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Payment Mode *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value as PaymentMethod,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DEMAND_DRAFT">Demand Draft</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Reference / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-998877 or CHQ-0012"
                  value={paymentForm.transactionReference}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, transactionReference: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Remarks / Ledger Notes
              </label>
              <input
                type="text"
                placeholder="Optional cashier remarks..."
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Collect & Print Receipt"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 5: PRINTABLE RECEIPT                                           */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Fee Collection Receipt"
        maxWidth="max-w-xl"
      >
        {currentReceipt && (
          <div className="space-y-6">
            {/* Printable Receipt Card */}
            <div
              id="printable-fee-receipt"
              className="rounded-2xl border border-slate-200 bg-white p-6 font-sans shadow-xs"
            >
              {/* Receipt Header */}
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                  {currentReceipt.schoolName || schoolName}
                </h2>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Affiliated Institution • School Code: {schoolCode}
                </p>
                <div className="mt-2 inline-block rounded-md bg-slate-900 px-3 py-0.5 text-[10px] font-black tracking-widest text-white uppercase">
                  Fee Payment Receipt
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="my-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Receipt Number:</p>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {currentReceipt.receiptNumber}
                  </p>
                  <p className="mt-2 text-slate-400">Payment Date:</p>
                  <p className="font-semibold text-slate-800">
                    {new Date(currentReceipt.paymentDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-slate-400">Invoice Number:</p>
                  <p className="font-mono font-bold text-slate-900">
                    {currentReceipt.invoiceNumber || "—"}
                  </p>
                  <p className="mt-2 text-slate-400">Payment Mode:</p>
                  <p className="font-semibold text-slate-800 uppercase">
                    {currentReceipt.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Student Information Box */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{currentReceipt.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission Number:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentReceipt.admissionNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Class & Section:</span>
                  <span className="font-semibold text-slate-800">
                    {currentReceipt.className || "Class 10"} {currentReceipt.sectionName || "A"}
                  </span>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="my-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
                  Amount Received
                </p>
                <p className="text-2xl font-black text-emerald-700">
                  {fmt(currentReceipt.amountReceived)}
                </p>
                {currentReceipt.transactionReference && (
                  <p className="mt-1 font-mono text-[11px] text-emerald-800">
                    Ref: {currentReceipt.transactionReference}
                  </p>
                )}
              </div>

              {/* Remaining Balance Summary */}
              <div className="space-y-1 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Total Invoiced:</span>
                  <span className="font-semibold text-slate-800">
                    {fmt(currentReceipt.invoicedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Paid to Date:</span>
                  <span className="font-semibold text-emerald-700">
                    {fmt(currentReceipt.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                  <span>Remaining Dues:</span>
                  <span className="text-rose-700">{fmt(currentReceipt.remainingBalance)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 flex justify-between border-t border-slate-200 pt-6 text-[10px] text-slate-400">
                <div>
                  <p>Recorded by: {currentReceipt.recordedByName || userName}</p>
                  <p>Computer generated receipt</p>
                </div>
                <div className="text-right">
                  <div className="mb-1 ml-auto h-8 w-32 border-b border-slate-300" />
                  <p className="font-bold text-slate-600">Authorized Signature</p>
                </div>
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 6: APPLY CONCESSION / ADJUSTMENT                               */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showConcessionModal}
        onClose={() => setShowConcessionModal(false)}
        title="Approve Student Fee Concession"
      >
        {selectedInvoice && (
          <form onSubmit={handleApplyConcession} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-900">{selectedInvoice.student.name}</p>
              <p className="text-slate-500">
                Invoice {selectedInvoice.invoiceNumber} • Gross Amount:{" "}
                {fmt(selectedInvoice.grossAmount)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Concession Category *
                </label>
                <select
                  value={concessionForm.type}
                  onChange={(e) =>
                    setConcessionForm({ ...concessionForm, type: e.target.value as AdjustmentType })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CONCESSION">Fee Concession</option>
                  <option value="SCHOLARSHIP">Merit Scholarship</option>
                  <option value="WAIVER">Special Waiver</option>
                  <option value="DISCOUNT">Sibling Discount</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={concessionForm.amount}
                  onChange={(e) => setConcessionForm({ ...concessionForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Approval Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="State the authorized justification for this concession..."
                value={concessionForm.reason}
                onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowConcessionModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? "Applying..." : "Approve Concession"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 7: PROCESS REFUND                                              */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Process Fee Refund"
      >
        {selectedInvoice && (
          <form onSubmit={handleProcessRefund} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-900">{selectedInvoice.student.name}</p>
              <p className="text-slate-500">
                Collected: {fmt(selectedInvoice.paidAmount)} • Existing Refunds:{" "}
                {fmt(selectedInvoice.refundedAmount || 0)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Refund Method</label>
                <select
                  value={refundForm.refundMethod}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, refundMethod: e.target.value as RefundMethod })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Refund Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="State the audit justification for this refund..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Process Refund"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 8: CANCEL INVOICE                                              */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Student Invoice"
      >
        {selectedInvoice && (
          <form onSubmit={handleCancelInvoice} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <p className="font-bold">Caution: Cancellation is permanent</p>
              <p className="mt-0.5">
                Invoices with active payments cannot be cancelled unless all collections are
                refunded or reversed first.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Enter audit reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 9: INVOICE DETAIL VIEW                                         */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ""}`}
        maxWidth="max-w-2xl"
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header Card */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedInvoice.title}</h4>
                <p className="text-slate-500">
                  Student:{" "}
                  <span className="font-bold text-slate-800">{selectedInvoice.student.name}</span> (
                  {selectedInvoice.student.admissionNumber})
                </p>
              </div>
              <div>{getInvoiceBadge(selectedInvoice.status)}</div>
            </div>

            {/* Line Items Breakdown */}
            <div>
              <h5 className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Fee Items Breakdown
              </h5>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                      <th className="p-2.5">Head</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium">{it.headName}</td>
                        <td className="p-2.5 text-right font-bold">{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 font-semibold">
              <div>Gross Amount:</div>
              <div className="text-right text-slate-900">{fmt(selectedInvoice.grossAmount)}</div>
              <div>Approved Concessions:</div>
              <div className="text-right text-emerald-700">
                -{fmt(selectedInvoice.concessionAmount)}
              </div>
              <div className="border-t border-slate-200 pt-1 font-bold">Net Payable:</div>
              <div className="border-t border-slate-200 pt-1 text-right font-bold text-slate-900">
                {fmt(selectedInvoice.netAmount)}
              </div>
              <div>Total Paid:</div>
              <div className="text-right font-bold text-emerald-700">
                {fmt(selectedInvoice.paidAmount)}
              </div>
              <div className="border-t border-slate-200 pt-1 font-black text-rose-700">
                Outstanding:
              </div>
              <div className="border-t border-slate-200 pt-1 text-right font-black text-rose-700">
                {fmt(
                  selectedInvoice.outstandingAmount ??
                    Number(selectedInvoice.netAmount) - Number(selectedInvoice.paidAmount)
                )}
              </div>
            </div>

            {/* Payments History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div>
                <h5 className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Collections History
                </h5>
                <div className="space-y-1.5">
                  {selectedInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </span>
                        <span className="ml-2 text-slate-500">({p.paymentMethod})</span>
                        {p.isReversed && (
                          <span className="ml-2 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800">
                            REVERSED
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FeesClient;
