"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Badge } from "@/components/common/Badge";
import type {
  FeeFrequency,
  InvoiceStatus,
  PaymentMethod,
  AdjustmentType,
  RefundMethod,
  FeeHeadItem,
  FeeStructure,
  PaymentItem,
  Invoice,
  FinancialOverviewData,
  ReceiptData,
  ClassWiseSummary,
  StudentAccountData,
  TabType,
  FeesClientProps,
} from "./FeesTypes";

export function useFeesController({
  schoolSlug,
  schoolName,
  schoolCode,
  userRole,
  userName,
  activeAcademicYear,
  allAcademicYears,
  classes,
}: FeesClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [, startTabTransition] = useTransition();

  const handleTabSwitch = useCallback((tab: TabType) => {
    startTabTransition(() => {
      setActiveTab(tab);
    });
  }, []);

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

  return {
    schoolSlug,
    schoolName,
    schoolCode,
    userRole,
    userName,
    activeAcademicYear,
    allAcademicYears,
    classes,
    activeTab,
    setActiveTab,
    startTabTransition,
    handleTabSwitch,
    selectedYearId,
    setSelectedYearId,
    selectedClassId,
    setSelectedClassId,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    overview,
    setOverview,
    feeHeads,
    setFeeHeads,
    feeStructures,
    setFeeStructures,
    invoices,
    setInvoices,
    classSummaries,
    setClassSummaries,
    collectionsReport,
    setCollectionsReport,
    studentSearchAdmission,
    setStudentSearchAdmission,
    studentAccount,
    setStudentAccount,
    loadingStudentAccount,
    setLoadingStudentAccount,
    loading,
    setLoading,
    actionLoading,
    setActionLoading,
    errorMessage,
    setErrorMessage,
    successToast,
    setSuccessToast,
    showHeadModal,
    setShowHeadModal,
    showStructureModal,
    setShowStructureModal,
    showGenerateModal,
    setShowGenerateModal,
    showPaymentModal,
    setShowPaymentModal,
    showConcessionModal,
    setShowConcessionModal,
    showRefundModal,
    setShowRefundModal,
    showCancelModal,
    setShowCancelModal,
    showDetailModal,
    setShowDetailModal,
    showReceiptModal,
    setShowReceiptModal,
    selectedInvoice,
    setSelectedInvoice,
    currentReceipt,
    setCurrentReceipt,
    newHead,
    setNewHead,
    newStructure,
    setNewStructure,
    generateForm,
    setGenerateForm,
    paymentForm,
    setPaymentForm,
    concessionForm,
    setConcessionForm,
    refundForm,
    setRefundForm,
    cancelReason,
    setCancelReason,
    isSchoolAdmin,
    showToast,
    fmt,
    getInvoiceBadge,
    fetchOverview,
    fetchFeeHeads,
    fetchFeeStructures,
    fetchInvoices,
    fetchReports,
    refreshAll,
    handleSearchStudentAccount,
    handleCreateFeeHead,
    handleCreateFeeStructure,
    handleGenerateInvoices,
    handleCollectPayment,
    handleApplyConcession,
    handleProcessRefund,
    handleCancelInvoice,
    openCollectPaymentModal,
    openConcessionModal,
    openRefundModal,
    openCancelModal,
    openDetailModal,
  };
}

export type FeesController = ReturnType<typeof useFeesController>;
