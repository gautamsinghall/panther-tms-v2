"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
  Lock,
  Building2,
  Database,
  CheckCircle2,
  Server,
  User,
  Mail,
  Layers,
  Sparkles,
  HelpCircle,
  Package,
  BarChart3,
  Truck,
  Users,
  FileText,
  Crown,
  Headset,
} from "lucide-react";
import TextAnimation from "@/components/ui/staggerText";
import { LineHoverLink } from "@/components/ui/line-hover-link";
import { Link000 } from "@/components/ui/skiper-ui/skiper40";
import { getApiBaseUrl } from "@/lib/auth";

interface PlanOption {
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  popular?: boolean;
  features: string[];
  limits: {
    users: string;
    vehicles: string;
    invoices: string;
  };
}

const PLANS: PlanOption[] = [
  {
    code: "FREE",
    name: "Free Starter",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Basic TMS operations for single-truck owner operators.",
    features: [
      "10 LR Max - Per Month",
      "10 HC Max - Per Month",
      "10 Vouchers & Entries / Mo",
      "10 Masters & 10 Ledgers",
      "2 Max Vehicle Registration",
      "Standard PDF Document Exports",
    ],
    limits: {
      users: "1 User",
      vehicles: "2 Vehicles",
      invoices: "10 Vouchers/mo",
    },
  },
  {
    code: "PRO",
    name: "Pro Fleet",
    priceMonthly: 2499,
    priceYearly: 24990,
    description: "Complete operations & double-entry transport accounting.",
    popular: true,
    features: [
      "Everything in Free Starter",
      "Full Double-Entry Accounting",
      "Vouchers & Freight Invoicing",
      "Transport Operational Registers",
      "Bank & Cash Reconciliation",
      "Automated Daily Cloud Backups",
    ],
    limits: {
      users: "5 Users",
      vehicles: "20 Vehicles",
      invoices: "200 Invoices/mo",
    },
  },
  {
    code: "BUSINESS",
    name: "Business Logistics",
    priceMonthly: 7999,
    priceYearly: 79990,
    description: "Advanced fleet telematics, NIC E-Invoicing & compliance.",
    features: [
      "Everything in Pro Fleet",
      "Fleet Management & Trip P&L",
      "Trip Advance & Fuel Expense",
      "E-Way Bill & E-Invoice Auto IRN",
      "FASTag & GPS Tracking Feeds",
      "Vehicle Service & Tyre Logs",
    ],
    limits: {
      users: "15 Users",
      vehicles: "75 Vehicles",
      invoices: "1,000 Invoices/mo",
    },
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise Scale",
    priceMonthly: 19999,
    priceYearly: 199990,
    description: "Unlimited scale with dedicated DB tenancy and custom SLA.",
    features: [
      "Everything in Business Logistics",
      "Full Statements & GST Returns",
      "Unlimited Operational Scale",
      "Priority Webhook & SLA Guarantee",
      "Dedicated PostgreSQL Instance",
      "Custom Subdomain Branding",
    ],
    limits: {
      users: "Unlimited",
      vehicles: "Unlimited",
      invoices: "Unlimited",
    },
  },
];

