"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Bell,
  Building,
  Briefcase,
  HelpCircle,
  X,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentTabs, TabItem } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast, confirmModal } from "@/lib/toast";

interface EmailSettingData {
  id?: number;
  smtp_host?: string | null;
  smtp_port: number;
  smtp_user?: string | null;
  smtp_username?: string | null;
  sender_email?: string | null;
  from_email?: string | null;
  sender_name?: string | null;
  from_name?: string | null;
  use_tls: boolean;
  use_ssl: boolean;
  is_active: boolean;
}

interface StaffRecipient {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  notification_types: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AVAILABLE_NOTIFICATION_TOPICS = [
  { id: "lr_booking", label: "Lorry Receipt (LR) Booking", desc: "Alert when a new LR/GR consignment note is generated" },
  { id: "job_order", label: "Job Orders & Indents", desc: "Alert when client cargo indents and trip bookings are placed" },
  { id: "hire_challan", label: "Lorry Hire Challan", desc: "Alert when a third-party market vehicle is contracted" },
  { id: "invoicing", label: "GST Transport Invoices", desc: "Alert when freight sales tax invoices are created" },
  { id: "pod_delivery", label: "Proof of Delivery (POD)", desc: "Alert when consignee acknowledgement is uploaded or verified" },
  { id: "daily_summary", label: "Daily Operations Digest", desc: "End-of-day multi-branch consignment and revenue summary" },
];

export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<"smtp" | "recipients">("smtp");

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [isActiveGateway, setIsActiveGateway] = useState(true);

  const [isLoadingSmtp, setIsLoadingSmtp] = useState(true);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Staff Recipients State
  const [recipients, setRecipients] = useState<StaffRecipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // Recipient Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<StaffRecipient | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientDept, setRecipientDept] = useState("Operations");
  const [recipientDesignation, setRecipientDesignation] = useState("");
  const [recipientTopics, setRecipientTopics] = useState<string[]>(["lr_booking", "invoicing", "pod_delivery"]);
  const [recipientActive, setRecipientActive] = useState(true);
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Load SMTP Settings
  useEffect(() => {
    async function loadSmtp() {
      setIsLoadingSmtp(true);
      setSmtpError(null);
      try {
        const data = await apiClient<EmailSettingData>("/api/v1/settings/email-settings");
        if (data) {
          setSmtpHost(data.smtp_host || "smtp.gmail.com");
          setSmtpPort(data.smtp_port || 587);
          setSmtpUsername(data.smtp_user || data.smtp_username || "");
          setFromEmail(data.sender_email || data.from_email || "");
          setFromName(data.sender_name || data.from_name || "PantherTMS Dispatch");
          setUseTls(data.use_tls !== false);
          setUseSsl(data.use_ssl === true);
          setIsActiveGateway(data.is_active !== false);
        }
      } catch (err: any) {
        setSmtpError(err.message || "Failed to load SMTP configuration.");
      } finally {
        setIsLoadingSmtp(false);
      }
    }
    loadSmtp();
  }, []);

