export function companyToDoc(company) {
  const gemiId = company["gemi-id"];
  const snap = company?.metadata?.["current-snapshot"] || {};
  const reps = (snap.representatives || []).map((r) => ({
    name: r.name ?? null,
    role: r.role ?? null,
    is_active: r.is_active ?? null,
    tax_id: r.tax_id ?? null,
    capital_amount: r.capital_amount ?? null,
    capital_percentage: r.capital_percentage ?? null,
  }));
  const historyObj = company["tracked-changes"] || null;
  const history = historyObj
    ? Object.entries(historyObj).map(([file, summary]) => {
        let companyChanges = null;
        let economicChanges = null;
        if (summary && typeof summary === "object") {
          companyChanges =
            summary.company_changes || summary.tracked_company_changes || null;
          economicChanges =
            summary.economic_changes ||
            summary.tracked_economic_changes ||
            null;
        }
        return {
          file_name: file,
          doc_date: /^\d{4}-\d{2}-\d{2}/.test(file)
            ? file.substring(0, 10)
            : null,
          company_changes: companyChanges,
          economic_changes: economicChanges,
        };
      })
    : [];
  const trackedCompany = snap.tracked_company_changes;
  const trackedEconomic = snap.tracked_economic_changes;

  return {
    gemi_id: gemiId,
    company_name: company["company-name"] ?? snap.company_name ?? null,
    company_tax_id: company["company-tax-id"] ?? snap.company_tax_id ?? null,
    creation_date: company["creation-date"] ?? null,
    scan_date: company["scan-date"] ?? null,
    registered_address: snap.registered_address ?? null,
    company_type: snap.company_type ?? null,
    competent_gemi_office: snap.competent_gemi_office ?? null,
    region: snap.region ?? null,
    city: snap.city ?? null,
    postal_code: snap.postal_code ?? null,
    document_date: snap.document_date ?? null,
    total_capital_amount: snap.total_capital_amount ?? null,
    equity_amount: snap.equity_amount ?? null,
    total_assets: snap.total_assets ?? null,
    total_liabilities: snap.total_liabilities ?? null,
    tracked_company_changes: trackedCompany ?? null,
    tracked_economic_changes: trackedEconomic ?? null,
    representatives: reps,
    tracked_changes_history: history,
    raw: { source: "cli", version: 2 },
  };
}

export default companyToDoc;