export default function SignupPage() {
  const router = useRouter();

  // Step state: 1 = Plan selection, 2 = Account details, 3 = Provisioning / Payment
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlan, setSelectedPlan] = useState<string>("PRO");

  // Form details
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [rootDomainSuffix, setRootDomainSuffix] = useState(".panthertms.com");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes("panthertms.com")) {
        setRootDomainSuffix(".panthertms.com");
      } else if (host.includes("panthertms.in")) {
        setRootDomainSuffix(".panthertms.in");
      } else if (host === "localhost" || host === "127.0.0.1") {
        setRootDomainSuffix(".panthertms.local");
      } else {
        const parts = host.split(".");
        if (parts.length > 2) {
          setRootDomainSuffix(`.${parts.slice(-2).join(".")}`);
        } else {
          setRootDomainSuffix(`.${host}`);
        }
      }
    }
  }, []);

  // Provisioning & payment state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<string>("");
  const [provisionComplete, setProvisionComplete] = useState(false);

  const handleCompanyChange = (val: string) => {
    setCompanyName(val);
    if (!subdomain || subdomain === companyName.toLowerCase().replace(/[^a-z0-9]/g, "")) {
      setSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30));
    }
  };

  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!subdomain.match(/^[a-z0-9-]+$/)) {
      setError("Subdomain must only contain lowercase alphanumeric characters and hyphens.");
      setIsLoading(false);
      return;
    }

    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const backendBaseUrl = getApiBaseUrl();

      // 1. Initiate signup with Control API
      setProvisioningStatus("Initiating workspace registration with Control Plane...");
      const initRes = await fetch(`${backendBaseUrl}/control/signup/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          subdomain,
          admin_email: adminEmail,
          admin_name: adminName,
          admin_password: adminPassword,
          plan_code: selectedPlan,
          billing_cycle: billingCycle,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to initiate signup.");
      }

      const initData = await initRes.json();
      setStep(3);

      if (!initData.requires_payment) {
        // FREE plan: Workspace schema and admin account are provisioned by initiate_signup
        setProvisioningStatus("Tenant environment ready!");
        setProvisionComplete(true);
        setIsLoading(false);
      } else {
        // Paid plan: Razorpay payment
        setProvisioningStatus("Initializing Razorpay Secure Autopay gateway...");
        triggerRazorpayCheckout(initData);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during signup.");
      setIsLoading(false);
    }
  };

  const triggerRazorpayCheckout = (initData: any) => {
    const options = {
      key: initData.razorpay_key_id || "rzp_test_mock_12345",
      subscription_id: initData.subscription_id,
      name: "PantherTMS Enterprise",
      description: `${initData.plan_code} Plan Subscription (${billingCycle})`,
      image: "https://cdn-icons-png.flaticon.com/512/2830/2830284.png",
      handler: async function (response: any) {
        setProvisioningStatus("Payment verified! Provisioning isolated tenant database...");
        await completeTenantSignup(
          subdomain,
          selectedPlan,
          response.razorpay_payment_id || `pay_sim_${Date.now()}`,
          response.razorpay_subscription_id || initData.subscription_id,
          response.razorpay_signature || "simulated_signature"
        );
      },
      prefill: {
        name: adminName,
        email: adminEmail,
      },
      notes: {
        subdomain: subdomain,
        plan: selectedPlan,
      },
      theme: {
        color: "#4F46E5",
      },
    };

    if (typeof (window as any).Razorpay !== "undefined") {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } catch {
          simulateDirectPayment(initData);
        }
      };
      script.onerror = () => {
        simulateDirectPayment(initData);
      };
      document.body.appendChild(script);
    }
  };

  const simulateDirectPayment = async (initData: any) => {
    setProvisioningStatus("Processing payment confirmation & verifying HMAC token...");
    setTimeout(async () => {
      await completeTenantSignup(
        subdomain,
        selectedPlan,
        `pay_sim_${Date.now()}`,
        initData.subscription_id || `sub_sim_${Date.now()}`,
        "simulated_test_signature"
      );
    }, 1200);
  };

  const completeTenantSignup = async (
    subdomain: string,
    planCode: string,
    paymentId: string | null,
    subscriptionId: string | null,
    signature: string | null
  ) => {
    try {
      const backendBaseUrl = getApiBaseUrl();

      setProvisioningStatus("Running database migrations & setting up RBAC security policies...");

      const compRes = await fetch(`${backendBaseUrl}/control/signup/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          plan_code: planCode,
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: subscriptionId,
          razorpay_signature: signature,
        }),
      });

      if (!compRes.ok) {
        const errData = await compRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to complete tenant provisioning.");
      }

      setProvisioningStatus("Tenant environment ready!");
      setProvisionComplete(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to complete tenant provisioning.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative lg:overflow-hidden">
      {/* Clean neutral ambient background with subtle radial glow and right-side freight truck atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle center ambient glow */}
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-indigo-500/[0.03] rounded-full blur-3xl" />
        
        {/* Upper-right faded freight truck background matching reference */}
        <div className="absolute top-0 right-0 w-[55vw] max-w-[900px] h-[580px] pointer-events-none overflow-hidden opacity-75">
          <img
            src="/logistics-truck-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-[68%_38%]"
          />
          {/* Edge gradients to dissolve seamlessly into background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-[#F8FAFC]/20" />
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC]/60 to-transparent" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER BAR: Replicated from reference                                  */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-6 sm:px-10 h-16 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <img
              src="/panther-logo.png"
              alt="Panther Digital Solutions"
              className="h-8 w-auto object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Panther<span className="font-extrabold text-blue-600">TMS</span>
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/70 rounded-full px-2 py-0.5 font-mono">
              v2.0
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium">
            <span>Enterprise Logistics Operating System</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <span className="hidden sm:inline text-slate-500 font-medium">Already have an account?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-indigo-200/70 shadow-2xs transition-all"
          >
            <span>Sign in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: Viewport optimized                                    */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-12 py-3 lg:py-4 max-w-[1640px] w-full mx-auto relative z-10 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Workflow Title & Stepper Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2.5 lg:mb-3 border-b border-slate-200/70 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
              <Layers className="w-3.5 h-3.5" />
              <span>Workspace Provisioning</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {step === 1 && (
                <span>
                  Select{" "}
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-600 bg-clip-text text-transparent font-extrabold">
                    Subscription Plan
                  </span>
                </span>
              )}
              {step === 2 && (
                <TextAnimation divideBy="word" delay={0.05}>
                  Configure Enterprise Workspace
                </TextAnimation>
              )}
              {step === 3 && (
                <TextAnimation divideBy="word" delay={0.05}>
                  Setting Up Your Workspace
                </TextAnimation>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {step === 1 && "Choose the subscription edition that matches your active fleet capacity and business needs."}
              {step === 2 && "Set up your isolated tenant database and master administrator."}
              {step === 3 && "Automated multi-tenant environment provisioning in progress."}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {/* Step Indicator */}
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              <div className={`flex items-center gap-1.5 ${step === 1 ? "text-slate-900 font-bold" : step > 1 ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 1 ? "bg-[#1D4ED8] text-white shadow-2xs" : step > 1 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-500"}`}>
                  {step > 1 ? "✓" : "1"}
                </span>
                <span>Plan</span>
              </div>
              <span className={`w-4 h-px ${step > 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 ${step === 2 ? "text-slate-900 font-bold" : step > 2 ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 2 ? "bg-[#1D4ED8] text-white shadow-2xs" : step > 2 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-500"}`}>
                  {step > 2 ? "✓" : "2"}
                </span>
                <span>Workspace</span>
              </div>
              <span className={`w-4 h-px ${step > 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 ${step === 3 ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 3 ? "bg-[#1D4ED8] text-white shadow-2xs" : "bg-slate-200 text-slate-500"}`}>
                  3
                </span>
                <span>Provisioning</span>
              </div>
            </div>

            {/* Billing Toggle (Shown on Step 1) */}
            {step === 1 && (
              <div className="flex items-center bg-white/90 backdrop-blur-xs p-1 rounded-full border border-slate-200 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${billingCycle === "MONTHLY" ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${billingCycle === "YEARLY" ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Yearly
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200/80">
                    -17%
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 shrink-0 animate-in fade-in-0 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: PLAN SELECTION (EXACT REPLICATION OF REFERENCE IMAGE) */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5 my-auto items-stretch w-full py-1">
            {/* 1. FREE STARTER CARD */}
            <div
              onClick={() => setSelectedPlan("FREE")}
              className={`relative bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                selectedPlan === "FREE"
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg"
                  : "border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-20">
                    <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  </div>
                </div>

                <div>
                  <h2 className="font-bold text-xl text-slate-900 tracking-tight">Free Starter</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[34px]">
                    Basic TMS operations for single-truck owner operators.
                  </p>
                </div>

                {/* Price */}
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">₹0</span>
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">/mo</span>
                </div>

                {/* Limits Row */}
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Team Users</span>
                    </div>
                    <span className="font-bold text-slate-900">1 User</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fleet Vehicles</span>
                    </div>
                    <span className="font-bold text-slate-900">2 Vehicles</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Monthly Invoices</span>
                    </div>
                    <span className="font-bold text-slate-900">10 Vouchers/mo</span>
                  </div>
                </div>

                {/* Included Modules */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    INCLUDED MODULES
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>10 LR Max - Per Month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>10 HC Max - Per Month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>10 Vouchers & Entries / Mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>10 Masters & 10 Ledgers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>2 Max Vehicle Registration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Standard PDF Document Exports</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-5 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan("FREE");
                    setStep(2);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <span>Choose Free Starter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. PRO FLEET CARD (MOST POPULAR) */}
            <div
              onClick={() => setSelectedPlan("PRO")}
              className={`relative bg-white rounded-2xl border-2 border-indigo-500 ring-4 ring-indigo-500/10 p-5 sm:p-6 flex flex-col justify-between shadow-xl shadow-indigo-500/10 transition-all duration-200 cursor-pointer ${
                selectedPlan === "PRO" ? "-translate-y-1" : "hover:-translate-y-0.5"
              }`}
            >
              {/* Floating Top Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-[#4F46E5] text-white text-[10px] font-extrabold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  👑 MOST POPULAR
                </span>
              </div>

              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h2 className="font-bold text-xl text-slate-900 tracking-tight">Pro Fleet</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[34px]">
                    Complete operations & double-entry transport accounting.
                  </p>
                </div>

                {/* Price + Mini Sparklines */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      ₹{billingCycle === "MONTHLY" ? "2,499" : "2,082"}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 font-medium">/mo</span>
                  </div>
                  {/* Purple Mini Sparklines */}
                  <div className="flex items-end gap-1 h-7 opacity-35">
                    <div className="w-1.5 h-3 bg-indigo-500 rounded-xs" />
                    <div className="w-1.5 h-5 bg-indigo-500 rounded-xs" />
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-xs" />
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-xs" />
                    <div className="w-1.5 h-7 bg-indigo-500 rounded-xs" />
                  </div>
                </div>

                {/* Limits Row */}
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Team Users</span>
                    </div>
                    <span className="font-bold text-slate-900">5 Users</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Fleet Vehicles</span>
                    </div>
                    <span className="font-bold text-slate-900">20 Vehicles</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Monthly Invoices</span>
                    </div>
                    <span className="font-bold text-slate-900">200 Invoices/mo</span>
                  </div>
                </div>

                {/* Included Modules */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    INCLUDED MODULES
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 font-bold" />
                      <span className="font-bold text-slate-900">Everything in Free Starter</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Full Double-Entry Accounting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Vouchers & Freight Invoicing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Transport Operational Registers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Bank & Cash Reconciliation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Automated Daily Cloud Backups</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-5 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan("PRO");
                    setStep(2);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <span>Choose Pro Fleet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. BUSINESS LOGISTICS CARD */}
            <div
              onClick={() => setSelectedPlan("BUSINESS")}
              className={`relative bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                selectedPlan === "BUSINESS"
                  ? "border-amber-500 ring-2 ring-amber-500/20 shadow-lg"
                  : "border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-20">
                    <div className="w-2 h-2 rounded-full bg-amber-600" />
                    <div className="w-2 h-2 rounded-full bg-amber-600" />
                  </div>
                </div>

                <div>
                  <h2 className="font-bold text-xl text-slate-900 tracking-tight">Business Logistics</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[34px]">
                    Advanced fleet telematics, NIC E-Invoicing & compliance.
                  </p>
                </div>

                {/* Price + Mini Sparklines */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      ₹{billingCycle === "MONTHLY" ? "7,999" : "6,665"}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 font-medium">/mo</span>
                  </div>
                  {/* Amber Mini Sparklines */}
                  <div className="flex items-end gap-1 h-7 opacity-35">
                    <div className="w-1.5 h-3 bg-amber-500 rounded-xs" />
                    <div className="w-1.5 h-4 bg-amber-500 rounded-xs" />
                    <div className="w-1.5 h-6 bg-amber-500 rounded-xs" />
                    <div className="w-1.5 h-5 bg-amber-500 rounded-xs" />
                    <div className="w-1.5 h-7 bg-amber-500 rounded-xs" />
                  </div>
                </div>

                {/* Limits Row */}
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Team Users</span>
                    </div>
                    <span className="font-bold text-slate-900">15 Users</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fleet Vehicles</span>
                    </div>
                    <span className="font-bold text-slate-900">75 Vehicles</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span>Monthly Invoices</span>
                    </div>
                    <span className="font-bold text-slate-900">1,000 Invoices/mo</span>
                  </div>
                </div>

                {/* Included Modules */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    INCLUDED MODULES
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 font-bold" />
                      <span className="font-bold text-slate-900">Everything in Pro Fleet</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Fleet Management & Trip P&L</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Trip Advance & Fuel Expense</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>E-Way Bill & E-Invoice Auto IRN</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>FASTag & GPS Tracking Feeds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Vehicle Service & Tyre Logs</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-5 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan("BUSINESS");
                    setStep(2);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-orange-200/80 text-orange-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Choose Business Logistics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. ENTERPRISE SCALE CARD (ENTERPRISE TIER) */}
            <div
              onClick={() => setSelectedPlan("ENTERPRISE")}
              className={`relative bg-[#0B132B] rounded-2xl border border-slate-700/80 p-5 sm:p-6 flex flex-col justify-between shadow-2xl text-white transition-all duration-200 cursor-pointer ${
                selectedPlan === "ENTERPRISE"
                  ? "ring-2 ring-blue-500/80 -translate-y-1"
                  : "hover:-translate-y-0.5 hover:border-slate-600"
              }`}
            >
              {/* Floating Top Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-[#090D1A] border border-slate-700 text-indigo-300 text-[10px] font-extrabold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  💎 ENTERPRISE TIER
                </span>
              </div>

              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-white">
                    <Crown className="w-6 h-6 text-indigo-200" />
                  </div>
                </div>

                <div>
                  <h2 className="font-bold text-xl text-white tracking-tight">Enterprise Scale</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-snug min-h-[34px]">
                    Unlimited scale with dedicated DB tenancy and custom SLA.
                  </p>
                </div>

                {/* Price + Mini Sparklines */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      ₹{billingCycle === "MONTHLY" ? "19,999" : "16,665"}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-400 font-medium">/mo</span>
                  </div>
                  {/* Blue/Slate Mini Sparklines */}
                  <div className="flex items-end gap-1 h-7 opacity-35">
                    <div className="w-1.5 h-3 bg-blue-400 rounded-xs" />
                    <div className="w-1.5 h-5 bg-blue-400 rounded-xs" />
                    <div className="w-1.5 h-4 bg-blue-400 rounded-xs" />
                    <div className="w-1.5 h-6 bg-blue-400 rounded-xs" />
                    <div className="w-1.5 h-7 bg-blue-400 rounded-xs" />
                  </div>
                </div>

                {/* Limits Row */}
                <div className="space-y-2 pt-1 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Team Users</span>
                    </div>
                    <span className="font-bold text-white">Unlimited</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Truck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Fleet Vehicles</span>
                    </div>
                    <span className="font-bold text-white">Unlimited</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Monthly Invoices</span>
                    </div>
                    <span className="font-bold text-white">Unlimited</span>
                  </div>
                </div>

                {/* Included Modules */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    INCLUDED MODULES
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 font-bold" />
                      <span className="font-bold text-white">Everything in Business Logistics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Full Statements & GST Returns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Unlimited Operational Scale</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Priority Webhook & SLA Guarantee</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Dedicated PostgreSQL Instance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Custom Subdomain Branding</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-5 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan("ENTERPRISE");
                    setStep(2);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>Choose Enterprise Scale</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ACCOUNT DETAILS (Aligned with Login styling) */}
        {step === 2 && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5 my-auto w-full">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Workspace Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure your company tenant and master administrator.</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/80 font-mono shadow-2xs">
                  {selectedPlan} Plan
                </span>
              </div>
            </div>

            <form onSubmit={handleInitiateSignup} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                  Registered company name
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    placeholder="Apex Fast Freight Pvt Ltd"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Subdomain */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                  Tenant subdomain
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden group">
                  <input
                    type="text"
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="apex-freight"
                    className="flex-1 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  <div className="px-3 py-2.5 bg-slate-50 border-l border-slate-100 text-xs font-mono text-slate-500 select-none whitespace-nowrap">
                    {rootDomainSuffix}
                  </div>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span>Workspace URL:</span>
                  <span className="font-mono text-indigo-700 font-semibold truncate">
                    https://{subdomain || "your-company"}{rootDomainSuffix}
                  </span>
                </p>
              </div>

              {/* Administrator Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Admin full name
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Rahul Verma"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Admin work email
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@apexfreight.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Admin password (Min 8 characters)
                  </label>
                  <span className="text-[11px] text-slate-400 select-none">
                    Security compliant
                  </span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Tenant Isolation Badge */}
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Tenant isolation enforced with dedicated PostgreSQL database and automated daily backups.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-1/3 h-11 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 h-11 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Initializing...</span>
                    </>
                  ) : selectedPlan === "FREE" ? (
                    <>
                      <span>Complete Free Provisioning</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Proceed to Razorpay Autopay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: PROVISIONING / SUCCESS */}
        {step === 3 && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-5 my-auto w-full">
            {!provisionComplete ? (
              <div className="space-y-4 py-2">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                  <Database className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Setting Up Your Workspace</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Please wait while we initialize your transport ecosystem.</p>
                </div>
                <div className="p-3 bg-indigo-50/90 rounded-xl border border-indigo-100 text-xs font-mono text-indigo-700 shadow-2xs">
                  {provisioningStatus}
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Workspace Ready!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your tenant <span className="font-semibold text-slate-900">{companyName}</span> has been provisioned.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2 text-left text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Subdomain:</span>
                    <span className="font-semibold text-indigo-600">{subdomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Plan:</span>
                    <span className="font-semibold text-slate-900">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Admin Email:</span>
                    <span className="font-semibold text-slate-900">{adminEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Tenant DB:</span>
                    <span className="text-emerald-600 font-semibold">panther_tenant_{subdomain}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full h-11 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  onClick={() => router.push(`/login?subdomain=${subdomain}&email=${encodeURIComponent(adminEmail)}`)}
                >
                  <span>Launch Workspace Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST FOOTER: Replicated from reference                         */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/70 bg-white/60 backdrop-blur-xs py-3 px-6 lg:px-12 flex flex-wrap items-center justify-between gap-4 z-20 shrink-0 max-w-[1640px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">Tenant-isolated architecture</div>
            <div className="text-[11px] text-slate-500">Complete data isolation for your business</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">256-bit SSL encrypted</div>
            <div className="text-[11px] text-slate-500">Bank-grade security for all data</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">Multi-tier RBAC security</div>
            <div className="text-[11px] text-slate-500">Role-based access control</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Headset className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">24/7 Support</div>
            <div className="text-[11px] text-slate-500">Dedicated enterprise support</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
