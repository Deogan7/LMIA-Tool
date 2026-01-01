import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Filter, Building2, MapPin, BarChart3, X, ChevronDown, ChevronUp, Globe, Download, ChevronLeft, ChevronRight } from "lucide-react";

type LMIARecord = {
  "Employer Name"?: string;
  City?: string;
  Province?: string;
  "Program Stream"?: string;
  "NOC Code"?: string;
  "NOC Title"?: string;
  "Positive LMIAs"?: number;
};

// ================================
// CONSTANTS & VALIDATION FUNCTIONS
// ================================

// Strict province whitelist (abbreviations)
const PROVINCES = [
  "BC",
  "AB",
  "SK",
  "MB",
  "ON",
  "QC",
  "NB",
  "NS",
  "PE",
  "NL",
  "YT",
  "NT",
  "NU",
];

// Province full name mapping for display
const PROVINCE_NAMES: Record<string, string> = {
  "BC": "British Columbia",
  "AB": "Alberta",
  "SK": "Saskatchewan",
  "MB": "Manitoba",
  "ON": "Ontario",
  "QC": "Quebec",
  "NB": "New Brunswick",
  "NS": "Nova Scotia",
  "PE": "Prince Edward Island",
  "NL": "Newfoundland and Labrador",
  "YT": "Yukon",
  "NT": "Northwest Territories",
  "NU": "Nunavut",
};

// Common city misspellings and corrections (pre-cleaning)
const CITY_CORRECTIONS: Record<string, string> = {
  "Abbottsford": "Abbotsford",
  "Abortsford": "Abbotsford",
  "Vancouve": "Vancouver",
  "Toront": "Toronto",
  "Montreal": "Montréal",
  "Quebec": "Québec",
};

// Top cities for quick filtering
const TOP_CITIES = [
  "Vancouver",
  "Toronto",
  "Surrey",
  "Mississauga",
  "Brampton",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Montréal",
];

// Strict city validation function
function isValidCityName(city: string): boolean {
  if (!city) return false;

  const c = city.trim();
  
  // Length constraints
  if (c.length < 3 || c.length > 40) return false;
  
  // Contains numbers (likely address or postal code fragment)
  if (/\d/.test(c)) return false;
  
  // Street/address patterns
  const bannedPatterns = [
    /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|way|wy|terrace|ter|place|pl)\b/i,
    /\b(unit|suite|apt|apartment|floor|fl|building|bldg|box|p\.?o\.?\s*box|rr|r\.?r\.?\s*\d+)\b/i,
    /\b(north|south|east|west|n|s|e|w|ne|nw|se|sw)\s+(of|at|and)\b/i,
    /^[A-Z]$/, // Single letter
    /^[A-Z]\s+[A-Z]$/, // Single letters with space
    /^[A-Z]\.?\s*[A-Z]\.?$/, // Initials
  ];
  
  if (bannedPatterns.some(pattern => pattern.test(c))) return false;
  
  // Invalid characters (allow letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-'éàèùâêîôûçÉÀÈÙÂÊÎÔÛÇ]+$/.test(c)) return false;
  
  // Common garbage patterns
  if (c.includes("Unknown") || c.includes("Not Specified") || c.includes("N/A")) return false;
  
  return true;
}

