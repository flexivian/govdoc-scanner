const legal_types = [
  "AE (Ανώνυμη Εταιρία)",
  "OE (Ομόρρυθμη Εταιρία)",
  "ΣυνΠΕ (Συνεταιριστική ΠΕ)",
  "EE (Εταιρία Ετερόρρυθμη)",
  "ΕΠΕ (Εταιρία Περιορισμένης Ευθύνης)",
  "Ευρωπαϊκός Όμιλος Οικονομικού Σκοπού",
  "Συνεταιρισμός",
  "Ευρωπαϊκή Εταιρία (SE)",
  "Ευρωπαϊκή Συνεταιριστική Εταιρία (SCE)",
  "Κοινοπραξία",
  "Υποκατάστημα Αλλοδαπής",
  "ΑΤΟΜΙΚΗ",
  "ΑΣΤΙΚΗ ΕΤΑΙΡΕΙΑ 784 Α.Κ.",
  "IKE (Ιδιωτική Κεφαλαιουχική Εταιρεία)",
  "ΚΟΙ.Σ.Π.Ε (Κοινωνικός Συνεταιρισμός Περιορισμένης Ευθύνης)",
  "Αγροτικός Συνεταιρισμός",
  "Ενεργειακή Κοινότητα",
  "Κοιν.Σ.Επ. (Κοινωνική Συνεταιριστική Επιχείρηση)",
  "Συνεταιρισμός Εργαζομένων",
  "ΕΕ κατά μετόχες",
  "ΚΟΙΝΟΤΗΤΑ ΑΝΑΝΕΩΣΙΜΗΣ ΕΝΕΡΓΕΙΑΣ",
  "ΕΝΕΡΓΕΙΑΚΗ ΚΟΙΝΟΤΗΤΑ ΠΟΛΙΤΩΝ",
];

const competent_gemi_offices = [
  "ΕΜΠΟΡΙΚΟ & ΒΙΟΜΗΧΑΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΘΗΝΩΝ",
  "ΒΙΟΤΕΧΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΘΗΝΑΣ",
  "ΕΠΑΓΓΕΛΜΑΤΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΘΗΝΑΣ",
  "ΕΜΠΟΡΙΚΟ & ΒΙΟΜΗΧΑΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΘΕΣ/ΝΙΚΗΣ",
  "ΒΙΟΤΕΧΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΘΕΣΣΑΛΟΝΙΚΗΣ",
  "ΕΠΑΓΓΕΛΜΑΤΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΘΕΣΣΑΛΟΝΙΚΗΣ",
  "ΕΜΠΟΡΙΚΟ & ΒΙΟΜΗΧΑΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΕΙΡΑΙΩΣ",
  "ΒΙΟΤΕΧΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΕΙΡΑΙΩΣ",
  "ΕΠΑΓΓΕΛΜΑΤΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΕΙΡΑΙΩΣ",
  "ΕΜΠΟΡΙΚΟ & ΒΙΟΜΗΧΑΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΡΟΔΟΠΗΣ",
  "ΕΠΑΓΓΕΛΜΑΤΙΚΟ & ΒΙΟΤΕΧΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΡΟΔΟΠΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΙΤΩΛΟΑΚΑΡΝΑΝΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΡΓΟΛΙΔΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΡΚΑΔΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΡΤΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΧΑΪΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΒΟΙΩΤΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΓΡΕΒΕΝΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΔΡΑΜΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΔΩΔ/ΝΗΣΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΕΒΡΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΕΥΒΟΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΕΥΡΥΤΑΝΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΖΑΚΥΝΘΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΗΛΕΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΗΜΑΘΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΗΡΑΚΛΕΙΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΘΕΣΠΡΩΤΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΙΩΑΝΝΙΝΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΑΒΑΛΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΑΡΔΙΤΣΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΑΣΤΟΡΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΕΡΚΥΡΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΕΦΑΛΛΗΝΙΑΣ-ΙΘΑΚΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΙΛΚΙΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΟΖΑΝΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΟΡΙΝΘΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΚΥΚΛΑΔΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΛΑΚΩΝΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΛΑΡΙΣΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΛΑΣΙΘΙΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΛΕΣΒΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΛΕΥΚΑΔΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΜΑΓΝΗΣΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΜΕΣΣΗΝΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΞΑΝΘΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΕΛΛΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΙΕΡΙΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΠΡΕΒΕΖΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΡΕΘΥΜΝΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΣΑΜΟΥ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΣΕΡΡΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΤΡΙΚΑΛΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΦΘΙΩΤΙΔΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΦΛΩΡΙΝΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΦΩΚΙΔΑΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΧΑΛΚΙΔΙΚΗΣ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΧΑΝΙΩΝ",
  "ΕΠΙΜΕΛΗΤΗΡΙΟ ΧΙΟΥ",
  "Δ/νση Εταιρειών (Γενική Γραμματεία Εμπορίου & Προστασίας Καταναλωτή)",
  "ΚΕΝΤΡΙΚΗ ΕΝΩΣΗ ΕΠΙΜΕΛΗΤΗΡΙΩΝ",
  "Υ.ΚΟΙ.Σ.Ο.-Διεύθυνση Κ.Α.Λ.Ο.",
];

