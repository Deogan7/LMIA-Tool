import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Building2,
  MapPin,
  BarChart3,
  X,
  ChevronDown,
  Globe,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  LogOut,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

// ================================
// TYPES
// ================================

type LMIARecord = {
  "Employer Name"?: string;
  City?: string;
  Province?: string;
  "Program Stream"?: string;
  "Positive LMIAs"?: number;
};

// ================================
// CONSTANTS
// ================================

const PROVINCES = [
  "BC", "AB", "SK", "MB", "ON", "QC",
  "NB", "NS", "PE", "NL", "YT", "NT", "NU",
];

const PROVINCE_NAMES: Record<string, string> = {
  BC: "British Columbia",
  AB: "Alberta",
  SK: "Saskatchewan",
  MB: "Manitoba",
  ON: "Ontario",
  QC: "Quebec",
  NB: "New Brunswick",
  NS: "Nova Scotia",
  PE: "Prince Edward Island",
  NL: "Newfoundland and Labrador",
  YT: "Yukon",
  NT: "Northwest Territories",
  NU: "Nunavut",
};

const CITY_CORRECTIONS: Record<string, string> = {
  Abbottsford: "Abbotsford",
  Abortsford: "Abbotsford",
  Vancouve: "Vancouver",
  Toront: "Toronto",
  Montreal: "Montréal",
  Quebec: "Québec",
};

const TOP_CITIES = [
  "Vancouver", "Toronto", "Surrey", "Mississauga", "Brampton",
  "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Montréal",
];

const ROWS_PER_PAGE_OPTIONS = [50, 100, 250, 500];

// ================================
// VALIDATION
// ================================

