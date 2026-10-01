"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  RotateCw,
  Trash2,
  Calendar,
  Building2,
  Truck,
  User,
  Check,
  AlertCircle,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  DollarSign,
  X,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  QuickCreateVehicleOwnerModal,
  QuickCreateDriverModal,
} from "@/components/modals/quick-create-modal";
import { Button } from "@/components/ui/button";
import { getActiveOffice, OfficeSummary } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface HireChallanRecord {
  id: number;
  challan_number: string;
  challan_date: string;
  issuing_office_id?: number;
  issuing_office_name?: string;
  issuing_office_code?: string;
  hc_series_id?: number;
  vehicle_number: string;
  owner_id?: number;
  owner_name?: string;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  from_location?: string;
  to_location?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  tds_category?: string;
  tds_rate?: string | number;
  tds_amount: string | number;
  vendor_ref_no?: string;
  detention_charge?: string | number;
  mamul_charges?: string | number;
  net_payable_amount: string | number;
  loading_expenses?: ExpenseItem[];
  unloading_expenses?: ExpenseItem[];
  status: string;
  remarks?: string;
  lr_number?: string;
  created_at?: string;
}

interface ExpenseItem {
  id?: string;
  lr_id?: string | number;
  lr_no?: string;
  pkg_count?: string | number;
  gross_weight?: string | number;
  charge_head?: string;
  narration?: string;
  tds_applicable?: boolean;
  inr_amount?: string | number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
  city?: string;
  is_head_office?: boolean;
}

interface LocationOption {
  id: number;
  city_name: string;
  state?: string;
}

interface VehicleOption {
  id: number;
  vehicle_number: string;
  vehicle_type?: string;
  owner_id?: number;
  owner_name?: string;
}

interface DriverOption {
  id: number;
  name: string;
  phone?: string;
  license_number?: string;
}

interface OwnerOption {
  id: number;
  name: string;
  phone?: string;
  pan?: string;
}

interface LROption {
  id: number;
  lr_number: string;
  lr_date?: string;
  package_count?: number;
  actual_weight_mt?: number;
  chargeable_weight_mt?: number;
  origin_city?: string;
  destination_city?: string;
}

interface ChargeHeadOption {
  id: number;
  name: string;
  code?: string;
  charge_type?: string;
}

interface SeriesRangeItem {
  id: number;
  document_type: string;
  series_name: string;
  prefix: string;
  suffix?: string;
  starting_number: number;
  end_number?: number;
  series_mode: string;
  is_default: boolean;
  total_count: number;
  used_count: number;
  available_count: number;
  display_label: string;
  available_options: { value: string; label: string; number: number }[];
}

const DEFAULT_CHARGE_HEADS = [
  "Loading Charges",
  "Hamali Charges",
  "Labour Charges",
  "Crane Charges",
  "Forklift Charges",
  "Cartage",
  "Warfage Charges",
  "Unloading Charges",
  "Toll & Octroi",
  "Other Operational Charges",
];

const TDS_CATEGORIES = [
  { label: "- Select TDS Category -", value: "", rate: 0 },
  { label: "194C - Individual / Sole Prop (1%)", value: "194C_INDIVIDUAL_1", rate: 1.0 },
  { label: "194C - Company / Corporate (2%)", value: "194C_COMPANY_2", rate: 2.0 },
  { label: "194C - Transporter PAN Decl. (0%)", value: "194C_TRANSPORTER_0", rate: 0.0 },
  { label: "No TDS (0%)", value: "NO_TDS", rate: 0.0 },
  { label: "Custom Rate", value: "CUSTOM", rate: 0.0 },
];

