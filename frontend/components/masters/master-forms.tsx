"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Form } from "@/components/forms/form";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { useWorkspaceTabs, MasterTabItem } from "@/lib/workspace-tabs-context";
import CompanyVehiclesPage, { CompanyVehicleRecord } from "@/app/(dashboard)/transport/company-vehicles/page";
import MarketVehiclesPage, { MarketVehicleRecord } from "@/app/(dashboard)/transport/market-vehicles/page";
import VehicleOwnersPage from "@/app/(dashboard)/transport/vehicle-owners/page";
import LoadTypePage from "@/app/(dashboard)/general/load-type/page";
import PackingMethodPage from "@/app/(dashboard)/general/packing-method/page";
import BillingClientPage from "@/app/(dashboard)/general/billing-client/page";
import ConsignerPage from "@/app/(dashboard)/general/consigner/page";
import ConsigneePage from "@/app/(dashboard)/general/consignee/page";
import LocationPage from "@/app/(dashboard)/general/location/page";
import DriversPage from "@/app/(dashboard)/transport/drivers/page";

interface MasterFormMeta {
  title: string;
  contextLabel: string;
  description: string;
  submitLabel: string;
  successToast: string;
  apiEndpoint: string;
  buildPayload: (values: Record<string, any>) => Record<string, any>;
  formatResponse: (res: any) => { id: string | number; label: string; [key: string]: any };
  dispatchEvents?: (created: any) => void;
  getSections: () => FormSectionDef[];
}