  // 2. Load Staff Recipients
  const fetchRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      const data = await apiClient<StaffRecipient[]>("/api/v1/settings/email-recipients");
      if (Array.isArray(data)) {
        setRecipients(data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff recipients.");
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  // Save SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpError(null);
    setTestResult(null);

    try {
      await apiClient("/api/v1/settings/email-settings", {
        method: "PUT",
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUsername || null,
          smtp_password: smtpPassword || undefined,
          sender_email: fromEmail || null,
          sender_name: fromName || null,
          use_tls: useTls,
          use_ssl: useSsl,
          is_active: isActiveGateway,
        }),
      });

      setSmtpSaved(true);
      toast.success("Outbound SMTP settings saved successfully.");
      setSmtpPassword("");
      setTimeout(() => setSmtpSaved(false), 4000);
    } catch (err: any) {
      setSmtpError(err.message || "Failed to update email gateway configuration.");
      toast.error(err.message || "Failed to save SMTP settings.");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) {
      toast.error("Please enter a valid recipient email address for the test.");
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await apiClient<{ success: boolean; message: string }>("/api/v1/settings/email-settings/test", {
        method: "POST",
        body: JSON.stringify({
          recipient_email: testRecipient,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUsername || null,
          smtp_password: smtpPassword || undefined,
          sender_email: fromEmail || null,
          sender_name: fromName || null,
          use_tls: useTls,
          use_ssl: useSsl,
        }),
      });

      setTestResult(res);
      if (res.success) {
        toast.success("Test email delivered successfully!");
      } else {
        toast.error("SMTP Test failed: " + res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Test email delivery failed.",
      });
      toast.error(err.message || "Test email delivery failed.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Open Add Recipient Modal
  const handleOpenAddRecipient = () => {
    setEditingRecipient(null);
    setRecipientName("");
    setRecipientEmail("");
    setRecipientDept("Operations");
    setRecipientDesignation("");
    setRecipientTopics(["lr_booking", "invoicing", "pod_delivery"]);
    setRecipientActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Recipient Modal
  const handleOpenEditRecipient = (r: StaffRecipient) => {
    setEditingRecipient(r);
    setRecipientName(r.name);
    setRecipientEmail(r.email);
    setRecipientDept(r.department || "Operations");
    setRecipientDesignation(r.designation || "");
    setRecipientTopics(r.notification_types || []);
    setRecipientActive(r.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Toggle Notification Topic
  const handleToggleTopic = (topicId: string) => {
    setRecipientTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Save Recipient (Create or Update)
  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setModalError("Please provide both staff member name and email address.");
      return;
    }

    setIsSavingRecipient(true);
    setModalError(null);

    try {
      const payload = {
        name: recipientName.trim(),
        email: recipientEmail.trim(),
        department: recipientDept || "Operations",
        designation: recipientDesignation.trim() || null,
        notification_types: recipientTopics,
        is_active: recipientActive,
      };

      if (editingRecipient) {
        await apiClient(`/api/v1/settings/email-recipients/${editingRecipient.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Updated notification routing for ${recipientName}.`);
      } else {
        await apiClient("/api/v1/settings/email-recipients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Registered ${recipientName} as staff alert recipient.`);
      }

      setIsModalOpen(false);
      fetchRecipients();
    } catch (err: any) {
      setModalError(err.message || "Failed to save staff recipient.");
    } finally {
      setIsSavingRecipient(false);
    }
  };

  // Delete Recipient
  const handleDeleteRecipient = async (r: StaffRecipient) => {
    const confirmed = await confirmModal({
      title: "Remove Staff Recipient",
      description: `Are you sure you want to remove ${r.name} (${r.email}) from automatic email notifications?`,
      confirmText: "Remove Recipient",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await apiClient(`/api/v1/settings/email-recipients/${r.id}`, { method: "DELETE" });
      toast.success(`Removed ${r.name} from email alerts.`);
      fetchRecipients();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete recipient.");
    }
  };

  // Filtered recipients
  const filteredRecipients = recipients.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = departmentFilter === "ALL" || r.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const tabs: TabItem<"smtp" | "recipients">[] = [
    {
      id: "smtp",
      label: "Outbound Email Gateway (SMTP)",
      icon: <Mail className="w-4 h-4" />,
    },
    {
      id: "recipients",
      label: "Staff Notification Recipients",
      icon: <Users className="w-4 h-4" />,
      badge: recipients.length > 0 ? recipients.length : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Settings & Notification Routing"
        description="Configure your outbound SMTP sender parameters, verify connection with a test email, and manage staff recipients who receive operational and billing notifications."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings/admin" },
          { label: "Email Settings" },
        ]}
      />

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <SegmentTabs<"smtp" | "recipients">
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          variant="underlined"
        />
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OUTBOUND EMAIL GATEWAY (SMTP)                                */}
      {/* ==================================================================== */}
      {activeTab === "smtp" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Outbound SMTP Gateway Parameters
                    </h4>
                    <p className="text-xs text-slate-500">
                      All system emails (LR copies, freight invoices, PODs) are dispatched through this server.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActiveGateway}
                    onChange={(e) => setIsActiveGateway(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Gateway Active</span>
                </label>
              </div>

              {smtpSaved && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>SMTP gateway parameters saved successfully. Automated notifications will use these settings.</span>
                </div>
              )}

              {smtpError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{smtpError}</span>
                </div>
              )}

              {isLoadingSmtp ? (
                <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading gateway parameters...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Sender Display Name"
                      placeholder="e.g. Panther Logistics Billing"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      required
                    />
                    <Input
                      label="From Email Address (Sender)"
                      type="email"
                      placeholder="e.g. dispatch@panthertrans.com"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="SMTP Host / Server"
                        placeholder="smtp.gmail.com or smtp.office365.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="SMTP Port"
                      type="number"
                      placeholder="587"
                      value={String(smtpPort)}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="SMTP Username / Login Email"
                      placeholder="Enter username or email address"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      autoComplete="off"
                    />
                    <div className="relative">
                      <Input
                        label="SMTP Password / App Secret"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useTls}
                        onChange={(e) => {
                          setUseTls(e.target.checked);
                          if (e.target.checked) setUseSsl(false);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Enable STARTTLS (Standard for Port 587)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSsl}
                        onChange={(e) => {
                          setUseSsl(e.target.checked);
                          if (e.target.checked) setUseTls(false);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Enable Direct SSL (Standard for Port 465)</span>
                    </label>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Credentials are stored securely and encrypted in your isolated company tenant database.</span>
                  </div>

                  <div className="pt-4 border-t border-[#E4E7EC] dark:border-slate-800 flex justify-end">
                    <Button variant="primary" type="submit" disabled={isSavingSmtp}>
                      {isSavingSmtp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save Email Gateway Settings"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* Right column: Test Connection & Quick Guide */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E4E7EC] dark:border-slate-800">
                <Send className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Verify Gateway Connection
                </h4>
              </div>

              <p className="text-xs text-slate-500">
                Send a test email to verify that your SMTP host, port, credentials, and TLS/SSL settings are working correctly.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-3">
                <Input
                  label="Test Recipient Email"
                  type="email"
                  placeholder="admin@yourcompany.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  required
                />

                <Button
                  variant="outline"
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full justify-center"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing Connection...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send Test Email
                    </>
                  )}
                </Button>
              </form>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                    testResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}
            </Card>

            <Card className="p-6 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Common SMTP Configurations</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                <li>
                  <strong>Gmail / G-Suite</strong>: Host <code className="text-slate-800 dark:text-slate-200 font-mono">smtp.gmail.com</code>, Port 587 (TLS). Note: Requires an <em>App Password</em> if 2-Step Verification is active.
                </li>
                <li>
                  <strong>Microsoft 365</strong>: Host <code className="text-slate-800 dark:text-slate-200 font-mono">smtp.office365.com</code>, Port 587 (TLS).
                </li>
                <li>
                  <strong>Mailgun / Brevo / SendGrid</strong>: Port 587 with your API credentials.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STAFF NOTIFICATION RECIPIENTS                                */}
      {/* ==================================================================== */}
      {activeTab === "recipients" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E7EC] dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Internal Staff Notification Recipients
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure staff members and department heads who automatically receive copies of consignment, trip, and billing events.
                  </p>
                </div>
              </div>

              <Button variant="primary" onClick={handleOpenAddRecipient}>
                <Plus className="w-4 h-4 mr-2" /> Add Staff Recipient
              </Button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-600">
                <span className="font-medium">Department:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Operations">Operations</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Dispatch">Dispatch</option>
                  <option value="Billing">Billing</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>

            {/* Recipients List Table */}
            {isLoadingRecipients ? (
              <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading staff recipient list...</span>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {searchQuery || departmentFilter !== "ALL"
                    ? "No staff recipients match your search."
                    : "No staff recipients registered yet."}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add staff members who need to be notified when consignments are booked, vehicles dispatched, or invoices generated.
                </p>
                <Button variant="outline" size="sm" onClick={handleOpenAddRecipient}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Recipient
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4">Subscribed Notification Topics</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredRecipients.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{r.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-normal text-[11px]">
                              {r.department || "Operations"}
                            </Badge>
                          </div>
                          {r.designation && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{r.designation}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {r.notification_types && r.notification_types.length > 0 ? (
                              r.notification_types.map((typeId) => {
                                const topic = AVAILABLE_NOTIFICATION_TOPICS.find((t) => t.id === typeId);
                                return (
                                  <span
                                    key={typeId}
                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                                  >
                                    {topic ? topic.label : typeId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No topics selected</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {r.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditRecipient(r)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Edit Recipient"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipient(r)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              title="Delete Recipient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT STAFF RECIPIENT                                   */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {editingRecipient ? "Edit Staff Alert Recipient" : "Add Staff Alert Recipient"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipient} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Staff Full Name"
                  placeholder="e.g. Ramesh Patel"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="ramesh.ops@company.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={recipientDept}
                    onChange={(e) => setRecipientDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Dispatch">Dispatch</option>
                    <option value="Billing">Billing</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <Input
                  label="Designation / Role Title"
                  placeholder="e.g. Senior Dispatch Officer"
                  value={recipientDesignation}
                  onChange={(e) => setRecipientDesignation(e.target.value)}
                />
              </div>

              {/* Notification Topics Subscription */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Select Subscribed Notification Topics
                </label>
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 max-h-56 overflow-y-auto">
                  {AVAILABLE_NOTIFICATION_TOPICS.map((topic) => {
                    const checked = recipientTopics.includes(topic.id);
                    return (
                      <label
                        key={topic.id}
                        className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleTopic(topic.id)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{topic.label}</div>
                          <div className="text-[11px] text-slate-500">{topic.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipientActive}
                    onChange={(e) => setRecipientActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Recipient status active (receives emails)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSavingRecipient}>
                  {isSavingRecipient ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : editingRecipient ? (
                    "Update Recipient"
                  ) : (
                    "Add Recipient"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
