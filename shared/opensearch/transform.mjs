function parseCapital(text) {
  if (!text) return { amount: null, percent: null };
  const pct = /([0-9]+(?:[\.,][0-9]+)?)%/.exec(text)?.[1] || null;
  const amt = /([0-9.]+,[0-9]{2})\s*(€|Ευρώ)/.exec(text)?.[1] || null;
  const percent = pct ? parseFloat(pct.replace(",", ".")) : null;
  const amount = amt
    ? parseFloat(amt.replace(/\./g, "").replace(",", "."))
    : null;
  return { amount, percent };
}

export function companyToDoc(company) {
  const gemiId = company["gemi-id"];
  const snap = company?.metadata?.["current-snapshot"] || {};
  const reps = (snap.representatives || []).map((r) => {
    const { amount, percent } = parseCapital(r.capital_share);
    return {
      name: r.name ?? null,
      role: r.role ?? null,
      is_active: r.is_active ?? null,
      tax_id: r.tax_id ?? null,
      capital_share_text: r.capital_share ?? null,
      capital_share_percent: percent,
      capital_share_amount_eur: amount,
    };
  });
  const historyObj = company["tracked-changes"] || null;
  const history = historyObj
    ? Object.entries(historyObj).map(([file, summary]) => ({
        file_name: file,
        doc_date: /^\d{4}-\d{2}-\d{2}/.test(file)
          ? file.substring(0, 10)
          : null,
        summary,
      }))
    : [];
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
    tracked_changes_current: snap.tracked_changes ?? null,
    representatives: reps,
    tracked_changes_history: history,
    raw: { source: "cli", version: 1 },
  };
}

export default companyToDoc;