export default function HireChallansPage() {
  const router = useRouter();

  // Primary Data
  const [data, setData] = useState<HireChallanRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [lrs, setLrs] = useState<LROption[]>([]);
  const [chargeHeads, setChargeHeads] = useState<ChargeHeadOption[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [selectedChallanDetail, setSelectedChallanDetail] = useState<HireChallanRecord | null>(null);
  const [isRefreshingDrivers, setIsRefreshingDrivers] = useState(false);

  // Quick Create Modals
  const [quickDriverOpen, setQuickDriverOpen] = useState(false);
  const [quickOwnerOpen, setQuickOwnerOpen] = useState(false);

  // Series Master for Hire Challan
  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<{
    configured: boolean;
    next_number_formatted?: string;
  } | null>(null);

  // -------------------------------------------------------------
  // FORM FIELDS STATE (Exact match to screenshot)
  // -------------------------------------------------------------
  const [issuingOfficeId, setIssuingOfficeId] = useState<string>("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [challanNumber, setChallanNumber] = useState<string>("");
  const [fromLocation, setFromLocation] = useState<string>("");
  const [toLocation, setToLocation] = useState<string>("");

  const [challanDate, setChallanDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");

  const [tdsCategory, setTdsCategory] = useState<string>("");
  const [tdsRate, setTdsRate] = useState<number>(0);
  const [tdsAmountInput, setTdsAmountInput] = useState<string>("");
  const [advancePaid, setAdvancePaid] = useState<string>("");
  const [vendorRefNo, setVendorRefNo] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Loading Expenses Rows
  const [loadingExpenses, setLoadingExpenses] = useState<ExpenseItem[]>([
    {
      id: "load-1",
      lr_id: "",
      lr_no: "",
      pkg_count: "",
      gross_weight: "",
      charge_head: "Loading Charges",
      narration: "",
      tds_applicable: false,
      inr_amount: "",
    },
  ]);

  // Unloading Expenses Rows
  const [unloadingExpenses, setUnloadingExpenses] = useState<ExpenseItem[]>([
    {
      id: "unload-1",
      lr_id: "",
      lr_no: "",
      pkg_count: "",
      gross_weight: "",
      charge_head: "Unloading Charges",
      narration: "",
      tds_applicable: false,
      inr_amount: "",
    },
  ]);

  // -------------------------------------------------------------
  // Load Master Data
  // -------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeOffice = getActiveOffice();

      const [
        challansRes,
        branchesRes,
        locationsRes,
        marketVehiclesRes,
        companyVehiclesRes,
        driversRes,
        ownersRes,
        lrsRes,
        chargeHeadsRes,
      ] = await Promise.all([
        apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans").catch(() => []),
        apiClient<BranchOption[]>("/api/v1/profile/branches").catch(() => []),
        apiClient<LocationOption[]>("/api/v1/general/locations").catch(() => []),
        apiClient<any[]>("/api/v1/transport/market-vehicles").catch(() => []),
        apiClient<any[]>("/api/v1/transport/company-vehicles").catch(() => []),
        apiClient<DriverOption[]>("/api/v1/transport/drivers").catch(() => []),
        apiClient<OwnerOption[]>("/api/v1/transport/vehicle-owners").catch(() => []),
        apiClient<LROption[]>("/api/v1/transport/lrs").catch(() => []),
        apiClient<ChargeHeadOption[]>("/api/v1/misc/charge-heads").catch(() => []),
      ]);

      setData(Array.isArray(challansRes) ? challansRes : []);
      const branchList = Array.isArray(branchesRes) ? branchesRes : [];
      setBranches(branchList);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);

      // Combine vehicles
      const vMap = new Map<string, VehicleOption>();
      if (Array.isArray(marketVehiclesRes)) {
        marketVehiclesRes.forEach((mv: any) => {
          if (mv.vehicle_number) {
            vMap.set(mv.vehicle_number, {
              id: mv.id,
              vehicle_number: mv.vehicle_number,
              vehicle_type: mv.vehicle_type,
              owner_id: mv.owner_id,
              owner_name: mv.owner_name,
            });
          }
        });
      }
      if (Array.isArray(companyVehiclesRes)) {
        companyVehiclesRes.forEach((cv: any) => {
          const reg = cv.registration_number || cv.vehicle_number;
          if (reg && !vMap.has(reg)) {
            vMap.set(reg, {
              id: cv.id,
              vehicle_number: reg,
              vehicle_type: cv.vehicle_type,
            });
          }
        });
      }
      setVehicles(Array.from(vMap.values()));
      setDrivers(Array.isArray(driversRes) ? driversRes : []);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
      setChargeHeads(Array.isArray(chargeHeadsRes) ? chargeHeadsRes : []);

      // Determine initial office to auto-fill
      let defaultOfficeId = "";
      if (activeOffice && activeOffice.id) {
        defaultOfficeId = String(activeOffice.id);
      } else if (branchList.length > 0) {
        const ho = branchList.find((b) => b.is_head_office) || branchList[0];
        defaultOfficeId = String(ho.id);
      }

      if (defaultOfficeId) {
        setIssuingOfficeId(defaultOfficeId);
        await autoFillSeriesAndHCNo(defaultOfficeId, branchList);
      }
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------
  // CORE FEATURE: Auto-fill HC Series and HC No by Issuing Office
  // -------------------------------------------------------------
  const autoFillSeriesAndHCNo = async (
    officeId: string | number,
    branchList?: BranchOption[]
  ) => {
    if (!officeId) {
      setSelectedSeriesId("");
      setChallanNumber("");
      setManualSeriesData(null);
      setSeriesInfo(null);
      return;
    }

    try {
      const [manualRangesRes, seriesCheckRes] = await Promise.all([
        apiClient<any>(
          `/api/v1/settings/series/manual-ranges/HIRE_CHALLAN?office_id=${officeId}`
        ).catch(() => null),
        apiClient<any>(
          `/api/v1/settings/series/check/HIRE_CHALLAN?office_id=${officeId}`
        ).catch(() => null),
      ]);

      setManualSeriesData(manualRangesRes);
      setSeriesInfo(seriesCheckRes);

      // Default From to branch city if From is empty
      const currentBranches = branchList || branches;
      const branch = currentBranches.find((b) => String(b.id) === String(officeId));
      if (branch && branch.city) {
        setFromLocation((prev) => (prev ? prev : branch.city || ""));
      }

      // Auto-fill Series and HC No
      if (manualRangesRes && manualRangesRes.ranges && manualRangesRes.ranges.length > 0) {
        // Pick default series or first range
        const defaultSeries =
          manualRangesRes.ranges.find(
            (r: SeriesRangeItem) => r.id === manualRangesRes.default_series_id
          ) || manualRangesRes.ranges[0];

        setSelectedSeriesId(String(defaultSeries.id));

        // Auto-fill HC No with first available unused leaf
        const nextLeaf =
          defaultSeries.available_options?.[0]?.value ||
          seriesCheckRes?.next_number_formatted ||
          "";
        setChallanNumber(nextLeaf);
      } else if (seriesCheckRes && seriesCheckRes.next_number_formatted) {
        setSelectedSeriesId("");
        setChallanNumber(seriesCheckRes.next_number_formatted);
      } else {
        setSelectedSeriesId("");
        setChallanNumber("");
      }
    } catch (err) {
      console.error("Error auto-filling series and HC No:", err);
    }
  };

  // When user selects / changes Issuing Office
  const handleOfficeChange = (newOfficeId: string) => {
    setIssuingOfficeId(newOfficeId);
    autoFillSeriesAndHCNo(newOfficeId);
  };

  // When user selects a different HC Series
  const handleSeriesChange = (newSeriesId: string) => {
    setSelectedSeriesId(newSeriesId);
    if (!newSeriesId) return;

    const matched = manualSeriesData?.ranges?.find(
      (r) => String(r.id) === String(newSeriesId)
    );
    if (matched && matched.available_options && matched.available_options.length > 0) {
      // Auto-fill HC No to first available in selected series
      setChallanNumber(matched.available_options[0].value);
    }
  };

  // Available Series Options for selected office
  const seriesOptions = useMemo(() => {
    if (!manualSeriesData || !manualSeriesData.ranges || manualSeriesData.ranges.length === 0) {
      if (seriesInfo?.next_number_formatted) {
        return [{ label: `Auto Sequence (${seriesInfo.next_number_formatted})`, value: "auto" }];
      }
      return [{ label: "- Select Series -", value: "" }];
    }
    return [
      { label: "- Select -", value: "" },
      ...manualSeriesData.ranges.map((r) => ({
        label: `${r.series_name || "HC Series"} · ${r.prefix}[${r.starting_number}–${r.end_number || "..."}] (${r.available_count} available)${
          r.is_default ? " ★" : ""
        }`,
        value: String(r.id),
      })),
    ];
  }, [manualSeriesData, seriesInfo]);

  // Available HC No leaf options for selected series
  const activeSeriesRange = useMemo(() => {
    if (!manualSeriesData || !manualSeriesData.ranges) return null;
    return (
      manualSeriesData.ranges.find((r) => String(r.id) === selectedSeriesId) ||
      manualSeriesData.ranges.find((r) => r.id === manualSeriesData.default_series_id) ||
      manualSeriesData.ranges[0]
    );
  }, [manualSeriesData, selectedSeriesId]);

  const hcNoOptions = useMemo(() => {
    if (activeSeriesRange && activeSeriesRange.available_options?.length > 0) {
      return activeSeriesRange.available_options.map((opt) => ({
        label: opt.label,
        value: opt.value,
      }));
    }
    if (challanNumber) {
      return [{ label: challanNumber, value: challanNumber }];
    }
    return [];
  }, [activeSeriesRange, challanNumber]);

  // Refresh drivers list
  const refreshDrivers = async () => {
    setIsRefreshingDrivers(true);
    try {
      const freshDrivers = await apiClient<DriverOption[]>("/api/v1/transport/drivers");
      if (Array.isArray(freshDrivers)) {
        setDrivers(freshDrivers);
      }
    } catch (err) {
      console.error("Failed to refresh drivers:", err);
    } finally {
      setTimeout(() => setIsRefreshingDrivers(false), 500);
    }
  };

  // Auto-fill owner when vehicle selected
  const handleVehicleSelect = (val: string) => {
    setVehicleNumber(val);
    const matchedVehicle = vehicles.find(
      (v) => v.vehicle_number.toLowerCase() === val.toLowerCase()
    );
    if (matchedVehicle && matchedVehicle.owner_id) {
      setOwnerId(String(matchedVehicle.owner_id));
    }
  };

  // Handle Driver Select
  const handleDriverSelect = (selectedId: string) => {
    setDriverId(selectedId);
    const matched = drivers.find((d) => String(d.id) === selectedId);
    if (matched) {
      setDriverName(matched.name);
      if (matched.phone) setDriverPhone(matched.phone);
    }
  };

  // Handle TDS Category Change
  const handleTdsCategoryChange = (val: string) => {
    setTdsCategory(val);
    const matched = TDS_CATEGORIES.find((t) => t.value === val);
    if (matched) {
      setTdsRate(matched.rate);
    }
  };

  // -------------------------------------------------------------
  // EXPENSE TABLE ROW HANDLERS
  // -------------------------------------------------------------
  const updateLoadingRow = (
    index: number,
    field: keyof ExpenseItem,
    value: any
  ) => {
    setLoadingExpenses((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      // If GR/LR is selected, auto-populate Pkg Ct & Gross Wt
      if (field === "lr_id" || field === "lr_no") {
        const matched = lrs.find(
          (l) => String(l.id) === String(value) || l.lr_number === value
        );
        if (matched) {
          current.lr_id = matched.id;
          current.lr_no = matched.lr_number;
          if (matched.package_count !== undefined && matched.package_count !== null) {
            current.pkg_count = matched.package_count;
          }
          if (matched.chargeable_weight_mt || matched.actual_weight_mt) {
            current.gross_weight = matched.chargeable_weight_mt || matched.actual_weight_mt || "";
          }
          if (!fromLocation && matched.origin_city) setFromLocation(matched.origin_city);
          if (!toLocation && matched.destination_city) setToLocation(matched.destination_city);
        }
      }
      next[index] = current;
      return next;
    });
  };

  const addLoadingRow = () => {
    setLoadingExpenses((prev) => [
      ...prev,
      {
        id: `load-${Date.now()}`,
        lr_id: "",
        lr_no: "",
        pkg_count: "",
        gross_weight: "",
        charge_head: "Loading Charges",
        narration: "",
        tds_applicable: false,
        inr_amount: "",
      },
    ]);
  };

  const removeLoadingRow = (index: number) => {
    if (loadingExpenses.length <= 1) {
      setLoadingExpenses([
        {
          id: `load-${Date.now()}`,
          lr_id: "",
          lr_no: "",
          pkg_count: "",
          gross_weight: "",
          charge_head: "Loading Charges",
          narration: "",
          tds_applicable: false,
          inr_amount: "",
        },
      ]);
      return;
    }
    setLoadingExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const updateUnloadingRow = (
    index: number,
    field: keyof ExpenseItem,
    value: any
  ) => {
    setUnloadingExpenses((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      if (field === "lr_id" || field === "lr_no") {
        const matched = lrs.find(
          (l) => String(l.id) === String(value) || l.lr_number === value
        );
        if (matched) {
          current.lr_id = matched.id;
          current.lr_no = matched.lr_number;
          if (matched.package_count !== undefined && matched.package_count !== null) {
            current.pkg_count = matched.package_count;
          }
          if (matched.chargeable_weight_mt || matched.actual_weight_mt) {
            current.gross_weight = matched.chargeable_weight_mt || matched.actual_weight_mt || "";
          }
        }
      }
      next[index] = current;
      return next;
    });
  };

  const addUnloadingRow = () => {
    setUnloadingExpenses((prev) => [
      ...prev,
      {
        id: `unload-${Date.now()}`,
        lr_id: "",
        lr_no: "",
        pkg_count: "",
        gross_weight: "",
        charge_head: "Unloading Charges",
        narration: "",
        tds_applicable: false,
        inr_amount: "",
      },
    ]);
  };

  const removeUnloadingRow = (index: number) => {
    if (unloadingExpenses.length <= 1) {
      setUnloadingExpenses([
        {
          id: `unload-${Date.now()}`,
          lr_id: "",
          lr_no: "",
          pkg_count: "",
          gross_weight: "",
          charge_head: "Unloading Charges",
          narration: "",
          tds_applicable: false,
          inr_amount: "",
        },
      ]);
      return;
    }
    setUnloadingExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------
  // FINANCIAL TOTALS CALCULATION
  // -------------------------------------------------------------
  const totalLoadingAmount = useMemo(() => {
    return loadingExpenses.reduce(
      (sum, row) => sum + (parseFloat(String(row.inr_amount)) || 0),
      0
    );
  }, [loadingExpenses]);

  const totalUnloadingAmount = useMemo(() => {
    return unloadingExpenses.reduce(
      (sum, row) => sum + (parseFloat(String(row.inr_amount)) || 0),
      0
    );
  }, [unloadingExpenses]);

  const totalGrossExpenses = useMemo(() => {
    return totalLoadingAmount + totalUnloadingAmount;
  }, [totalLoadingAmount, totalUnloadingAmount]);

  const calculatedTdsAmount = useMemo(() => {
    if (tdsAmountInput !== "") {
      return parseFloat(tdsAmountInput) || 0;
    }
    if (tdsRate > 0 && totalGrossExpenses > 0) {
      return Math.round((totalGrossExpenses * (tdsRate / 100)) * 100) / 100;
    }
    return 0;
  }, [tdsAmountInput, tdsRate, totalGrossExpenses]);

  const netPayable = useMemo(() => {
    return Math.max(0, totalGrossExpenses - calculatedTdsAmount);
  }, [totalGrossExpenses, calculatedTdsAmount]);

  const balanceAmount = useMemo(() => {
    const adv = parseFloat(advancePaid) || 0;
    return Math.max(0, netPayable - adv);
  }, [netPayable, advancePaid]);

  // -------------------------------------------------------------
  // SUBMIT HANDLER
  // -------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issuingOfficeId) {
      alert("Please select an Issuing Office (Branch).");
      return;
    }
    if (!challanNumber.trim()) {
      alert("Please enter or select an HC Number.");
      return;
    }
    if (!fromLocation.trim()) {
      alert("Please specify the 'From' location.");
      return;
    }
    if (!toLocation.trim()) {
      alert("Please specify the 'To' location.");
      return;
    }
    if (!vehicleNumber.trim()) {
      alert("Please enter or select a Vehicle Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find linked LR id if present in first row
      const primaryLrId =
        loadingExpenses[0]?.lr_id || unloadingExpenses[0]?.lr_id || undefined;

      const payload = {
        challan_number: challanNumber.trim(),
        issuing_office_id: parseInt(issuingOfficeId, 10),
        hc_series_id: selectedSeriesId ? parseInt(selectedSeriesId, 10) : undefined,
        challan_date: challanDate,
        lr_id: primaryLrId ? parseInt(String(primaryLrId), 10) : undefined,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        owner_id: ownerId ? parseInt(ownerId, 10) : undefined,
        driver_id: driverId ? parseInt(driverId, 10) : undefined,
        driver_name: driverName.trim() || undefined,
        driver_phone: driverPhone.trim() || undefined,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        hire_rate: totalGrossExpenses,
        advance_amount: parseFloat(advancePaid) || 0,
        balance_amount: balanceAmount,
        tds_category: tdsCategory || undefined,
        tds_rate: tdsRate,
        tds_amount: calculatedTdsAmount,
        vendor_ref_no: vendorRefNo.trim() || undefined,
        detention_charge: 0,
        mamul_charges: 0,
        net_payable_amount: netPayable,
        loading_expenses: loadingExpenses.filter((r) => (parseFloat(String(r.inr_amount)) || 0) > 0 || r.lr_no),
        unloading_expenses: unloadingExpenses.filter((r) => (parseFloat(String(r.inr_amount)) || 0) > 0 || r.lr_no),
        remarks: remarks.trim() || undefined,
      };

      await apiClient("/api/v1/transport/hire-challans", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert(`Hire Challan ${challanNumber} issued successfully!`);

      // Reload records list
      const freshChallans = await apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans");
      setData(Array.isArray(freshChallans) ? freshChallans : []);

      // Auto-populate next series number for current office
      await autoFillSeriesAndHCNo(issuingOfficeId);

      // Reset form non-key fields
      setVehicleNumber("");
      setDriverId("");
      setDriverName("");
      setDriverPhone("");
      setOwnerId("");
      setTdsCategory("");
      setTdsRate(0);
      setTdsAmountInput("");
      setAdvancePaid("");
      setVendorRefNo("");
      setRemarks("");
      setLoadingExpenses([
        {
          id: `load-${Date.now()}`,
          lr_id: "",
          lr_no: "",
          pkg_count: "",
          gross_weight: "",
          charge_head: "Loading Charges",
          narration: "",
          tds_applicable: false,
          inr_amount: "",
        },
      ]);
      setUnloadingExpenses([
        {
          id: `unload-${Date.now()}`,
          lr_id: "",
          lr_no: "",
          pkg_count: "",
          gross_weight: "",
          charge_head: "Unloading Charges",
          narration: "",
          tds_applicable: false,
          inr_amount: "",
        },
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to issue hire challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Settle Challan Action
  const handleSettle = async (row: HireChallanRecord) => {
    if (!confirm(`Settle final balance of ${formatCurrency(row.balance_amount)} for challan ${row.challan_number}?`)) {
      return;
    }
    try {
      await apiClient(`/api/v1/transport/hire-challans/${row.id}/settle`, {
        method: "POST",
        body: JSON.stringify({ settlement_notes: "Settled via banking channel" }),
      });
      const freshChallans = await apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans");
      setData(Array.isArray(freshChallans) ? freshChallans : []);
    } catch (err: any) {
      alert(err.message || "Failed to settle challan.");
    }
  };

  // Filtered Records for Table
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesNo = item.challan_number.toLowerCase().includes(term);
        const matchesVeh = (item.vehicle_number || "").toLowerCase().includes(term);
        const matchesDriver = (item.driver_name || "").toLowerCase().includes(term);
        const matchesOwner = (item.owner_name || "").toLowerCase().includes(term);
        const matchesOffice = (item.issuing_office_name || "").toLowerCase().includes(term);
        if (!matchesNo && !matchesVeh && !matchesDriver && !matchesOwner && !matchesOffice) {
          return false;
        }
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  // Table Columns
  const columns: ColumnDef<HireChallanRecord>[] = [
    {
      key: "challan_number",
      header: "Challan Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block text-xs">
            {row.challan_number}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
            <span>{formatDate(row.challan_date)}</span>
            {row.issuing_office_code && (
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                {row.issuing_office_code}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle / Driver",
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-slate-800 block text-xs">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-slate-500">
            {row.driver_name || "Unassigned"}
            {row.driver_phone ? ` (${row.driver_phone})` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Vendor / Owner",
      cell: (row) => (
        <div>
          <span className="text-xs text-slate-700 font-medium block">
            {row.owner_name || "Direct Driver"}
          </span>
          {row.vendor_ref_no && (
            <span className="text-[10px] text-slate-400 font-mono">
              Ref: {row.vendor_ref_no}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "route",
      header: "Route",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.from_location || "-"} → {row.to_location || "-"}
        </span>
      ),
    },
    {
      key: "hire_rate",
      header: "Total Hire / Exp.",
      isNumeric: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-900">
          {formatCurrency(row.hire_rate)}
        </span>
      ),
    },
    {
      key: "advance_amount",
      header: "Advance Paid",
      isNumeric: true,
      cell: (row) => (
        <span className="text-xs text-slate-600 font-mono">
          {formatCurrency(row.advance_amount)}
        </span>
      ),
    },
    {
      key: "balance_amount",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span
          className={cn(
            "font-mono font-bold text-xs",
            parseFloat(String(row.balance_amount)) > 0
              ? "text-rose-600"
              : "text-emerald-600"
          )}
        >
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const actions: RowAction<HireChallanRecord>[] = [
    {
      label: "View Details",
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (row) => setSelectedChallanDetail(row),
    },
    {
      label: "Settle Balance",
      icon: <CreditCard className="w-3.5 h-3.5" />,
      disabled: (row) =>
        row.status === "SETTLED" ||
        row.status === "CANCELLED" ||
        parseFloat(String(row.balance_amount)) <= 0,
      onClick: handleSettle,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with 'HC Records' and '+ Add New' button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            HC Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Issue hire challans, track advance payments, manage loading/unloading expenses & settle lorry hire.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              setIsFormOpen((prev) => !prev);
              if (!isFormOpen && issuingOfficeId) {
                autoFillSeriesAndHCNo(issuingOfficeId);
              }
            }}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New</span>
          </Button>
        </div>
      </div>

      {/* Warning banner if Series Master is unconfigured */}
      {seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Manual Series Notice:</strong> Please configure a series booklet for Hire Challan (HC) in{" "}
              <strong>Settings &gt; Series Master</strong> to enable sequence tracking for this branch.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            Configure Series
          </Button>
        </div>
      )}

      {/* 2. HC RECORDS FORM CARD (Exact match to the screenshot) */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                New Hire Challan Entry
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
              title="Hide Form"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ROW 1: Issuing Office*, HC Series*, HC No*, From*, To* */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              {/* Issuing Office* */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Issuing Office <span className="text-rose-500">*</span>
                </label>
                <select
                  value={issuingOfficeId}
                  onChange={(e) => handleOfficeChange(e.target.value)}
                  required
                  className="w-full h-8.5 px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* HC Series* (Autofills on office selection) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  HC Series <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSeriesId}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  className="w-full h-8.5 px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                >
                  {seriesOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* HC No* (Autofills on series selection) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  HC No <span className="text-rose-500">*</span>
                </label>
                {hcNoOptions.length > 0 ? (
                  <select
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    required
                    className="w-full h-8.5 px-2.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  >
                    {hcNoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="e.g. HC-DEL-26-0001"
                    className="w-full h-8.5 px-2.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                )}
              </div>

              {/* From* */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  From <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="from-locations-list"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="Select origin city"
                    className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                  <datalist id="from-locations-list">
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.city_name}>
                        {loc.city_name} {loc.state ? `(${loc.state})` : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* To* */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  To <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="to-locations-list"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="Select destination city"
                    className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                  <datalist id="to-locations-list">
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.city_name}>
                        {loc.city_name} {loc.state ? `(${loc.state})` : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* ROW 2: Date*, Vehicle No*, Driver Name*, Vendor* */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Date* */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                </div>
              </div>

              {/* Vehicle No* */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vehicle No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="vehicles-list"
                    value={vehicleNumber}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    placeholder="e.g. DL-01-AB-1234"
                    className="w-full h-8.5 px-2.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                  <datalist id="vehicles-list">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.vehicle_number}>
                        {v.vehicle_number} {v.vehicle_type ? `(${v.vehicle_type})` : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Driver Name* with Blue '+' and Yellow Reload buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Driver Name <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={driverId}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="w-full h-8.5 px-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all truncate"
                  >
                    <option value="">- Select Driver -</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                  </select>

                  {/* Blue '+' Quick Add Driver Button */}
                  <button
                    type="button"
                    onClick={() => setQuickDriverOpen(true)}
                    title="Quick Add Driver"
                    className="w-8.5 h-8.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Yellow Reload Driver Button */}
                  <button
                    type="button"
                    onClick={refreshDrivers}
                    title="Refresh Drivers List"
                    className={cn(
                      "w-8.5 h-8.5 bg-[#eab308] hover:bg-[#ca8a04] text-white rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-all",
                      isRefreshingDrivers && "animate-spin"
                    )}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Vendor* with '+ Add New' button */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vendor <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    required
                    className="w-full h-8.5 px-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all truncate"
                  >
                    <option value="">- Select Vendor / Owner -</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.pan ? `[${o.pan}]` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setQuickOwnerOpen(true)}
                    title="Add New Vendor / Owner"
                    className="w-8.5 h-8.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 3: TDS Category, TDS Amount, Advance Paid, Vendor Ref. No. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* TDS Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  TDS Category
                </label>
                <select
                  value={tdsCategory}
                  onChange={(e) => handleTdsCategoryChange(e.target.value)}
                  className="w-full h-8.5 px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                >
                  {TDS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TDS Amount (Disabled / Gray look per screenshot) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  TDS Amount
                </label>
                <input
                  type="number"
                  step="any"
                  value={calculatedTdsAmount > 0 ? calculatedTdsAmount : ""}
                  onChange={(e) => setTdsAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-8.5 px-2.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 bg-slate-100 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                />
              </div>

              {/* Advance Paid */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Advance Paid
                </label>
                <input
                  type="number"
                  step="any"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-8.5 px-2.5 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                />
              </div>

              {/* Vendor Ref. No. */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vendor Ref. No.
                </label>
                <input
                  type="text"
                  value={vendorRefNo}
                  onChange={(e) => setVendorRefNo(e.target.value)}
                  placeholder="e.g. VREF-12345"
                  className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                />
              </div>
            </div>

            {/* SECTION 1: LOADING EXPENSES TABLE */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                  Loading Expenses
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Subtotal: {formatCurrency(totalLoadingAmount)}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3 min-w-[150px]">GR/LR No</th>
                      <th className="py-2 px-3 w-24">Pkg Ct.</th>
                      <th className="py-2 px-3 w-28">Gross Wt</th>
                      <th className="py-2 px-3 min-w-[160px]">Charge Head</th>
                      <th className="py-2 px-3 min-w-[180px]">Narration</th>
                      <th className="py-2 px-3 w-16 text-center">TDS</th>
                      <th className="py-2 px-3 w-32">INR Amount</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingExpenses.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/50">
                        {/* GR/LR No */}
                        <td className="py-1.5 px-2">
                          <select
                            value={row.lr_no || ""}
                            onChange={(e) => updateLoadingRow(idx, "lr_no", e.target.value)}
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          >
                            <option value="">- Select GR/LR -</option>
                            {lrs.map((lr) => (
                              <option key={lr.id} value={lr.lr_number}>
                                {lr.lr_number} ({lr.package_count || 0} pkgs)
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Pkg Ct. */}
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            value={row.pkg_count || ""}
                            onChange={(e) => updateLoadingRow(idx, "pkg_count", e.target.value)}
                            placeholder="0"
                            className="w-full h-7.5 px-2 text-xs font-mono rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Gross Wt */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.gross_weight || ""}
                            onChange={(e) => updateLoadingRow(idx, "gross_weight", e.target.value)}
                            placeholder="0.00"
                            className="w-full h-7.5 px-2 text-xs font-mono rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Charge Head */}
                        <td className="py-1.5 px-2">
                          <select
                            value={row.charge_head || "Loading Charges"}
                            onChange={(e) => updateLoadingRow(idx, "charge_head", e.target.value)}
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          >
                            {DEFAULT_CHARGE_HEADS.map((head) => (
                              <option key={head} value={head}>
                                {head}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Narration */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.narration || ""}
                            onChange={(e) => updateLoadingRow(idx, "narration", e.target.value)}
                            placeholder="Remarks / notes"
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* TDS Checkbox */}
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.tds_applicable)}
                            onChange={(e) => updateLoadingRow(idx, "tds_applicable", e.target.checked)}
                            className="w-4 h-4 text-[#7c3aed] border-slate-300 rounded focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* INR Amount */}
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="any"
                            value={row.inr_amount || ""}
                            onChange={(e) => updateLoadingRow(idx, "inr_amount", e.target.value)}
                            placeholder="0.00"
                            className="w-full h-7.5 px-2 text-xs font-mono font-semibold text-right rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeLoadingRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Green '+' button to add row */}
              <button
                type="button"
                onClick={addLoadingRow}
                title="Add Loading Expense Line"
                className="w-7 h-7 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-md flex items-center justify-center shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION 2: UNLOADING EXPENSES TABLE */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                  Unloading Expenses
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Subtotal: {formatCurrency(totalUnloadingAmount)}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3 min-w-[150px]">GR/LR No</th>
                      <th className="py-2 px-3 w-24">Pkg Ct.</th>
                      <th className="py-2 px-3 w-28">Gross Wt</th>
                      <th className="py-2 px-3 min-w-[160px]">Charge Head</th>
                      <th className="py-2 px-3 min-w-[180px]">Narration</th>
                      <th className="py-2 px-3 w-16 text-center">TDS</th>
                      <th className="py-2 px-3 w-32">INR Amount</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unloadingExpenses.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/50">
                        {/* GR/LR No */}
                        <td className="py-1.5 px-2">
                          <select
                            value={row.lr_no || ""}
                            onChange={(e) => updateUnloadingRow(idx, "lr_no", e.target.value)}
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          >
                            <option value="">- Select GR/LR -</option>
                            {lrs.map((lr) => (
                              <option key={lr.id} value={lr.lr_number}>
                                {lr.lr_number} ({lr.package_count || 0} pkgs)
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Pkg Ct. */}
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            value={row.pkg_count || ""}
                            onChange={(e) => updateUnloadingRow(idx, "pkg_count", e.target.value)}
                            placeholder="0"
                            className="w-full h-7.5 px-2 text-xs font-mono rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Gross Wt */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.gross_weight || ""}
                            onChange={(e) => updateUnloadingRow(idx, "gross_weight", e.target.value)}
                            placeholder="0.00"
                            className="w-full h-7.5 px-2 text-xs font-mono rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Charge Head */}
                        <td className="py-1.5 px-2">
                          <select
                            value={row.charge_head || "Unloading Charges"}
                            onChange={(e) => updateUnloadingRow(idx, "charge_head", e.target.value)}
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          >
                            {DEFAULT_CHARGE_HEADS.map((head) => (
                              <option key={head} value={head}>
                                {head}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Narration */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.narration || ""}
                            onChange={(e) => updateUnloadingRow(idx, "narration", e.target.value)}
                            placeholder="Remarks / notes"
                            className="w-full h-7.5 px-2 text-xs rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* TDS Checkbox */}
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.tds_applicable)}
                            onChange={(e) => updateUnloadingRow(idx, "tds_applicable", e.target.checked)}
                            className="w-4 h-4 text-[#7c3aed] border-slate-300 rounded focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* INR Amount */}
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="any"
                            value={row.inr_amount || ""}
                            onChange={(e) => updateUnloadingRow(idx, "inr_amount", e.target.value)}
                            placeholder="0.00"
                            className="w-full h-7.5 px-2 text-xs font-mono font-semibold text-right rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeUnloadingRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Green '+' button to add row */}
              <button
                type="button"
                onClick={addUnloadingRow}
                title="Add Unloading Expense Line"
                className="w-7 h-7 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-md flex items-center justify-center shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* LIVE FINANCIAL BREAKDOWN BAR */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Gross Lorry Hire
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatCurrency(totalGrossExpenses)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  TDS Rate & Amt
                </span>
                <span className="font-semibold text-slate-700">
                  {tdsRate}% · {formatCurrency(calculatedTdsAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Net Payable
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(netPayable)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Advance Paid
                </span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(advancePaid || 0)}
                </span>
              </div>
              <div className="col-span-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-500 uppercase block font-bold">
                    Balance Due
                  </span>
                  <span className="font-bold text-rose-600 text-base font-mono">
                    {formatCurrency(balanceAmount)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  Status: <span className="font-semibold text-amber-600">Pending</span>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON (Matching the purple button in the screenshot) */}
            <div className="pt-2 flex items-center justify-start">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#6f42c1] hover:bg-[#5b21b6] text-white font-semibold text-xs sm:text-sm px-6 py-2 rounded-md shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Submit</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. HC RECORDS TABLE SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Registered Hire Challans ({filteredData.length})
          </h2>

          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search challan number, vehicle, driver, vendor..."
            filters={[
              {
                id: "status",
                label: "All Statuses",
                value: statusFilter,
                options: [
                  { label: "All Statuses", value: "ALL" },
                  { label: "Draft", value: "DRAFT" },
                  { label: "Issued", value: "ISSUED" },
                  { label: "In Transit", value: "TRANSIT" },
                  { label: "Settled", value: "SETTLED" },
                  { label: "Cancelled", value: "CANCELLED" },
                ],
                onChange: setStatusFilter,
              },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          actions={actions}
          isLoading={isLoading}
          emptyMessage="No Hire Challans Found"
          emptySubtext='Fill the form above or click "+ Add New" to issue your first Hire Challan.'
        />
      </div>

      {/* 4. CHALLAN DETAIL VIEW MODAL */}
      {selectedChallanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      {selectedChallanDetail.challan_number}
                    </h3>
                    <StatusBadge status={selectedChallanDetail.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Dated {formatDate(selectedChallanDetail.challan_date)} · {selectedChallanDetail.issuing_office_name || "Head Office"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChallanDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Route & Truck Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Vehicle Number
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {selectedChallanDetail.vehicle_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Driver
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedChallanDetail.driver_name || "Unassigned"}
                  </span>
                  {selectedChallanDetail.driver_phone && (
                    <span className="text-[10px] text-slate-500 block">
                      {selectedChallanDetail.driver_phone}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Vendor / Owner
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedChallanDetail.owner_name || "Direct Driver"}
                  </span>
                  {selectedChallanDetail.vendor_ref_no && (
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Ref: {selectedChallanDetail.vendor_ref_no}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Corridor
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedChallanDetail.from_location || "-"} → {selectedChallanDetail.to_location || "-"}
                  </span>
                </div>
              </div>

              {/* Loading Expenses Section */}
              {selectedChallanDetail.loading_expenses && selectedChallanDetail.loading_expenses.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Loading Expenses</h4>
                  <table className="w-full text-left border border-slate-200 rounded-lg text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="py-1.5 px-3">GR/LR</th>
                        <th className="py-1.5 px-3">Pkg Ct</th>
                        <th className="py-1.5 px-3">Gross Wt</th>
                        <th className="py-1.5 px-3">Head</th>
                        <th className="py-1.5 px-3">Narration</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedChallanDetail.loading_expenses.map((exp, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-3 font-mono font-medium">{exp.lr_no || "-"}</td>
                          <td className="py-1.5 px-3">{exp.pkg_count || "-"}</td>
                          <td className="py-1.5 px-3">{exp.gross_weight || "-"}</td>
                          <td className="py-1.5 px-3">{exp.charge_head}</td>
                          <td className="py-1.5 px-3 text-slate-500">{exp.narration || "-"}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold">
                            {formatCurrency(exp.inr_amount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Unloading Expenses Section */}
              {selectedChallanDetail.unloading_expenses && selectedChallanDetail.unloading_expenses.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Unloading Expenses</h4>
                  <table className="w-full text-left border border-slate-200 rounded-lg text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="py-1.5 px-3">GR/LR</th>
                        <th className="py-1.5 px-3">Pkg Ct</th>
                        <th className="py-1.5 px-3">Gross Wt</th>
                        <th className="py-1.5 px-3">Head</th>
                        <th className="py-1.5 px-3">Narration</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedChallanDetail.unloading_expenses.map((exp, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-3 font-mono font-medium">{exp.lr_no || "-"}</td>
                          <td className="py-1.5 px-3">{exp.pkg_count || "-"}</td>
                          <td className="py-1.5 px-3">{exp.gross_weight || "-"}</td>
                          <td className="py-1.5 px-3">{exp.charge_head}</td>
                          <td className="py-1.5 px-3 text-slate-500">{exp.narration || "-"}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold">
                            {formatCurrency(exp.inr_amount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total Agreed Hire / Expenses:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(selectedChallanDetail.hire_rate)}
                  </span>
                </div>
                {selectedChallanDetail.tds_category && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">
                      TDS Deducted ({selectedChallanDetail.tds_category}):
                    </span>
                    <span className="font-mono text-slate-700">
                      - {formatCurrency(selectedChallanDetail.tds_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Net Payable:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(selectedChallanDetail.net_payable_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Advance Paid:</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    - {formatCurrency(selectedChallanDetail.advance_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Balance Due:</span>
                  <span className="font-mono text-rose-600">
                    {formatCurrency(selectedChallanDetail.balance_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedChallanDetail(null)}
              >
                Close
              </Button>
              {selectedChallanDetail.status !== "SETTLED" &&
                parseFloat(String(selectedChallanDetail.balance_amount)) > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const c = selectedChallanDetail;
                      setSelectedChallanDetail(null);
                      handleSettle(c);
                    }}
                  >
                    Settle Balance Now
                  </Button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Driver Modal */}
      <QuickCreateDriverModal
        isOpen={quickDriverOpen}
        onClose={() => setQuickDriverOpen(false)}
        onSuccess={(newDriver) => {
          setDrivers((prev) => [{ id: newDriver.id, name: newDriver.name }, ...prev]);
          setDriverId(String(newDriver.id));
          setDriverName(newDriver.name);
        }}
      />

      {/* Quick Create Vendor Modal */}
      <QuickCreateVehicleOwnerModal
        isOpen={quickOwnerOpen}
        onClose={() => setQuickOwnerOpen(false)}
        onSuccess={(newOwner) => {
          setOwners((prev) => [{ id: newOwner.id, name: newOwner.name }, ...prev]);
          setOwnerId(String(newOwner.id));
        }}
      />
    </div>
  );
}