const MASTER_DEFINITIONS: Record<string, MasterFormMeta> = {
  billing_client: {
    title: "Add Billing Client",
    contextLabel: "Billing Client Master",
    description: "Register a commercial billing client with GSTIN, PAN, credit terms, and addresses.",
    submitLabel: "Create Billing Client",
    successToast: "Billing Client created successfully.",
    apiEndpoint: "/api/v1/general/billing-clients",
    buildPayload: (values) => ({
      name: String(values.name || "").trim(),
      code: values.code ? String(values.code).trim() : null,
      company_name: values.company_name ? String(values.company_name).trim() : null,
      contact_person: values.contact_person ? String(values.contact_person).trim() : null,
      phone: values.phone ? String(values.phone).trim() : null,
      email: values.email ? String(values.email).trim() : null,
      gstin: values.gstin ? String(values.gstin).trim().toUpperCase() : null,
      pan: values.pan ? String(values.pan).trim().toUpperCase() : null,
      tds_rate: values.tds_rate !== undefined && values.tds_rate !== "" ? parseFloat(values.tds_rate) : 0,
      credit_period_days:
        values.credit_period_days !== undefined && values.credit_period_days !== ""
          ? parseInt(values.credit_period_days, 10)
          : 30,
      credit_limit:
        values.credit_limit !== undefined && values.credit_limit !== "" ? parseFloat(values.credit_limit) : 0,
      payment_terms: values.payment_terms ? String(values.payment_terms).trim() : null,
      address: values.address ? String(values.address).trim() : null,
      city: values.city ? String(values.city).trim() : null,
      state: values.state ? String(values.state).trim() : null,
      pincode: values.pincode ? String(values.pincode).trim() : null,
      country: values.country || DEFAULT_COUNTRY,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "billing_client", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_billing_client_created"));
      }
    },
    getSections: () => [
      {
        id: "tax_compliance",
        title: "Tax, GST & Regulatory Compliance",
        description: "Indian Goods & Services Tax (GSTIN), Permanent Account Number (PAN), and statutory TDS rate. Enter to auto-populate company details.",
        columns: 3,
        fields: [
          {
            name: "gstin",
            label: "GSTIN (15 Digits)",
            type: "gstin",
            placeholder: "27AAACT1234F1Z5",
            helperText: "15-digit alphanumeric Indian GST identifier",
          },
          {
            name: "pan",
            label: "PAN (10 Digits)",
            type: "pan",
            placeholder: "AAACT1234F",
            helperText: "10-digit Income Tax PAN",
          },
          {
            name: "tds_rate",
            label: "TDS Deduction Rate (%)",
            type: "number",
            placeholder: "e.g. 1.00 or 2.00",
            defaultValue: 0,
          },
        ],
      },
      {
        id: "corporate_info",
        title: "Corporate & Contact Information",
        description: "Primary client identity, trade name, and key contact details for dispatch and billing.",
        columns: 2,
        fields: [
          {
            name: "name",
            label: "Client / Trade Name",
            placeholder: "e.g. Tata Steel Ltd or Reliance Retail",
            required: true,
            colSpan: 2,
          },
          {
            name: "code",
            label: "Client Code (Optional)",
            placeholder: "e.g. CLI-001",
          },
          {
            name: "company_name",
            label: "Legal / Registered Entity Name",
            placeholder: "e.g. Tata Steel BSL Limited",
          },
          {
            name: "contact_person",
            label: "Primary Contact Person",
            placeholder: "e.g. Rajesh Kumar (Logistics Head)",
          },
          {
            name: "phone",
            label: "Phone / Mobile Number",
            placeholder: "+91 98765 43210",
          },
          {
            name: "email",
            label: "Email Address for Invoicing & Statements",
            type: "email",
            placeholder: "accounts.payable@clientcompany.com",
            colSpan: 2,
          },
        ],
      },
      {
        id: "credit_control",
        title: "Commercial Terms & Credit Control",
        description: "Standard credit window, monetary limits, and contract payment terms.",
        columns: 3,
        fields: [
          {
            name: "credit_period_days",
            label: "Standard Credit Period (Days)",
            type: "number",
            placeholder: "30",
            defaultValue: 30,
          },
          {
            name: "credit_limit",
            label: "Approved Credit Limit (₹)",
            type: "number",
            placeholder: "500000",
            defaultValue: 0,
          },
          {
            name: "payment_terms",
            label: "Payment Terms & Remarks",
            placeholder: "e.g. Net 30 from LR delivery date",
          },
        ],
      },
      {
        id: "address_info",
        title: "Registered Billing Address & Dispatch Hub",
        description: "State, GST tax jurisdiction, and dispatch destination points.",
        columns: 2,
        fields: [
          {
            name: "pincode",
            label: "Postal / ZIP Code (6 Digits)",
            type: "text",
            placeholder: "400001",
          },
          {
            name: "city",
            label: "City / District",
            placeholder: "e.g. Mumbai",
          },
          {
            name: "state",
            label: "State / Union Territory",
            type: "state",
            placeholder: "Select State / UT",
          },
          {
            name: "country",
            label: "Country",
            type: "country",
            defaultValue: DEFAULT_COUNTRY,
          },
          {
            name: "address",
            label: "Full Street Address / Landmark",
            type: "textarea",
            placeholder: "e.g. Plot No. 45, MIDC Industrial Area, Andheri East",
            colSpan: 2,
          },
        ],
      },
    ],
  },

  location: {
    title: "Add Location",
    contextLabel: "Location Master",
    description: "Register a new transit hub, terminal or city in the master network.",
    submitLabel: "Create Location",
    successToast: "Location created successfully.",
    apiEndpoint: "/api/v1/general/locations",
    buildPayload: (values) => ({
      ...values,
      country: values.country || DEFAULT_COUNTRY,
      is_pickup_point: true,
      is_drop_point: true,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.city_name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "location", id: created.id, name: created.city_name }));
        window.dispatchEvent(new Event("panther_location_created"));
      }
    },
    getSections: () => [
      {
        id: "location_info",
        title: "Location Details",
        description: "Hub and transit point definition",
        columns: 2,
        fields: [
          {
            name: "pincode",
            label: "Pincode",
            type: "text",
            placeholder: "370421",
          },
          {
            name: "city_name",
            label: "City / Terminal Name",
            placeholder: "e.g. Mundra Port",
            required: true,
          },
          {
            name: "state",
            label: "State / UT",
            type: "state",
            placeholder: "Select State / UT",
            required: true,
          },
          {
            name: "country",
            label: "Country",
            type: "country",
            defaultValue: DEFAULT_COUNTRY,
            required: true,
          },
        ],
      },
    ],
  },

  consigner: {
    title: "Add Consignor",
    contextLabel: "Consignor Master",
    description: "Primary shipper profile, location, and GST compliance details.",
    submitLabel: "Create Consignor",
    successToast: "Consignor created successfully.",
    apiEndpoint: "/api/v1/general/consigners",
    buildPayload: (values) => ({
      ...values,
      country: values.country || DEFAULT_COUNTRY,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "consigner", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_consigner_created"));
      }
    },
    getSections: () => [
      {
        id: "general_info",
        title: "Consigner Information",
        description: "Primary shipper profile, location, and GST compliance details. Enter GSTIN or PAN to autofill details.",
        columns: 2,
        fields: [
          {
            name: "gstin",
            label: "GSTIN",
            type: "gstin",
            placeholder: "22AAACJ1234F1Z1",
          },
          {
            name: "pan",
            label: "PAN",
            type: "pan",
            placeholder: "e.g. AACJ1234F",
          },
          {
            name: "name",
            label: "Consigner Name",
            placeholder: "e.g. Jindal Steel & Power Ltd",
            required: true,
            colSpan: 2,
          },
          {
            name: "contact_person",
            label: "Contact Person (optional)",
            placeholder: "e.g. Alok Sharma",
          },
          {
            name: "phone",
            label: "Phone Number",
            placeholder: "+91 9876543210",
          },
          {
            name: "address",
            label: "Address",
            placeholder: "e.g. Industrial Area, Phase II",
            type: "textarea",
            colSpan: 2,
          },
          {
            name: "email",
            label: "Email Address",
            type: "email",
            placeholder: "logistics@company.com",
            colSpan: 2,
          },
          {
            name: "pincode",
            label: "Pincode",
            type: "text",
            placeholder: "e.g. 496001",
          },
          {
            name: "city",
            label: "City",
            placeholder: "e.g. Raigarh",
          },
          {
            name: "state",
            label: "State / UT",
            type: "state",
            placeholder: "Select State / UT",
          },
          {
            name: "country",
            label: "Country",
            type: "country",
            defaultValue: DEFAULT_COUNTRY,
          },
        ],
      },
    ],
  },

  consignee: {
    title: "Add Consignee",
    contextLabel: "Consignee Master",
    description: "Delivery receiver and destination delivery party profile.",
    submitLabel: "Create Consignee",
    successToast: "Consignee created successfully.",
    apiEndpoint: "/api/v1/general/consignees",
    buildPayload: (values) => ({
      ...values,
      country: values.country || DEFAULT_COUNTRY,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "consignee", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_consignee_created"));
      }
    },
    getSections: () => [
      {
        id: "general_info",
        title: "Consignee Information",
        description: "Primary receiver profile, delivery location, and GST compliance details. Enter GSTIN or PAN to autofill details.",
        columns: 2,
        fields: [
          {
            name: "gstin",
            label: "GSTIN",
            type: "gstin",
            placeholder: "27AAACL1234F1Z9",
          },
          {
            name: "pan",
            label: "PAN",
            type: "pan",
            placeholder: "e.g. AACL1234F",
          },
          {
            name: "name",
            label: "Consignee Name",
            placeholder: "e.g. Larsen & Toubro Construction",
            required: true,
            colSpan: 2,
          },
          {
            name: "contact_person",
            label: "Contact Person (optional)",
            placeholder: "e.g. Sandeep Patil",
          },
          {
            name: "phone",
            label: "Phone Number",
            placeholder: "+91 9876543210",
          },
          {
            name: "address",
            label: "Delivery Address",
            placeholder: "e.g. Project Site 4, Ring Road",
            type: "textarea",
            colSpan: 2,
          },
          {
            name: "email",
            label: "Email Address",
            type: "email",
            placeholder: "site.stores@company.com",
            colSpan: 2,
          },
          {
            name: "pincode",
            label: "Pincode",
            type: "text",
            placeholder: "e.g. 400072",
          },
          {
            name: "city",
            label: "City",
            placeholder: "e.g. Powai, Mumbai",
          },
          {
            name: "state",
            label: "State / UT",
            type: "state",
            placeholder: "Select State / UT",
          },
          {
            name: "country",
            label: "Country",
            type: "country",
            defaultValue: DEFAULT_COUNTRY,
          },
        ],
      },
    ],
  },

  vehicle_owner: {
    title: "Add Vehicle Owner",
    contextLabel: "Vehicle Owner Master",
    description: "Register market truck owner, freight broker, and supplier banking records.",
    submitLabel: "Create Vehicle Owner",
    successToast: "Vehicle Owner created successfully.",
    apiEndpoint: "/api/v1/transport/vehicle-owners",
    buildPayload: (values) => {
      const { pincode, country, ...payload } = values;
      return payload;
    },
    formatResponse: (res) => ({ id: res.id, label: res.owner_name || res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "vehicle_owner", id: created.id, name: created.owner_name }));
        window.dispatchEvent(new Event("panther_vehicle_owner_created"));
      }
    },
    getSections: () => [
      {
        id: "owner_info",
        title: "Owner Details",
        description: "Truck owner profile, contact, and settlements banking records. Enter PAN to auto-populate owner details.",
        columns: 2,
        fields: [
          {
            name: "pan_number",
            label: "PAN Number",
            type: "pan",
            placeholder: "e.g. ABCDE1234F",
          },
          {
            name: "owner_name",
            label: "Owner Name / Transport Firm",
            placeholder: "e.g. Balaji Roadlines or Suresh Patil",
            required: true,
          },
          {
            name: "phone",
            label: "Mobile / Phone Number",
            placeholder: "e.g. 9820098200",
            required: true,
          },
          {
            name: "bank_name",
            label: "Bank Name",
            placeholder: "e.g. State Bank of India",
          },
          {
            name: "account_number",
            label: "Bank Account Number",
            placeholder: "e.g. 30123456789",
          },
          {
            name: "ifsc_code",
            label: "IFSC Code",
            placeholder: "e.g. SBIN0001234",
          },
          {
            name: "address",
            label: "Full Address",
            placeholder: "e.g. Transport Nagar, Sector 5",
            type: "textarea",
            colSpan: 2,
          },
          {
            name: "city",
            label: "City / District",
            placeholder: "e.g. Gandhidham",
          },
          {
            name: "state",
            label: "State / UT",
            type: "state",
            placeholder: "Select State / UT",
          },
        ],
      },
    ],
  },

  driver: {
    title: "Add Driver",
    contextLabel: "Driver Master",
    description: "Register commercial fleet driver, personal identification, and license details.",
    submitLabel: "Create Driver",
    successToast: "Driver created successfully.",
    apiEndpoint: "/api/v1/transport/drivers",
    buildPayload: (values) => values,
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "driver", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_driver_created"));
      }
    },
    getSections: () => [
      {
        id: "driver_info",
        title: "Personal & Identification Information",
        description: "Primary driver identity, verification documents, and contact details",
        columns: 2,
        fields: [
          {
            name: "pan_no",
            label: "PAN Number",
            type: "pan",
            placeholder: "e.g. ABCDE1234F",
          },
          {
            name: "name",
            label: "Driver Full Name",
            placeholder: "e.g. Ramesh Kumar",
            required: true,
          },
          {
            name: "phone",
            label: "Mobile / Phone Number",
            placeholder: "e.g. 9876543210",
            required: true,
          },
          {
            name: "aadhar_no",
            label: "Aadhar Number (12 Digits)",
            placeholder: "e.g. 1234 5678 9012",
          },
          {
            name: "address",
            label: "Full Address",
            type: "textarea",
            placeholder: "e.g. Village Rampur, Post Kalan",
            colSpan: 2,
          },
          {
            name: "city",
            label: "City / Town",
            placeholder: "e.g. Jaipur",
          },
          {
            name: "state",
            label: "State / UT",
            type: "state",
            placeholder: "Select State / UT",
          },
          {
            name: "pincode",
            label: "Pincode",
            type: "text",
            placeholder: "e.g. 302001",
          },
        ],
      },
      {
        id: "license_info",
        title: "Driving License & Compliance Details",
        description: "Transport authority license credentials and validity",
        columns: 3,
        fields: [
          {
            name: "license_number",
            label: "Driving License Number",
            placeholder: "e.g. RJ1420150012345",
          },
          {
            name: "license_expiry",
            label: "License Validity / Expiry Date",
            type: "date",
          },
          {
            name: "license_authority",
            label: "Issuing RTO / State Authority",
            placeholder: "e.g. RTO Jaipur",
          },
        ],
      },
    ],
  },

  load_type: {
    title: "Add Load Type",
    contextLabel: "Load Type Master",
    description: "Define freight classification, loading characteristics, and transport package category.",
    submitLabel: "Create Load Type",
    successToast: "Load Type created successfully.",
    apiEndpoint: "/api/v1/general/load-types",
    buildPayload: (values) => ({
      name: String(values.name || "").trim(),
      code: values.code ? String(values.code).trim() : null,
      description: values.description ? String(values.description).trim() : null,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    dispatchEvents: (created) => {
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "load_type", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_load_type_created"));
      }
    },

    getSections: () => [
      {
        id: "load_type_info",
        title: "Load Type Details",
        description: "Specify consignment packaging form, handling traits, and freight commodity category.",
        columns: 2,
        fields: [
          {
            name: "name",
            label: "Load Type Name",
            placeholder: "e.g. Full Truck Load (FTL) or Heavy Machinery",
            required: true,
            colSpan: 2,
          },
          {
            name: "code",
            label: "Short Code (Optional)",
            placeholder: "e.g. FTL or LTL",
          },
          {
            name: "description",
            label: "Description / Freight Specifications",
            placeholder: "e.g. Applicable for dedicated commercial trucks without partial consolidation",
            type: "textarea",
            colSpan: 2,
          },
        ],
      },
    ],
  },

  packing_method: {
    title: "Add Packing Method",
    contextLabel: "Packing Method Master",
    description: "Define a packaging type used for cargo handling and transport.",
    submitLabel: "Create Packing Method",
    successToast: "Packing method created successfully.",
    apiEndpoint: "/api/v1/general/packing-methods",
    buildPayload: (values) => ({
      name: String(values.name || "").trim(),
      code: values.code ? String(values.code).trim() : null,
      description: values.description ? String(values.description).trim() : null,
    }),
    formatResponse: (res) => ({ id: res.id, label: res.name, ...res }),
    getSections: () => [
      {
        id: "packing_info",
        title: "Packing Specification",
        description: "Packaging type definition",
        columns: 2,
        fields: [
          {
            name: "name",
            label: "Packing Type",
            placeholder: "e.g. Wooden Pallet / Carton Box",
            required: true,
          },
          {
            name: "code",
            label: "Method Code",
            placeholder: "e.g. PLT / CTN",
          },
          {
            name: "description",
            label: "Description",
            placeholder: "Protection and handling instructions",
            colSpan: 2,
          },
        ],
      },
    ],
  },

  market_vehicle: {
    title: "Add Market Truck",
    contextLabel: "Market Truck Master",
    description: "Register commercial vehicle plate, body type, and loading capacity.",
    submitLabel: "Create Market Truck",
    successToast: "Market truck created successfully.",
    apiEndpoint: "/api/v1/transport/market-vehicles",
    buildPayload: (values) => ({
      vehicle_number: String(values.vehicle_number || "").toUpperCase().trim(),
      vehicle_type: values.vehicle_type || null,
      capacity_mt: values.capacity_mt ? parseFloat(values.capacity_mt) : null,
      rc_status: values.rc_status || "Active",
    }),
    formatResponse: (res) => ({ id: res.id, label: res.vehicle_number, ...res }),
    getSections: () => [
      {
        id: "vehicle_info",
        title: "Market Vehicle Details",
        description: "Commercial registration plate, classification, and capacity metrics.",
        columns: 2,
        fields: [
          {
            name: "vehicle_number",
            label: "Vehicle Registration No.",
            placeholder: "e.g. MH-12-AB-1234",
            required: true,
          },
          {
            name: "vehicle_type",
            label: "Vehicle Type / Body",
            placeholder: "e.g. 32ft MXL Container or Open Trailer",
          },
          {
            name: "capacity_mt",
            label: "Carrying Capacity (MT)",
            type: "number",
            placeholder: "e.g. 25.0",
          },
          {
            name: "rc_status",
            label: "Registration Status",
            placeholder: "Active",
            defaultValue: "Active",
          },
        ],
      },
    ],
  },

  company_vehicle: {
    title: "Add Company Truck",
    contextLabel: "Company Fleet Master",
    description: "Register own commercial fleet vehicle plate, body type, and payload capacity.",
    submitLabel: "Create Company Truck",
    successToast: "Company truck created successfully.",
    apiEndpoint: "/api/v1/transport/company-vehicles",
    buildPayload: (values) => ({
      vehicle_number: String(values.vehicle_number || "").toUpperCase().trim(),
      vehicle_type: values.vehicle_type || "Open Truck",
      capacity_mt: values.capacity_mt ? parseFloat(values.capacity_mt) : 0,
      ownership_type: "Company Vehicle",
      rc_status: values.rc_status || "Active",
    }),
    formatResponse: (res) => ({ id: res.id, label: res.vehicle_number, ...res }),
    getSections: () => [
      {
        id: "vehicle_info",
        title: "Company Vehicle Details",
        description: "Registration plate, classification, and capacity metrics.",
        columns: 2,
        fields: [
          {
            name: "vehicle_number",
            label: "Vehicle Registration No.",
            placeholder: "e.g. MH-12-AB-1234",
            required: true,
          },
          {
            name: "vehicle_type",
            label: "Vehicle Type / Body",
            placeholder: "e.g. 32ft MXL Container or Open Trailer",
            required: true,
            defaultValue: "Open Truck",
          },
          {
            name: "capacity_mt",
            label: "Payload Capacity (MT)",
            type: "number",
            placeholder: "e.g. 25.0",
          },
          {
            name: "rc_status",
            label: "Registration Status",
            placeholder: "Active",
            defaultValue: "Active",
          },
        ],
      },
    ],
  },
};