// Normalize city name
function normalizeCityName(city: string): string {
  let c = city.trim();
  
  // Apply corrections first
  if (CITY_CORRECTIONS[c]) {
    c = CITY_CORRECTIONS[c];
  }
  
  // Capitalize properly (Title Case)
  c = c
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases
      if (word === "st") return "St";
      if (word === "ste") return "Ste";
      if (word === "mt") return "Mt";
      if (word === "ft") return "Ft";
      
      // Handle apostrophes (L'Ange-Gardien, O'Leary)
      const parts = word.split("'");
      if (parts.length > 1) {
        return parts.map((part, i) => 
          i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
        ).join("'");
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return c;
}

// Language support
type Language = 'en' | 'fr' | 'es' | 'pa' | 'de';
const TRANSLATIONS = {
  en: {
    title: "LMIA Intelligence Explorer",
    subtitle: "Explore historical positive LMIA approvals across Canada with professional-grade filtering",
    loading: "Loading LMIA Intelligence...",
    filters: "Filters",
    employerName: "Employer Name",
    searchEmployers: "Search employers...",
    province: "Province",
    allProvinces: "All Provinces",
    city: "City",
    selectProvinceFirst: "Select a province first",
    minLMIAs: "Minimum LMIAs",
    quickCityFilter: "Quick City Filter",
    advancedFilters: "Advanced Filters",
    hideAdvanced: "Hide Advanced Filters",
    showAdvanced: "Show Advanced Filters",
    nocSearch: "NOC Code or Title",
    nocPlaceholder: "e.g., 2173 or 'Software Engineer'",
    programStream: "Program Stream",
    allStreams: "All Program Streams",
    records: "LMIA Records",
    totalEmployers: "Total Employers",
    totalLMIAs: "Total LMIAs",
    avgLMIAs: "Avg. LMIAs/Employer",
    topProvince: "Top Province",
    clearAll: "Clear All Filters",
    export: "Export Data",
    noRecords: "No records found",
    tryFilters: "Try adjusting your filters",
    employer: "Employer",
    location: "Location",
    nocDetails: "NOC Details",
    highVolume: "High Volume",
    notSpecified: "Not Specified",
    showing: "Showing",
    of: "of",
    results: "results",
    page: "Page",
    rowsPerPage: "Rows per page",
    previous: "Previous",
    next: "Next",
  },
  fr: {
    title: "Explorateur d'Intelligence LMIA",
    subtitle: "Explorez les approbations LMIA positives historiques à travers le Canada avec un filtrage professionnel",
    loading: "Chargement de l'intelligence LMIA...",
    filters: "Filtres",
    employerName: "Nom de l'employeur",
    searchEmployers: "Rechercher des employeurs...",
    province: "Province",
    allProvinces: "Toutes les provinces",
    city: "Ville",
    selectProvinceFirst: "Sélectionnez d'abord une province",
    minLMIAs: "LMIA minimum",
    quickCityFilter: "Filtre rapide des villes",
    advancedFilters: "Filtres avancés",
    hideAdvanced: "Masquer les filtres avancés",
    showAdvanced: "Afficher les filtres avancés",
    nocSearch: "Code NOC ou Titre",
    nocPlaceholder: "ex., 2173 ou 'Ingénieur logiciel'",
    programStream: "Programme",
    allStreams: "Tous les programmes",
    records: "Enregistrements LMIA",
    totalEmployers: "Employeurs totaux",
    totalLMIAs: "LMIA totaux",
    avgLMIAs: "LMIA moyen/Employeur",
    topProvince: "Province principale",
    clearAll: "Effacer tous les filtres",
    export: "Exporter les données",
    noRecords: "Aucun enregistrement trouvé",
    tryFilters: "Essayez d'ajuster vos filtres",
    employer: "Employeur",
    location: "Emplacement",
    nocDetails: "Détails NOC",
    highVolume: "Volume élevé",
    notSpecified: "Non spécifié",
    showing: "Affichage",
    of: "sur",
    results: "résultats",
    page: "Page",
    rowsPerPage: "Lignes par page",
    previous: "Précédent",
    next: "Suivant",
  },
  es: {
    title: "Explorador de Inteligencia LMIA",
    subtitle: "Explore aprobaciones positivas históricas de LMIA en Canadá con filtrado profesional",
    loading: "Cargando Inteligencia LMIA...",
    filters: "Filtros",
    employerName: "Nombre del Empleador",
    searchEmployers: "Buscar empleadores...",
    province: "Provincia",
    allProvinces: "Todas las Provincias",
    city: "Ciudad",
    selectProvinceFirst: "Seleccione una provincia primero",
    minLMIAs: "LMIA Mínimo",
    quickCityFilter: "Filtro Rápido de Ciudades",
    advancedFilters: "Filtros Avanzados",
    hideAdvanced: "Ocultar Filtros Avanzados",
    showAdvanced: "Mostrar Filtros Avanzados",
    nocSearch: "Código NOC o Título",
    nocPlaceholder: "ej., 2173 o 'Ingeniero de Software'",
    programStream: "Programa",
    allStreams: "Todos los Programas",
    records: "Registros LMIA",
    totalEmployers: "Empleadores Totales",
    totalLMIAs: "LMIA Totales",
    avgLMIAs: "LMIA Promedio/Empleador",
    topProvince: "Provincia Principal",
    clearAll: "Limpiar Todos los Filtros",
    export: "Exportar Datos",
    noRecords: "No se encontraron registros",
    tryFilters: "Intente ajustar sus filtros",
    employer: "Empleador",
    location: "Ubicación",
    nocDetails: "Detalles NOC",
    highVolume: "Alto Volumen",
    notSpecified: "No Especificado",
    showing: "Mostrando",
    of: "de",
    results: "resultados",
    page: "Página",
    rowsPerPage: "Filas por página",
    previous: "Anterior",
    next: "Siguiente",
  },
  pa: {
    title: "LMIA ਇੰਟੈਲੀਜੈਂਸ ਐਕਸਪਲੋਰਰ",
    subtitle: "ਕੈਨੇਡਾ ਵਿੱਚ ਇਤਿਹਾਸਕ ਸਕਾਰਾਤਮਕ LMIA ਅਨੁਮੋਦਨਾਂ ਦੀ ਪੜਚੋਲ ਕਰੋ ਪੇਸ਼ੇਵਰ-ਗ੍ਰੇਡ ਫਿਲਟਰਿੰਗ ਨਾਲ",
    loading: "LMIA ਇੰਟੈਲੀਜੈਂਸ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    filters: "ਫਿਲਟਰ",
    employerName: "ਨਿਯੋਜਕ ਦਾ ਨਾਮ",
    searchEmployers: "ਨਿਯੋਜਕ ਖੋਜੋ...",
    province: "ਪ੍ਰਾਂਤ",
    allProvinces: "ਸਾਰੇ ਪ੍ਰਾਂਤ",
    city: "ਸ਼ਹਿਰ",
    selectProvinceFirst: "ਪਹਿਲਾਂ ਪ੍ਰਾਂਤ ਚੁਣੋ",
    minLMIAs: "ਘੱਟੋ-ਘੱਟ LMIA",
    quickCityFilter: "ਤੇਜ਼ ਸ਼ਹਿਰ ਫਿਲਟਰ",
    advancedFilters: "ਐਡਵਾਂਸਡ ਫਿਲਟਰ",
    hideAdvanced: "ਐਡਵਾਂਸਡ ਫਿਲਟਰ ਲੁਕਾਓ",
    showAdvanced: "ਐਡਵਾਂਸਡ ਫਿਲਟਰ ਦਿਖਾਓ",
    nocSearch: "NOC ਕੋਡ ਜਾਂ ਟਾਈਟਲ",
    nocPlaceholder: "ਜਿਵੇਂ, 2173 ਜਾਂ 'ਸਾਫਟਵੇਅਰ ਇੰਜੀਨੀਅਰ'",
    programStream: "ਪ੍ਰੋਗਰਾਮ ਸਟ੍ਰੀਮ",
    allStreams: "ਸਾਰੇ ਪ੍ਰੋਗਰਾਮ",
    records: "LMIA ਰਿਕਾਰਡ",
    totalEmployers: "ਕੁੱਲ ਨਿਯੋਜਕ",
    totalLMIAs: "ਕੁੱਲ LMIA",
    avgLMIAs: "ਔਸਤ LMIA/ਨਿਯੋਜਕ",
    topProvince: "ਸਿਖਰ ਪ੍ਰਾਂਤ",
    clearAll: "ਸਾਰੇ ਫਿਲਟਰ ਸਾਫ਼ ਕਰੋ",
    export: "ਡੇਟਾ ਐਕਸਪੋਰਟ ਕਰੋ",
    noRecords: "ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲੇ",
    tryFilters: "ਆਪਣੇ ਫਿਲਟਰ ਅਨੁਕੂਲ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    employer: "ਨਿਯੋਜਕ",
    location: "ਟਿਕਾਣਾ",
    nocDetails: "NOC ਵੇਰਵੇ",
    highVolume: "ਉੱਚ ਵਾਲੀਅਮ",
    notSpecified: "ਨਿਰਧਾਰਤ ਨਹੀਂ",
    showing: "ਦਿਖਾ ਰਿਹਾ ਹੈ",
    of: "ਦਾ",
    results: "ਨਤੀਜੇ",
    page: "ਪੰਨਾ",
    rowsPerPage: "ਪ੍ਰਤੀ ਪੰਨਾ ਕਤਾਰਾਂ",
    previous: "ਪਿਛਲਾ",
    next: "ਅਗਲਾ",
  },
  de: {
    title: "LMIA-Intelligenz-Explorer",
    subtitle: "Erkunden Sie historische positive LMIA-Genehmigungen in Kanada mit professioneller Filterung",
    loading: "LMIA-Intelligenz wird geladen...",
    filters: "Filter",
    employerName: "Arbeitgebername",
    searchEmployers: "Arbeitgeber suchen...",
    province: "Provinz",
    allProvinces: "Alle Provinzen",
    city: "Stadt",
    selectProvinceFirst: "Wählen Sie zuerst eine Provinz",
    minLMIAs: "Mindest-LMIA",
    quickCityFilter: "Schnellstadtfilter",
    advancedFilters: "Erweiterte Filter",
    hideAdvanced: "Erweiterte Filter ausblenden",
    showAdvanced: "Erweiterte Filter anzeigen",
    nocSearch: "NOC-Code oder Titel",
    nocPlaceholder: "z.B., 2173 oder 'Software Engineer'",
    programStream: "Programm",
    allStreams: "Alle Programme",
    records: "LMIA-Datensätze",
    totalEmployers: "Gesamte Arbeitgeber",
    totalLMIAs: "Gesamte LMIAs",
    avgLMIAs: "Durchschn. LMIAs/Arbeitgeber",
    topProvince: "Top-Provinz",
    clearAll: "Alle Filter löschen",
    export: "Daten exportieren",
    noRecords: "Keine Datensätze gefunden",
    tryFilters: "Versuchen Sie, Ihre Filter anzupassen",
    employer: "Arbeitgeber",
    location: "Standort",
    nocDetails: "NOC-Details",
    highVolume: "Hohes Volumen",
    notSpecified: "Nicht angegeben",
    showing: "Zeige",
    of: "von",
    results: "Ergebnisse",
    page: "Seite",
    rowsPerPage: "Zeilen pro Seite",
    previous: "Vorherige",
    next: "Nächste",
  }
};

// ================================
// MAIN COMPONENT
// ================================

export default function LMIAExplorer() {
  const [rows, setRows] = useState<LMIARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const t = TRANSLATIONS[language];

  // Filters
  const [employer, setEmployer] = useState("");
  const [province, setProvince] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [noc, setNoc] = useState("");
  const [stream, setStream] = useState("ALL");
  const [minLMIAs, setMinLMIAs] = useState("1");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetch("/lmia_clean_all_canada.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load data: ${r.status}`);
        const data = await r.json();
        
        // Clean the data
        const cleanedData = data.map((row: LMIARecord) => {
          let province = row.Province?.trim().toUpperCase() || "";
          
          // Convert full province names to abbreviations
          if (province === "BRITISH COLUMBIA") province = "BC";
          else if (province === "ALBERTA") province = "AB";
          else if (province === "SASKATCHEWAN") province = "SK";
          else if (province === "MANITOBA") province = "MB";
          else if (province === "ONTARIO") province = "ON";
          else if (province === "QUEBEC") province = "QC";
          else if (province === "NEW BRUNSWICK") province = "NB";
          else if (province === "NOVA SCOTIA") province = "NS";
          else if (province === "PRINCE EDWARD ISLAND") province = "PE";
          else if (province === "NEWFOUNDLAND AND LABRADOR") province = "NL";
          else if (province === "YUKON") province = "YT";
          else if (province === "NORTHWEST TERRITORIES") province = "NT";
          else if (province === "NUNAVUT") province = "NU";
          
          // Only keep valid provinces
          if (!PROVINCES.includes(province)) province = "";
          
          // Clean city
          let city = row.City?.trim() || "";
          if (city && isValidCityName(city)) {
            city = normalizeCityName(city);
          } else {
            city = "";
          }
          
          return {
            ...row,
            City: city,
            Province: province,
            "Employer Name": row["Employer Name"]?.trim() || getNotDisclosedText(),
          };
        })
        .filter((row: LMIARecord) => 
          row.City && 
          row.City.length > 0 && 
          row.Province && 
          row.Province.length > 0
        );
        
        setRows(cleanedData);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [language]);

  const getNotDisclosedText = () => {
    switch(language) {
      case 'fr': return "Non divulgué";
      case 'es': return "No divulgado";
      case 'pa': return "ਪ੍ਰਗਟ ਨਹੀਂ ਕੀਤਾ ਗਿਆ";
      case 'de': return "Nicht offengelegt";
      default: return "Not Disclosed";
    }
  };

  // ================================
  // CLEAN PROVINCE → CITY MAPPING
  // ================================

  const citiesByProvince = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    // Initialize with empty arrays for all provinces
    PROVINCES.forEach((p) => {
      map[p] = [];
    });
    
    rows.forEach((r) => {
      const province = r.Province;
      const city = r.City;
      
      if (!province || !city) return;
      if (!PROVINCES.includes(province)) return;
      
      const normalizedCity = normalizeCityName(city);
      if (!isValidCityName(normalizedCity)) return;
      
      // Add city if not already in list
      if (!map[province].includes(normalizedCity)) {
        map[province].push(normalizedCity);
      }
    });
    
    // Sort and cap cities per province (max 200 to prevent massive dropdowns)
    Object.keys(map).forEach((p) => {
      map[p] = map[p]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 200); // Cap at 200 cities per province
    });
    
    return map;
  }, [rows]);

  // ================================
  // FILTERING LOGIC
  // ================================

  const filtered = useMemo(() => {
    const minLMIAsNum = parseInt(minLMIAs) || 1;
    
    return rows.filter(r => {
      // Province filter (must match exactly)
      if (province !== "ALL" && r.Province !== province) return false;
      
      // City filter (must match exactly)
      if (city !== "ALL" && r.City !== city) return false;
      
      // Stream filter
      if (stream !== "ALL" && r["Program Stream"] !== stream) return false;
      
      // Minimum LMIAs filter
      if ((r["Positive LMIAs"] ?? 0) < minLMIAsNum) return false;
      
      // Employer name search (case-insensitive, partial match)
      if (employer.trim() && 
          !(r["Employer Name"] || "").toLowerCase().includes(employer.trim().toLowerCase())) {
        return false;
      }
      
      // NOC search (code or title)
      if (noc.trim()) {
        const searchTerm = noc.trim().toLowerCase();
        const nocCode = (r["NOC Code"] || "").toLowerCase();
        const nocTitle = (r["NOC Title"] || "").toLowerCase();
        
        if (!nocCode.includes(searchTerm) && !nocTitle.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [rows, employer, province, city, noc, stream, minLMIAs]);

  // ================================
  // PAGINATION
  // ================================

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // ================================
  // INSIGHTS CALCULATION
  // ================================

  const insights = useMemo(() => {
    const totalLMIAs = filtered.reduce((sum, r) => sum + (r["Positive LMIAs"] ?? 0), 0);
    const totalEmployers = new Set(filtered.map(r => r["Employer Name"])).size;
    
    // Top province calculation
    const byProvince: Record<string, number> = {};
    filtered.forEach(r => {
      if (!r.Province) return;
      byProvince[r.Province] = (byProvince[r.Province] || 0) + (r["Positive LMIAs"] ?? 0);
    });
    
    const topProvince = Object.entries(byProvince)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    
    return {
      employers: totalEmployers,
      totalLMIAs,
      topProvince: topProvince !== "—" ? `${topProvince} (${PROVINCE_NAMES[topProvince]})` : "—",
      averageLMIAs: totalEmployers > 0 ? (totalLMIAs / totalEmployers).toFixed(1) : "0",
    };
  }, [filtered]);

  // ================================
  // EVENT HANDLERS
  // ================================

  const handleClearFilters = () => {
    setEmployer("");
    setProvince("ALL");
    setCity("ALL");
    setNoc("");
    setStream("ALL");
    setMinLMIAs("1");
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return employer !== "" || 
           province !== "ALL" || 
           city !== "ALL" || 
           noc !== "" || 
           stream !== "ALL" || 
           (minLMIAs !== "1" && minLMIAs !== "");
  }, [employer, province, city, noc, stream, minLMIAs]);

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Employer Name,City,Province,Program Stream,NOC Code,NOC Title,Positive LMIAs"]
        .concat(filtered.map(r => 
          `"${r["Employer Name"] || ""}","${r.City || ""}","${r.Province || ""} (${PROVINCE_NAMES[r.Province || ""]})","${r["Program Stream"] || ""}","${r["NOC Code"] || ""}","${r["NOC Title"] || ""}",${r["Positive LMIAs"] || 0}`
        ))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lmia_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const newRowsPerPage = parseInt(value) || 100;
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    setCity("ALL");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [employer, province, city, noc, stream, minLMIAs]);

  // ================================
  // RENDER LOGIC
  // ================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {language === 'en' ? "Failed to Load Data" : 
             language === 'fr' ? "Échec du chargement des données" :
             language === 'es' ? "Error al cargar datos" :
             language === 'pa' ? "ਡੇਟਾ ਲੋਡ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" :
             "Fehler beim Laden der Daten"}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {language === 'en' ? "Retry" : 
             language === 'fr' ? "Réessayer" :
             language === 'es' ? "Reintentar" :
             language === 'pa' ? "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ" :
             "Erneut versuchen"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {t.title}
                  </h1>
                  <p className="mt-1 text-gray-600">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pl-10 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="pa">🇮🇳 ਪੰਜਾਬੀ</option>
                  <option value="de">🇩🇪 Deutsch</option>
                </select>
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {t.clearAll}
                </button>
              )}
              
              <button
                onClick={exportData}
                className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={filtered.length === 0}
              >
                <Download className="h-4 w-4" />
                {t.export}
              </button>
            </div>
          </div>
        </div>

        {/* INSIGHTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightCard 
            label={t.totalEmployers} 
            value={insights.employers.toLocaleString()} 
            icon={<Building2 className="h-5 w-5" />}
          />
          <InsightCard 
            label={t.totalLMIAs} 
            value={insights.totalLMIAs.toLocaleString()} 
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <InsightCard 
            label={t.avgLMIAs} 
            value={insights.averageLMIAs} 
            icon={<div className="h-5 w-5 text-center">Ø</div>}
          />
          <InsightCard 
            label={t.topProvince} 
            value={insights.topProvince} 
            icon={<MapPin className="h-5 w-5" />}
          />
        </div>

        {/* MAIN FILTERS */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200 space-y-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">{t.filters}</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {filtered.length.toLocaleString()} {t.results}
            </span>
          </div>

          {/* Primary Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Employer Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.employerName}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder={t.searchEmployers}
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {employer && (
                  <button
                    onClick={() => setEmployer("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Province Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.province}
              </label>
              <div className="relative">
                <select
                  value={province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="ALL">{t.allProvinces}</option>
                  {PROVINCES.map(p => (
                    <option key={p} value={p}>
                      {p} - {PROVINCE_NAMES[p]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* City Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.city}
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={province === "ALL"}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${
                    province === "ALL" 
                      ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" 
                      : "bg-white border-gray-300"
                  }`}
                >
                  <option value="ALL">
                    {province === "ALL" 
                      ? t.selectProvinceFirst 
                      : `All Cities in ${province} (${citiesByProvince[province]?.length || 0})`
                    }
                  </option>
                  {province !== "ALL" && citiesByProvince[province]?.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Min LMIAs Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {minLMIAs !== "1" && minLMIAs !== "" && (
                  <button
                    onClick={() => setMinLMIAs("1")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Top Cities Quick Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.quickCityFilter}
            </label>
            <div className="flex flex-wrap gap-2">
              {TOP_CITIES.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setProvince("ALL");
                    setCity(c);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                    city === c
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="pt-4 border-t">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showAdvanced ? t.hideAdvanced : t.showAdvanced}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* NOC Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.nocSearch}
                  </label>
                  <div className="relative">
                    <input
                      placeholder={t.nocPlaceholder}
                      value={noc}
                      onChange={(e) => setNoc(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {noc && (
                      <button
                        onClick={() => setNoc("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stream Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.programStream}
                  </label>
                  <div className="relative">
                    <select
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="ALL">{t.allStreams}</option>
                      {useMemo(() => {
                        const streamSet = new Set<string>();
                        rows.forEach(r => {
                          if (r["Program Stream"] && r["Program Stream"].length > 0) {
                            streamSet.add(r["Program Stream"]);
                          }
                        });
                        return Array.from(streamSet).sort((a, b) => a.localeCompare(b));
                      }, [rows]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t.records}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filtered.length.toLocaleString()} {t.results})
                </span>
              </h2>
              
              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Rows per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t.rowsPerPage}:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                
                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {t.page} {currentPage} {t.of} {totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t.employer}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t.location}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t.nocDetails}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t.programStream}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LMIAs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900 mb-1">{t.noRecords}</p>
                        <p className="text-gray-600">{t.tryFilters}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((r, i) => (
                    <tr 
                      key={i} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 group-hover:text-blue-600">
                          {r["Employer Name"]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{r.City}</span>
                          <span className="text-sm text-gray-500">
                            {r.Province} - {PROVINCE_NAMES[r.Province || ""]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block w-fit">
                            {r["NOC Code"] || "N/A"}
                          </code>
                          <span className="text-sm text-gray-600 mt-1">{r["NOC Title"]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {r["Program Stream"] || t.notSpecified}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 text-lg">
                            {r["Positive LMIAs"]?.toLocaleString() || 0}
                          </span>
                          {r["Positive LMIAs"] && r["Positive LMIAs"] >= 10 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {t.highVolume}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Bottom Pagination */}
          {filtered.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  {t.showing} {startIndex + 1}-{Math.min(endIndex, filtered.length)} {t.of} {filtered.length.toLocaleString()} {t.results}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    {t.previous}
                  </button>
                  
                  <div className="flex items-center gap-1">
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
                          className={`w-8 h-8 text-sm rounded ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-1">...</span>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className="w-8 h-8 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================
// INSIGHT CARD COMPONENT
// ================================

function InsightCard({ label, value, icon }: { 
  label: string; 
  value: any; 
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}