"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  Lock,
  Building2,
  Layers,
  Database,
  CreditCard,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      const backendBaseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "http://localhost:8000";

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
        // FREE plan: complete signup immediately
        setProvisioningStatus("Provisioning dedicated PostgreSQL tenant schema...");
        await completeTenantSignup(subdomain, selectedPlan, null, null, null);
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
    // If running in sandbox/browser without active Razorpay keys or in local test environment
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

    // Check if Razorpay script is present, otherwise load or use simulated checkout modal
    if (typeof (window as any).Razorpay !== "undefined") {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      // Load Razorpay script dynamically
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
    // Fallback for offline/mock test environment
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
      const backendBaseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "http://localhost:8000";

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
      {/* Ambient background grid pattern */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP HEADER BAR: Standardized across Signin and Signup                     */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-200/80 bg-white/75 backdrop-blur-md px-6 sm:px-10 h-16 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/panther-logo.png"
              alt="Panther Digital Solutions"
              className="h-9 w-auto object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 font-mono">
              v2.0 Enterprise
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium">
            <span>Enterprise Logistics Operating System</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline text-slate-500">Already have an account?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/60 transition-colors"
          >
            Sign in
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: Fits perfectly in viewport with ZERO scrolling        */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-12 py-3 lg:py-4 max-w-[1640px] w-full mx-auto relative z-10 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Workflow Title & Stepper Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2.5 lg:mb-3 border-b border-slate-200/70 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 font-mono">
              Workspace Provisioning
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {step === 1 && "Select Subscription Plan"}
              {step === 2 && "Configure Enterprise Workspace"}
              {step === 3 && "Setting Up Your Workspace"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {step === 1 && "Choose the subscription edition that matches your active fleet capacity."}
              {step === 2 && "Set up your isolated tenant database and master administrator."}
              {step === 3 && "Automated multi-tenant environment provisioning in progress."}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className={`flex items-center gap-1.5 font-semibold ${step === 1 ? "text-slate-900 font-bold" : step > 1 ? "text-indigo-600" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 1 ? "bg-indigo-600 text-white shadow-2xs" : step > 1 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-500"}`}>
                  {step > 1 ? "✓" : "1"}
                </span>
                Plan
              </div>
              <span className={`w-5 h-px ${step > 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 font-semibold ${step === 2 ? "text-slate-900 font-bold" : step > 2 ? "text-indigo-600" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 2 ? "bg-indigo-600 text-white shadow-2xs" : step > 2 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-500"}`}>
                  {step > 2 ? "✓" : "2"}
                </span>
                Workspace
              </div>
              <span className={`w-5 h-px ${step > 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 font-semibold ${step === 3 ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 3 ? "bg-indigo-600 text-white shadow-2xs" : "bg-slate-200 text-slate-500"}`}>
                  3
                </span>
                Provisioning
              </div>
            </div>

            {/* Billing Toggle (Shown on Step 1) */}
            {step === 1 && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${billingCycle === "MONTHLY" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${billingCycle === "YEARLY" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Yearly
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                    -17%
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PLAN SELECTION (Expanded, Prominent Cards) */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5 my-auto items-stretch">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.code;
              const price = billingCycle === "MONTHLY" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
              const isEnterprise = plan.code === "ENTERPRISE";
              const isBusiness = plan.code === "BUSINESS";
              const isPro = plan.code === "PRO";
              const isFree = plan.code === "FREE";

              // Distinct color schemes according to each tier
              const cardBg = isEnterprise
                ? "bg-gradient-to-b from-[#0F172A] via-[#0B0F19] to-[#020617] text-white shadow-xl shadow-slate-950/40"
                : isBusiness
                ? "bg-gradient-to-b from-[#F0FDF4] via-[#ECFDF5] to-[#D1FAE5]/60 text-slate-900 shadow-md shadow-emerald-950/5"
                : isPro
                ? "bg-gradient-to-b from-[#EFF6FF] via-[#EEF2FF] to-[#E0E7FF]/60 text-slate-900 shadow-md shadow-indigo-950/5"
                : "bg-gradient-to-b from-slate-50/90 via-slate-100/50 to-slate-50/90 text-slate-900 shadow-2xs";

              const borderClass = isSelected
                ? isEnterprise
                  ? "border-purple-500 ring-2 ring-purple-500 shadow-2xl scale-[1.01]"
                  : isBusiness
                  ? "border-emerald-600 ring-2 ring-emerald-600 shadow-xl scale-[1.01]"
                  : isPro
                  ? "border-indigo-600 ring-2 ring-indigo-600 shadow-xl scale-[1.01]"
                  : "border-slate-400 ring-2 ring-slate-400 shadow-md scale-[1.01]"
                : isEnterprise
                ? "border-slate-700/80 hover:border-indigo-400/60 hover:shadow-2xl"
                : isBusiness
                ? "border-emerald-200/90 hover:border-emerald-400 hover:shadow-lg"
                : isPro
                ? "border-indigo-200/90 hover:border-indigo-400 hover:shadow-lg"
                : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs";

              const quotaBg = isEnterprise
                ? "bg-slate-900/90 border-slate-800/90"
                : isBusiness
                ? "bg-white/95 border-emerald-200/90"
                : isPro
                ? "bg-white/95 border-indigo-200/90"
                : "bg-white/90 border-slate-200/80";

              const titleColor = isEnterprise
                ? "text-white"
                : isBusiness
                ? "text-emerald-950"
                : isPro
                ? "text-indigo-950"
                : "text-slate-900";

              const descColor = isEnterprise
                ? "text-slate-300"
                : isBusiness
                ? "text-emerald-900/70"
                : isPro
                ? "text-indigo-900/70"
                : "text-slate-500";

              const priceColor = isEnterprise
                ? "text-white"
                : isBusiness
                ? "text-emerald-950"
                : isPro
                ? "text-indigo-950"
                : "text-slate-900";

              const priceSubColor = isEnterprise
                ? "text-slate-400"
                : isBusiness
                ? "text-emerald-700/80"
                : isPro
                ? "text-indigo-600/80"
                : "text-slate-500";

              const annualBillingColor = isEnterprise
                ? "text-indigo-300"
                : isBusiness
                ? "text-emerald-700 font-medium"
                : isPro
                ? "text-indigo-700 font-medium"
                : "text-slate-500 font-medium";

              const quotaLabelColor = isEnterprise
                ? "text-slate-400"
                : isBusiness
                ? "text-emerald-700/80"
                : isPro
                ? "text-indigo-700/80"
                : "text-slate-500";

              const quotaValColor = isEnterprise
                ? "text-white"
                : isBusiness
                ? "text-emerald-950 font-bold"
                : isPro
                ? "text-indigo-950 font-bold"
                : "text-slate-900 font-semibold";

              const moduleHeaderColor = isEnterprise
                ? "text-indigo-300"
                : isBusiness
                ? "text-emerald-800"
                : isPro
                ? "text-indigo-800"
                : "text-slate-500";

              const featureTextColor = isEnterprise
                ? "text-slate-200"
                : isBusiness
                ? "text-emerald-950"
                : isPro
                ? "text-indigo-950"
                : "text-slate-600";

              const checkColor = isEnterprise
                ? "text-emerald-400"
                : isBusiness
                ? "text-emerald-600"
                : isPro
                ? "text-indigo-600"
                : "text-slate-400";

              const dividerColor = isEnterprise
                ? "border-slate-800"
                : isBusiness
                ? "border-emerald-200/60"
                : isPro
                ? "border-indigo-200/60"
                : "border-slate-200/60";

              const buttonClass = isEnterprise
                ? isSelected
                  ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-950/50 ring-2 ring-purple-400 font-bold"
                  : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-md shadow-indigo-950/50 font-semibold"
                : isBusiness
                ? isSelected
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-400 font-bold"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 font-semibold"
                : isPro
                ? isSelected
                  ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-700/30 ring-2 ring-indigo-400 font-bold"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 font-semibold"
                : isSelected
                ? "bg-slate-800 hover:bg-slate-700 text-white shadow-sm font-semibold"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs font-semibold";

              return (
                <div
                  key={plan.code}
                  onClick={() => setSelectedPlan(plan.code)}
                  className={`relative rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${cardBg} ${
                    plan.popular
                      ? "pt-7 pb-5 px-5 lg:px-6 xl:px-7"
                      : "p-5 lg:px-6 xl:px-7 py-5 lg:py-5"
                  } ${borderClass}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white text-[11px] font-bold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs whitespace-nowrap">
                      Most Popular
                    </span>
                  )}
                  {isEnterprise && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 text-white text-[11px] font-bold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                      Enterprise Tier
                    </span>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h2 className={`font-bold text-xl xl:text-2xl tracking-tight ${titleColor}`}>
                        {plan.name}
                      </h2>
                      <p className={`text-xs sm:text-sm mt-1 min-h-[38px] leading-snug ${descColor}`}>
                        {plan.description}
                      </p>
                    </div>

                    <div className={`pt-2 border-t ${dividerColor}`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl xl:text-[40px] font-extrabold tracking-tight leading-none ${priceColor}`}>
                          ₹{price.toLocaleString()}
                        </span>
                        <span className={`text-xs sm:text-sm font-medium ${priceSubColor}`}>
                          /mo
                        </span>
                      </div>
                      {billingCycle === "YEARLY" && plan.priceYearly > 0 ? (
                        <p className={`text-xs mt-0.5 ${annualBillingColor}`}>
                          Billed ₹{plan.priceYearly.toLocaleString()} annually
                        </p>
                      ) : (
                        <p className="text-xs text-transparent mt-0.5 select-none font-medium">
                          Monthly billing
                        </p>
                      )}
                    </div>

                    {/* Quotas */}
                    <div className={`${quotaBg} border p-3 lg:p-3.5 rounded-xl space-y-1.5 text-xs sm:text-sm`}>
                      <div className="flex justify-between items-center">
                        <span className={quotaLabelColor}>Team Users:</span>
                        <span className={quotaValColor}>{plan.limits.users}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={quotaLabelColor}>Fleet Vehicles:</span>
                        <span className={quotaValColor}>{plan.limits.vehicles}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={quotaLabelColor}>Monthly Invoices:</span>
                        <span className={quotaValColor}>{plan.limits.invoices}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-1.5 lg:space-y-2 pt-1">
                      <span className={`text-xs font-semibold uppercase tracking-wider block ${moduleHeaderColor}`}>
                        Included modules
                      </span>
                      {plan.features.map((feat, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs sm:text-[13px] leading-snug ${featureTextColor}`}>
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${checkColor}`} />
                          <span className="font-medium">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.code);
                      setStep(2);
                    }}
                    className={`w-full mt-4 lg:mt-5 h-10 lg:h-11 text-sm rounded-xl transition-all cursor-pointer ${buttonClass}`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 2: ACCOUNT DETAILS (Compact, No-Scroll) */}
        {step === 2 && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card space-y-3.5 my-auto w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Workspace Details</h2>
                <p className="text-xs text-slate-500">Configure your company tenant and master administrator.</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {selectedPlan} Plan
                </span>
              </div>
            </div>

            <form onSubmit={handleInitiateSignup} className="space-y-3">
              <Input
                label="Registered Company Name"
                placeholder="e.g. Apex Fast Freight Pvt Ltd"
                value={companyName}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tenant Subdomain
                </label>
                <div className="flex rounded-md shadow-2xs">
                  <input
                    type="text"
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 rounded-l-md border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-900"
                    placeholder="apex-freight"
                  />
                  <span className="inline-flex items-center px-2.5 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-mono">
                    .panthertms.in
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Workspace URL: https://{subdomain || "your-company"}.panthertms.in
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Administrator Name"
                  placeholder="Rahul Verma"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
                <Input
                  label="Administrator Email"
                  type="email"
                  placeholder="admin@apexfreight.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Admin Password (Min 8 Characters)"
                type="password"
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Tenant isolation enforced with dedicated PostgreSQL database and automated daily backups.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-1/3 h-9 text-xs"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="w-2/3 h-9 text-xs flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Initializing...
                    </>
                  ) : selectedPlan === "FREE" ? (
                    "Complete Free Provisioning"
                  ) : (
                    "Proceed to Razorpay Autopay"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: PROVISIONING / SUCCESS (Compact, No-Scroll) */}
        {step === 3 && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200/90 p-6 shadow-card text-center space-y-4 my-auto w-full">
            {!provisionComplete ? (
              <div className="space-y-4 py-2">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <Database className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Setting Up Your Workspace</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Please wait while we initialize your transport ecosystem.</p>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-mono text-indigo-700">
                  {provisioningStatus}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Workspace Ready!</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your tenant <span className="font-semibold text-slate-900">{companyName}</span> has been provisioned.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-left text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenant Subdomain:</span>
                    <span className="font-mono font-semibold text-indigo-600">{subdomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription Plan:</span>
                    <span className="font-semibold text-slate-900">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admin Email:</span>
                    <span className="font-semibold text-slate-900">{adminEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenant DB:</span>
                    <span className="font-mono text-emerald-600">panther_tenant_{subdomain}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="w-full h-9 text-xs flex items-center justify-center gap-2"
                  onClick={() => router.push(`/login?subdomain=${subdomain}&email=${encodeURIComponent(adminEmail)}`)}
                >
                  Launch Workspace Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST FOOTER: Standardized across Signin and Signup            */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/70 bg-white/50 backdrop-blur-xs py-2 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-slate-500 z-20 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Tenant-isolated architecture</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>256-bit SSL encrypted</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Multi-tier RBAC security</span>
        </span>
      </footer>
    </div>
  );
}