function isValidCityName(city: string): boolean {
  if (!city) return false;
  const c = city.trim();
  if (c.length < 3 || c.length > 40) return false;
  if (/\d/.test(c)) return false;
  const bannedPatterns = [
    /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|way|wy|terrace|ter|place|pl)\b/i,
    /\b(unit|suite|apt|apartment|floor|fl|building|bldg|box|p\.?o\.?\s*box|rr|r\.?r\.?\s*\d+)\b/i,
    /\b(north|south|east|west|n|s|e|w|ne|nw|se|sw)\s+(of|at|and)\b/i,
    /^[A-Z]$/,
    /^[A-Z]\s+[A-Z]$/,
    /^[A-Z]\.?\s*[A-Z]\.?$/,
  ];
  if (bannedPatterns.some((p) => p.test(c))) return false;
  if (!/^[a-zA-Z\s\-'éàèùâêîôûçÉÀÈÙÂÊÎÔÛÇ]+$/.test(c)) return false;
  if (c.includes("Unknown") || c.includes("Not Specified") || c.includes("N/A")) return false;
  return true;
}

function normalizeCityName(city: string): string {
  let c = city.trim();
  if (CITY_CORRECTIONS[c]) c = CITY_CORRECTIONS[c];
  c = c
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word === "st") return "St";
      if (word === "ste") return "Ste";
      if (word === "mt") return "Mt";
      if (word === "ft") return "Ft";
      const parts = word.split("'");
      if (parts.length > 1) {
        return parts
          .map((part, i) =>
            i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
          )
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
  return c;
}

// ================================
// TRANSLATIONS
// ================================

type Language = "en" | "fr" | "es" | "pa" | "de";

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    title: "LMIA Explorer",
    subtitle: "Historical positive LMIA approvals across Canada",
    loading: "Loading LMIA data...",
    filters: "Filters",
    employerName: "Employer Name",
    searchEmployers: "Search employers...",
    province: "Province",
    allProvinces: "All Provinces",
    city: "City",
    selectProvinceFirst: "Select province first",
    minLMIAs: "Min. LMIAs",
    quickCityFilter: "Popular Cities",
    programStream: "Program Stream",
    allStreams: "All Streams",
    records: "Records",
    totalEmployers: "Total Employers",
    totalLMIAs: "Total LMIAs",
    avgLMIAs: "Avg. per Employer",
    topProvince: "Top Province",
    clearAll: "Clear All",
    export: "Export",
    noRecords: "No records found",
    tryFilters: "Try adjusting your filters to see results",
    employer: "Employer",
    location: "Location",
    stream: "Stream",
    lmias: "LMIAs",
    highVolume: "High Volume",
    notSpecified: "Not Specified",
    showing: "Showing",
    of: "of",
    results: "results",
    page: "Page",
    rowsPerPage: "Rows",
    previous: "Previous",
    next: "Next",
    notDisclosed: "Not Disclosed",
    errorTitle: "Failed to Load Data",
    retry: "Retry",
  },
  fr: {
    title: "Explorateur LMIA",
    subtitle: "Approbations LMIA positives historiques au Canada",
    loading: "Chargement des données...",
    filters: "Filtres",
    employerName: "Nom de l'employeur",
    searchEmployers: "Rechercher...",
    province: "Province",
    allProvinces: "Toutes les provinces",
    city: "Ville",
    selectProvinceFirst: "Province d'abord",
    minLMIAs: "Min. LMIA",
    quickCityFilter: "Villes populaires",
    programStream: "Programme",
    allStreams: "Tous les programmes",
    records: "Enregistrements",
    totalEmployers: "Employeurs totaux",
    totalLMIAs: "LMIA totaux",
    avgLMIAs: "Moy. par employeur",
    topProvince: "Province principale",
    clearAll: "Tout effacer",
    export: "Exporter",
    noRecords: "Aucun enregistrement trouvé",
    tryFilters: "Essayez d'ajuster vos filtres",
    employer: "Employeur",
    location: "Lieu",
    stream: "Programme",
    lmias: "LMIAs",
    highVolume: "Volume élevé",
    notSpecified: "Non spécifié",
    showing: "Affichage",
    of: "sur",
    results: "résultats",
    page: "Page",
    rowsPerPage: "Lignes",
    previous: "Précédent",
    next: "Suivant",
    notDisclosed: "Non divulgué",
    errorTitle: "Échec du chargement",
    retry: "Réessayer",
  },
  es: {
    title: "Explorador LMIA",
    subtitle: "Aprobaciones positivas históricas de LMIA en Canadá",
    loading: "Cargando datos...",
    filters: "Filtros",
    employerName: "Empleador",
    searchEmployers: "Buscar...",
    province: "Provincia",
    allProvinces: "Todas las Provincias",
    city: "Ciudad",
    selectProvinceFirst: "Provincia primero",
    minLMIAs: "Min. LMIA",
    quickCityFilter: "Ciudades populares",
    programStream: "Programa",
    allStreams: "Todos los Programas",
    records: "Registros",
    totalEmployers: "Empleadores",
    totalLMIAs: "LMIA Totales",
    avgLMIAs: "Prom. por empleador",
    topProvince: "Provincia principal",
    clearAll: "Limpiar",
    export: "Exportar",
    noRecords: "Sin registros",
    tryFilters: "Intente ajustar sus filtros",
    employer: "Empleador",
    location: "Ubicación",
    stream: "Programa",
    lmias: "LMIAs",
    highVolume: "Alto Volumen",
    notSpecified: "No especificado",
    showing: "Mostrando",
    of: "de",
    results: "resultados",
    page: "Página",
    rowsPerPage: "Filas",
    previous: "Anterior",
    next: "Siguiente",
    notDisclosed: "No divulgado",
    errorTitle: "Error al cargar",
    retry: "Reintentar",
  },
  pa: {
    title: "LMIA ਐਕਸਪਲੋਰਰ",
    subtitle: "ਕੈਨੇਡਾ ਵਿੱਚ ਇਤਿਹਾਸਕ ਸਕਾਰਾਤਮਕ LMIA ਅਨੁਮੋਦਨਾਂ",
    loading: "ਡੇਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    filters: "ਫਿਲਟਰ",
    employerName: "ਨਿਯੋਜਕ ਦਾ ਨਾਮ",
    searchEmployers: "ਖੋਜੋ...",
    province: "ਪ੍ਰਾਂਤ",
    allProvinces: "ਸਾਰੇ ਪ੍ਰਾਂਤ",
    city: "ਸ਼ਹਿਰ",
    selectProvinceFirst: "ਪਹਿਲਾਂ ਪ੍ਰਾਂਤ ਚੁਣੋ",
    minLMIAs: "ਘੱਟੋ-ਘੱਟ LMIA",
    quickCityFilter: "ਪ੍ਰਸਿੱਧ ਸ਼ਹਿਰ",
    programStream: "ਪ੍ਰੋਗਰਾਮ",
    allStreams: "ਸਾਰੇ ਪ੍ਰੋਗਰਾਮ",
    records: "ਰਿਕਾਰਡ",
    totalEmployers: "ਕੁੱਲ ਨਿਯੋਜਕ",
    totalLMIAs: "ਕੁੱਲ LMIA",
    avgLMIAs: "ਔਸਤ ਪ੍ਰਤੀ ਨਿਯੋਜਕ",
    topProvince: "ਸਿਖਰ ਪ੍ਰਾਂਤ",
    clearAll: "ਸਭ ਸਾਫ਼ ਕਰੋ",
    export: "ਐਕਸਪੋਰਟ",
    noRecords: "ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲੇ",
    tryFilters: "ਆਪਣੇ ਫਿਲਟਰ ਅਨੁਕੂਲ ਕਰੋ",
    employer: "ਨਿਯੋਜਕ",
    location: "ਟਿਕਾਣਾ",
    stream: "ਪ੍ਰੋਗਰਾਮ",
    lmias: "LMIAs",
    highVolume: "ਉੱਚ ਵਾਲੀਅਮ",
    notSpecified: "ਨਿਰਧਾਰਤ ਨਹੀਂ",
    showing: "ਦਿਖਾ ਰਿਹਾ ਹੈ",
    of: "ਦਾ",
    results: "ਨਤੀਜੇ",
    page: "ਪੰਨਾ",
    rowsPerPage: "ਕਤਾਰਾਂ",
    previous: "ਪਿਛਲਾ",
    next: "ਅਗਲਾ",
    notDisclosed: "ਪ੍ਰਗਟ ਨਹੀਂ ਕੀਤਾ",
    errorTitle: "ਡੇਟਾ ਲੋਡ ਅਸਫਲ",
    retry: "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼",
  },
  de: {
    title: "LMIA-Explorer",
    subtitle: "Historische positive LMIA-Genehmigungen in Kanada",
    loading: "Daten werden geladen...",
    filters: "Filter",
    employerName: "Arbeitgeber",
    searchEmployers: "Suchen...",
    province: "Provinz",
    allProvinces: "Alle Provinzen",
    city: "Stadt",
    selectProvinceFirst: "Provinz zuerst",
    minLMIAs: "Mind. LMIAs",
    quickCityFilter: "Beliebte Städte",
    programStream: "Programm",
    allStreams: "Alle Programme",
    records: "Datensätze",
    totalEmployers: "Arbeitgeber",
    totalLMIAs: "LMIAs gesamt",
    avgLMIAs: "Durchschn. pro AG",
    topProvince: "Top-Provinz",
    clearAll: "Alles löschen",
    export: "Exportieren",
    noRecords: "Keine Datensätze",
    tryFilters: "Passen Sie Ihre Filter an",
    employer: "Arbeitgeber",
    location: "Standort",
    stream: "Programm",
    lmias: "LMIAs",
    highVolume: "Hohes Volumen",
    notSpecified: "Nicht angegeben",
    showing: "Zeige",
    of: "von",
    results: "Ergebnisse",
    page: "Seite",
    rowsPerPage: "Zeilen",
    previous: "Zurück",
    next: "Weiter",
    notDisclosed: "Nicht offengelegt",
    errorTitle: "Fehler beim Laden",
    retry: "Erneut versuchen",
  },
};