export const CompanyEssentialMetadata = {
  title: "Company Essential Metadata",
  description: "Extract essential company metadata from documents",
  type: "object",
  properties: {
    gemi_id: {
      type: "string",
      description:
        "General Commercial Registry (GEMI) identification number - a 12-digit number uniquely identifying the company in the Greek registry system",
      nullable: true,
    },
    company_tax_id: {
      type: "string",
      description:
        "Greek Tax Identification Number (ΑΦΜ) - a 9-digit number assigned by the tax authorities",
      nullable: true,
    },
    company_name: {
      type: "string",
      description:
        "Official registered company name in Greek (all caps), exactly as it appears in GEMI registry. Include legal form if part of the name (e.g., 'ΠΑΡΑΔΕΙΓΜΑ ΕΤΑΙΡΙΑ Α.Ε.')",
      nullable: true,
    },
    total_capital_amount: {
      type: "string",
      description:
        "Total registered capital of the company, extracted verbatim from document with Greek formatting (commas for decimals). Format: 'X.XXX.XXX,XX€'. In capital change documents, look for final amounts after phrases like 'μετά τα ανωτέρω θα διαμορφωθεί σε' or similar. Search for: 'εταιρικό κεφάλαιο', 'συνολικό κεφάλαιο', 'κεφάλαιο της εταιρείας'. Extract the FINAL total amount, not initial amounts.",
      nullable: true,
    },
    equity_amount: {
      type: "string",
      description:
        "Company's equity/shareholders' equity extracted verbatim from document with Greek formatting (commas for decimals). Format: 'X.XXX.XXX,XX€'. Search for exact phrases: 'Καθαρή Θέση', 'Ίδια Κεφάλαια'. Set null if not explicitly stated in the document.",
      nullable: true,
    },
    total_assets: {
      type: "string",
      description:
        "Total assets of the company extracted verbatim from document with Greek formatting (commas for decimals). Format: 'X.XXX.XXX,XX€'. Search for exact phrase: 'Σύνολο Ενεργητικού'. Set null if not explicitly stated in the document.",
      nullable: true,
    },
    total_liabilities: {
      type: "string",
      description:
        "Total liabilities of the company extracted verbatim from document with Greek formatting (commas for decimals). Format: 'X.XXX.XXX,XX€'. Search for exact phrase: 'Σύνολο Υποχρεώσεων'. Set null if not explicitly stated in the document.",
      nullable: true,
    },
    representatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Full name of company representative in Greek format: 'ΕΠΩΝΥΜΟ ΟΝΟΜΑ' (surname first, all caps). Examples: 'ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ', 'ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΡΙΑ'. Extract exactly as written in official sections. EXCLUDE: father's/mother's names (patronymics like 'του ΓΕΩΡΓΙΟΥ', 'της ΜΑΡΙΑΣ'), titles, service providers (lawyers/accountants/notaries). INCLUDE ONLY: persons with explicit representative authority in corporate governance.",
            nullable: true,
          },
          role: {
            type: "string",
            description:
              "Exact representative role in Greek as stated in document. Priority roles: 'Διαχειριστής' (Manager), 'Ομόρρυθμος εταίρος' (General Partner - unlimited liability), 'Ετερόρρυθμος εταίρος' (Limited Partner - passive investor), 'Πρόεδρος ΔΣ' (Board Chairman), 'Διευθύνων Σύμβουλος' (CEO), 'Μέλος ΔΣ' (Board Member), 'Αντιπρόεδρος ΔΣ' (Vice Chairman). Use verbatim Greek terminology from official document sections. Multiple roles possible for single person (e.g., both partner and manager).",
            nullable: true,
          },
          is_active: {
            type: "boolean",
            description:
              "Current representative status based on THIS document's specific actions. TRUE for: appointments ('εκλέγεται', 'διορίζεται'), continuing roles ('παραμένει', 'συνεχίζει'), share acquisition, or current ownership. FALSE for: departures ('αποχωρεί', 'παραιτείται'), replacements ('αντικαθίσταται'), complete share transfers, or role termination ('παύει'). Base determination on explicit document actions, not assumptions.",
            nullable: true,
          },
          tax_id: {
            type: "string",
            description:
              "Greek Tax ID (ΑΦΜ, Α.Φ.Μ.) of the representative - a 9-digit number. Only include if explicitly mentioned in the document.",
            nullable: true,
          },
          capital_amount: {
            type: "string",
            description:
              "Capital amount owned by the representative in the company, extracted verbatim from document with Greek formatting (commas for decimals). Format: 'X.XXX,XX€'. Search for exact phrases: 'μετέχει στο εταιρικό κεφάλαιο με X€', 'κεφάλαιο X€'. Set null if no monetary amount is specified or person transferred all shares.",
            nullable: true,
          },
          capital_percentage: {
            type: "string",
            description:
              "Percentage ownership stake of the representative in the company, extracted verbatim from document. Format: 'XX%' or 'XX,XX%'. Search for exact phrases: 'ποσοστό στα κέρδη και στις ζημίες X%', 'εταιρικό μερίδιο X%', 'ποσοστό συμμετοχής X%'. Extract precise numerical values with Greek formatting (commas for decimals). Set null if no percentage is specified or person transferred all shares.",
            nullable: true,
          },
        },
        required: [
          "name",
          "role",
          "is_active",
          "tax_id",
          "capital_amount",
          "capital_percentage",
        ],
      },
      description:
        "Company representatives array with strict inclusion criteria. INCLUDE ONLY: persons with explicit corporate governance roles (Διαχειριστής, Ομόρρυθμος/Ετερόρρυθμος εταίρος, ΔΣ members, executives) who have legal authority in company management or ownership. EXCLUDE: service providers (δικηγόροι/lawyers, λογιστές/accountants, συμβολαιογράφοι/notaries), witnesses (μάρτυρες), GEMI officials, historical references. Prioritize accuracy over completeness - when uncertain about representative status, exclude the person.",
      nullable: true,
    },
    registered_address: {
      type: "string",
      description:
        "Official registered company address in Greek, format: 'STREET NUMBER, CITY' (all caps). Example: 'ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ 125, ΑΘΗΝΑ'. Do NOT include: δημος (municipality), ταχυδρομικός κώδικας (postal code), περιφέρεια (region), or country. Extract only street address and city.",
      nullable: true,
    },
    company_type: {
      type: "string",
      description:
        "Legal structure of the company. Must match exactly one of the predefined enum values. Common types: 'AE (Ανώνυμη Εταιρία)' for corporations, 'OE (Ομόρρυθμη Εταιρία)' for general partnerships, 'ΕΠΕ (Εταιρία Περιορισμένης Ευθύνης)' for limited liability companies, 'IKE (Ιδιωτική Κεφαλαιουχική Εταιρεία)' for private companies.",
      nullable: true,
      enum: legal_types,
    },
    competent_gemi_office: {
      type: "string",
      description:
        "The specific Chamber of Commerce or GEMI office responsible for this company's registration. Must match exactly one of the predefined enum values. Examples: 'ΕΜΠΟΡΙΚΟ & ΒΙΟΜΗΧΑΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΘΗΝΩΝ', 'ΕΠΙΜΕΛΗΤΗΡΙΟ ΘΕΣΣΑΛΟΝΙΚΗΣ'",
      nullable: true,
      enum: competent_gemi_offices,
    },
    region: {
      type: "string",
      description:
        "Regional unit (Περιφερειακή Ενότητα) where company is registered. Examples: 'ΑΤΤΙΚΗΣ', 'ΘΕΣΣΑΛΟΝΙΚΗΣ', 'ΑΧΑΪΑΣ'. Use only the regional unit name, not the full 'Περιφερειακή Ενότητα' prefix.",
      nullable: true,
    },
    city: {
      type: "string",
      description:
        "City/municipality name where company is registered (all caps). Examples: 'ΑΘΗΝΑ', 'ΘΕΣΣΑΛΟΝΙΚΗ', 'ΠΑΤΡΑ'. Do not include regional information.",
      nullable: true,
    },
    postal_code: {
      type: "string",
      description:
        "Postal code (Ταχυδρομικός Κώδικας, Τ.Κ.) of the company, consisting of 5 digits. Example: '11526'. Extract only the numeric code, do not include the 'Τ.Κ.' prefix or any other address details. Ensure the code matches the official postal code for the registered address as stated in the document.",
      nullable: true,
    },
    document_date: {
      type: "string",
      description:
        "Date when the GEMI document was issued/registered, in YYYY-MM-DD format. This should match the document's official date, not the filename date if they differ.",
      nullable: true,
    },
    tracked_company_changes: {
      type: "string",
      description:
        "Summary of key company structure changes from the previous document state, formatted as a bulleted list. Include only significant changes such as: representative appointments/departures, role changes, ownership transfers, address updates, or company name changes. Example: '• ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ appointed as Διαχειριστής • ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΡΙΑ role changed from Εταίρος to Διαχειριστής • Company address changed to ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ 200, ΑΘΗΝΑ'. Leave null for initial document extraction when no comparison exists.",
      nullable: true,
    },
    tracked_economic_changes: {
      type: "string",
      description:
        "Summary of key economic/financial changes from the previous document state, formatted as a bulleted list. Include only significant changes such as: total capital amount changes, representative capital changes, or pre-tax profit growth figures. Example: '• Total capital increased from 10.000,00€ to 50.000,00€ • ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ capital increased from 5.000,00€ to 25.000,00€ • Pre-tax profit growth: 15%/8000€'. Leave null for initial document extraction when no comparison exists.",
      nullable: true,
    },
  },
  required: [
    "gemi_id",
    "company_tax_id",
    "company_name",
    "total_capital_amount",
    "equity_amount",
    "total_assets",
    "total_liabilities",
    "representatives",
    "registered_address",
    "company_type",
    "competent_gemi_office",
    "region",
    "city",
    "postal_code",
    "document_date",
    "tracked_company_changes",
    "tracked_economic_changes",
  ],
  propertyOrdering: [
    "gemi_id",
    "company_tax_id",
    "company_name",
    "total_capital_amount",
    "equity_amount",
    "total_assets",
    "total_liabilities",
    "representatives",
    "registered_address",
    "company_type",
    "competent_gemi_office",
    "region",
    "city",
    "postal_code",
    "document_date",
    "tracked_company_changes",
    "tracked_economic_changes",
  ],
};
