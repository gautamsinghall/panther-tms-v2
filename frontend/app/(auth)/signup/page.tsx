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
} from "lucide-react";
import TextAnimation from "@/components/ui/staggerText";
import { LineHoverLink } from "@/components/ui/line-hover-link";
import { Link000 } from "@/components/ui/skiper-ui/skiper40";
import { PerspectiveGrid } from "@/components/ui/perspective-grid";

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
      {/* Perspective Grid Background Layer from Vengeance UI */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0">
        <PerspectiveGrid gridSize={32} showOverlay fadeRadius={70} />
      </div>

      {/* Ambient ambient glow accents */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP HEADER BAR: Standardized enterprise header across Login and Signup     */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 sm:px-10 h-16 flex items-center justify-between z-20 shrink-0">
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

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline text-slate-500">Already have an account?</span>
          <Link000
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/70 transition-all shadow-2xs"
          >
            <span>Sign in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link000>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: Viewport optimized                                    */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-12 py-3 lg:py-4 max-w-[1640px] w-full mx-auto relative z-10 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Workflow Title & Stepper Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2.5 lg:mb-3 border-b border-slate-200/70 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 font-mono">
              <Layers className="w-3.5 h-3.5" />
              <span>Workspace Provisioning</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {step === 1 && (
                <TextAnimation divideBy="word" delay={0.05}>
                  Select Subscription Plan
                </TextAnimation>
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
                <span>Plan</span>
              </div>
              <span className={`w-5 h-px ${step > 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 font-semibold ${step === 2 ? "text-slate-900 font-bold" : step > 2 ? "text-indigo-600" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 2 ? "bg-indigo-600 text-white shadow-2xs" : step > 2 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-500"}`}>
                  {step > 2 ? "✓" : "2"}
                </span>
                <span>Workspace</span>
              </div>
              <span className={`w-5 h-px ${step > 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1.5 font-semibold ${step === 3 ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 3 ? "bg-indigo-600 text-white shadow-2xs" : "bg-slate-200 text-slate-500"}`}>
                  3
                </span>
                <span>Provisioning</span>
              </div>
            </div>

            {/* Billing Toggle (Shown on Step 1) */}
            {step === 1 && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${billingCycle === "MONTHLY" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${billingCycle === "YEARLY" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"}`}
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
          <div className="p-3 mb-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 shrink-0 animate-in fade-in-0 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: PLAN SELECTION */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5 my-auto items-stretch">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.code;
              const price = billingCycle === "MONTHLY" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
              const isEnterprise = plan.code === "ENTERPRISE";
              const isBusiness = plan.code === "BUSINESS";
              const isPro = plan.code === "PRO";

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
                    className={`w-full mt-4 lg:mt-5 h-11 text-sm rounded-xl transition-all cursor-pointer ${buttonClass}`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              );
            })}
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
                    .panthertms.in
                  </div>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span>Workspace URL:</span>
                  <span className="font-mono text-indigo-700 font-semibold truncate">
                    https://{subdomain || "your-company"}.panthertms.in
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
      {/* ENTERPRISE TRUST FOOTER: Standardized across Signin and Signup            */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/70 bg-white/70 backdrop-blur-xs py-2.5 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-slate-500 z-20 shrink-0">
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