// ================================
// MAIN COMPONENT
// ================================

export default function LMIAExplorer() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState<LMIARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const t = TRANSLATIONS[language];

  // Filters
  const [employer, setEmployer] = useState("");
  const [province, setProvince] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [stream, setStream] = useState("ALL");
  const [minLMIAs, setMinLMIAs] = useState("1");

  // Load data once on mount
  useEffect(() => {
    fetch("/lmia_clean_all_canada.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load data: ${r.status}`);
        const data = await r.json();

        const cleanedData = data
          .map((row: Record<string, unknown>) => {
            let prov = (row["Province"] as string)?.trim().toUpperCase() || "";

            // Full name to abbreviation
            const nameToAbbr: Record<string, string> = {
              "BRITISH COLUMBIA": "BC",
              ALBERTA: "AB",
              SASKATCHEWAN: "SK",
              MANITOBA: "MB",
              ONTARIO: "ON",
              QUEBEC: "QC",
              "NEW BRUNSWICK": "NB",
              "NOVA SCOTIA": "NS",
              "PRINCE EDWARD ISLAND": "PE",
              "NEWFOUNDLAND AND LABRADOR": "NL",
              YUKON: "YT",
              "NORTHWEST TERRITORIES": "NT",
              NUNAVUT: "NU",
            };
            if (nameToAbbr[prov]) prov = nameToAbbr[prov];
            if (!PROVINCES.includes(prov)) prov = "";

            let cityVal = (row["City"] as string)?.trim() || "";
            if (cityVal && isValidCityName(cityVal)) {
              cityVal = normalizeCityName(cityVal);
            } else {
              cityVal = "";
            }

            return {
              "Employer Name": (row["Employer Name"] as string)?.trim() || "",
              City: cityVal,
              Province: prov,
              "Program Stream": (row["Program Stream"] as string)?.trim() || "",
              "Positive LMIAs": Number(row["Positive LMIAs"]) || 0,
            } as LMIARecord;
          })
          .filter(
            (row: LMIARecord) =>
              row.City && row.City.length > 0 && row.Province && row.Province.length > 0
          );

        setRows(cleanedData);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Province → city mapping
  const citiesByProvince = useMemo(() => {
    const map: Record<string, string[]> = {};
    PROVINCES.forEach((p) => (map[p] = []));

    rows.forEach((r) => {
      if (!r.Province || !r.City || !PROVINCES.includes(r.Province)) return;
      const normalized = normalizeCityName(r.City);
      if (!isValidCityName(normalized)) return;
      if (!map[r.Province].includes(normalized)) {
        map[r.Province].push(normalized);
      }
    });

    Object.keys(map).forEach((p) => {
      map[p] = map[p].sort((a, b) => a.localeCompare(b)).slice(0, 200);
    });

    return map;
  }, [rows]);

  // Unique stream options
  const streamOptions = useMemo(() => {
    const streams = new Set<string>();
    rows.forEach((r) => {
      if (r["Program Stream"] && r["Program Stream"].length > 0) {
        streams.add(r["Program Stream"]);
      }
    });
    return Array.from(streams).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Filtered data
  const filtered = useMemo(() => {
    const minLMIAsNum = parseInt(minLMIAs) || 1;
    return rows.filter((r) => {
      if (province !== "ALL" && r.Province !== province) return false;
      if (city !== "ALL" && r.City !== city) return false;
      if (stream !== "ALL" && r["Program Stream"] !== stream) return false;
      if ((r["Positive LMIAs"] ?? 0) < minLMIAsNum) return false;
      if (
        employer.trim() &&
        !(r["Employer Name"] || "").toLowerCase().includes(employer.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [rows, employer, province, city, stream, minLMIAs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Insights
  const insights = useMemo(() => {
    const totalLMIAs = filtered.reduce((sum, r) => sum + (r["Positive LMIAs"] ?? 0), 0);
    const totalEmployers = new Set(filtered.map((r) => r["Employer Name"])).size;

    const byProvince: Record<string, number> = {};
    filtered.forEach((r) => {
      if (!r.Province) return;
      byProvince[r.Province] = (byProvince[r.Province] || 0) + (r["Positive LMIAs"] ?? 0);
    });
    const topProvince = Object.entries(byProvince).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      employers: totalEmployers,
      totalLMIAs,
      topProvince:
        topProvince !== "—" ? `${topProvince} (${PROVINCE_NAMES[topProvince]})` : "—",
      averageLMIAs: totalEmployers > 0 ? (totalLMIAs / totalEmployers).toFixed(1) : "0",
    };
  }, [filtered]);

  // Active filters check
  const hasActiveFilters =
    employer !== "" ||
    province !== "ALL" ||
    city !== "ALL" ||
    stream !== "ALL" ||
    (minLMIAs !== "1" && minLMIAs !== "");

  // Handlers
  const handleClearFilters = () => {
    setEmployer("");
    setProvince("ALL");
    setCity("ALL");
    setStream("ALL");
    setMinLMIAs("1");
    setCurrentPage(1);
  };

  const handleMinLMIAsChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setMinLMIAs(value);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value) || 100);
    setCurrentPage(1);
  };

  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    setCity("ALL");
    setCurrentPage(1);
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [employer, province, city, stream, minLMIAs]);

  // ================================
  // LOADING STATE
  // ================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-500 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ================================
  // ERROR STATE
  // ================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t.errorTitle}</h2>
          <p className="text-slate-500 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  // ================================
  // MAIN RENDER
  // ================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Language selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="pa">PA</option>
                <option value="de">DE</option>
              </select>
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <span className="text-sm text-slate-600 hidden sm:inline">
              {user?.name}
            </span>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-200 rounded-lg hover:bg-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-200 rounded-lg hover:bg-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                {t.clearAll}
              </button>
            )}

          </div>
        </div>

        {/* INSIGHT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InsightCard
            label={t.totalEmployers}
            value={insights.employers.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            color="blue"
          />
          <InsightCard
            label={t.totalLMIAs}
            value={insights.totalLMIAs.toLocaleString()}
            icon={<BarChart3 className="h-4 w-4" />}
            color="emerald"
          />
          <InsightCard
            label={t.avgLMIAs}
            value={insights.averageLMIAs}
            icon={<TrendingUp className="h-4 w-4" />}
            color="amber"
          />
          <InsightCard
            label={t.topProvince}
            value={insights.topProvince}
            icon={<MapPin className="h-4 w-4" />}
            color="violet"
          />
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">{t.filters}</h2>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {filtered.length.toLocaleString()} {t.results}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Filter grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Employer search */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.employerName}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    placeholder={t.searchEmployers}
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400"
                  />
                  {employer && (
                    <button
                      onClick={() => setEmployer("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Province */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.province}
                </label>
                <div className="relative">
                  <select
                    value={province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                  >
                    <option value="ALL">{t.allProvinces}</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p} — {PROVINCE_NAMES[p]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.city}
                </label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={province === "ALL"}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none ${
                      province === "ALL"
                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-white border-slate-200 cursor-pointer"
                    }`}
                  >
                    <option value="ALL">
                      {province === "ALL"
                        ? t.selectProvinceFirst
                        : `All (${citiesByProvince[province]?.length || 0})`}
                    </option>
                    {province !== "ALL" &&
                      citiesByProvince[province]?.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Program Stream */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.programStream}
                </label>
                <div className="relative">
                  <select
                    value={stream}
                    onChange={(e) => setStream(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                  >
                    <option value="ALL">{t.allStreams}</option>
                    {streamOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Min LMIAs */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.minLMIAs}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="1"
                    value={minLMIAs}
                    onChange={(e) => handleMinLMIAsChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400"
                  />
                  {minLMIAs !== "1" && minLMIAs !== "" && (
                    <button
                      onClick={() => setMinLMIAs("1")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick city pills */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                {t.quickCityFilter}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TOP_CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setProvince("ALL");
                      setCity(c);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      city === c
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">{t.records}</h2>
              <span className="text-xs text-slate-400">
                {filtered.length.toLocaleString()} {t.results}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">{t.rowsPerPage}:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(e.target.value)}
                  className="border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white cursor-pointer"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-slate-600 px-2 min-w-[4rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t.employer}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t.location}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t.stream}
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t.lmias}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center">
                      <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-900 mb-1">{t.noRecords}</p>
                      <p className="text-xs text-slate-500">{t.tryFilters}</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((r, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-slate-900">
                          {r["Employer Name"] || t.notDisclosed}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-slate-900">{r.City}</div>
                        <div className="text-xs text-slate-400">
                          {r.Province} — {PROVINCE_NAMES[r.Province || ""]}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {r["Program Stream"] || t.notSpecified}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {r["Positive LMIAs"]?.toLocaleString() || 0}
                        </span>
                        {(r["Positive LMIAs"] ?? 0) >= 10 && (
                          <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                            {t.highVolume}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {t.showing} {startIndex + 1}–{Math.min(endIndex, filtered.length)} {t.of}{" "}
                {filtered.length.toLocaleString()} {t.results}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  {t.previous}
                </button>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-7 h-7 text-xs rounded-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white font-medium"
                            : "border border-slate-200 hover:bg-white text-slate-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-1 text-xs text-slate-400">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="w-7 h-7 text-xs border border-slate-200 rounded-md hover:bg-white text-slate-600"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================
// INSIGHT CARD
// ================================

const COLOR_MAP: Record<string, { bg: string; icon: string; text: string }> = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-600" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-600" },
};

function InsightCard({
  label,
  value,
  icon,
  color = "blue",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`text-lg font-bold text-slate-900`}>
        {value}
      </div>
    </div>
  );
}