export interface MasterFormViewProps {
  tab: MasterTabItem;
  onClose: () => void;
  onSuccess: (record: { id: string | number; label: string; [key: string]: any }) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export function MasterFormView({
  tab,
  onClose,
  onSuccess,
  onDirtyChange,
}: MasterFormViewProps) {
  const { setActiveTab, formTabInfo } = useWorkspaceTabs();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const scrollToTop = () => {
      const el = document.getElementById(`workspace-master-canvas-${tab.id}`);
      if (el) el.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    const t = setTimeout(scrollToTop, 30);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
    };
  }, [tab.id]);

  const meta = MASTER_DEFINITIONS[tab.type] || MASTER_DEFINITIONS.billing_client;
  const sections = useMemo(() => meta.getSections(), [meta]);

  if (tab.type === "company_vehicle") {
    return (
      <CompanyVehiclesPage
        embedded
        onCreated={(vehicle: CompanyVehicleRecord) =>
          onSuccess({
            ...vehicle,
            id: vehicle.id,
            label: vehicle.vehicle_number,
            vehicle_number: vehicle.vehicle_number,
            vehicle_type: vehicle.vehicle_type,
            capacity_mt: vehicle.capacity_mt,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "market_vehicle") {
    return (
      <MarketVehiclesPage
        embedded
        onCreated={(vehicle: MarketVehicleRecord) =>
          onSuccess({
            ...vehicle,
            id: vehicle.id,
            label: vehicle.vehicle_number,
            vehicle_number: vehicle.vehicle_number,
            vehicle_type: vehicle.vehicle_type,
            capacity_mt: vehicle.capacity_mt,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "vehicle_owner") {
    return (
      <VehicleOwnersPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name || rec.owner_name,
            name: rec.name || rec.owner_name,
            owner_name: rec.name || rec.owner_name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "load_type") {
    return (
      <LoadTypePage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "packing_method") {
    return (
      <PackingMethodPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "billing_client") {
    return (
      <BillingClientPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "consigner") {
    return (
      <ConsignerPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "consignee") {
    return (
      <ConsigneePage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "location") {
    return (
      <LocationPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.city_name ? `${rec.city_name}, ${rec.state || ""}` : (rec.name || String(rec.id)),
            city_name: rec.city_name,
            name: rec.name || rec.city_name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "driver") {
    return (
      <DriversPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
            phone: rec.phone,
          })
        }
        onCancel={onClose}
      />
    );
  }

  const handleFieldChange = () => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      onDirtyChange(true);
    }
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = meta.buildPayload(values);
      const res = await apiClient<any>(meta.apiEndpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      meta.dispatchEvents?.(res);
      toast.success(meta.successToast);

      const formatted = meta.formatResponse(res);
      onSuccess(formatted);
    } catch (err: any) {
      toast.error(err.message || `Failed to create ${meta.title}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-75">
      {/* Top Header Card with Breadcrumb & Context Navigation */}
      <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                {meta.contextLabel}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E2130] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2C3044]">
                In-App Tab
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {tab.title || meta.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-normal max-w-3xl">
              {tab.subtitle || meta.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveTab(tab.returnToTabId || (formTabInfo ? "form" : "list"))}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1A1D2B] hover:bg-slate-200/70 dark:hover:bg-[#23273A] rounded-xl transition-colors cursor-pointer border border-slate-200/60 dark:border-[#2B2E42] shadow-2xs flex-1 sm:flex-initial"
              title="Return to previous form without closing"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back (Keep Draft)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-900/60 rounded-xl transition-colors cursor-pointer shadow-2xs flex-1 sm:flex-initial"
              title="Close and discard changes"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel & Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Form */}
      <div className="w-full">
        <Form
          sections={sections}
          initialValues={tab.initialValues}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel={meta.submitLabel}
          isLoading={isSubmitting}
          onChange={handleFieldChange}
        />
      </div>
    </div>
  );
}

export function MasterTabsContainer() {
  const { masterTabs, activeTab, closeMasterTab, updateMasterTabDirty } = useWorkspaceTabs();

  if (!masterTabs || masterTabs.length === 0) {
    return null;
  }

  return (
    <>
      {masterTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            id={`workspace-master-canvas-${tab.id}`}
            className={cn(
              "flex-1 overflow-y-auto [scrollbar-gutter:stable] p-3 pb-28 sm:p-6 sm:pb-32 lg:p-7 lg:pb-36 bg-[#F3F5FC] dark:bg-[#0B0B0D] relative",
              isActive ? "block" : "hidden"
            )}
          >
            <MasterFormView
              tab={tab}
              onClose={() => closeMasterTab(tab.id)}
              onSuccess={(created) => {
                tab.onSuccess?.(created);
                closeMasterTab(tab.id, true);
              }}
              onDirtyChange={(isDirty) => updateMasterTabDirty(tab.id, isDirty)}
            />
          </div>
        );
      })}
    </>
  );
}
