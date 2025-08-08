import { Client } from "@opensearch-project/opensearch";

function parseCapital(text) {
  if (!text) return { amount: null, percent: null };
  const pct = /([0-9]+(?:[\.,][0-9]+)?)%/.exec(text)?.[1] || null;
  const amt = /([0-9.]+,[0-9]{2})\s*(€|Ευρώ)/.exec(text)?.[1] || null;
  const percent = pct ? parseFloat(pct.replace(",", ".")) : null;
  const amount = amt ? parseFloat(amt.replace(/\./g, "").replace(",", ".")) : null;
  return { amount, percent };
}

function toDoc(company) {
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
        doc_date: /^\d{4}-\d{2}-\d{2}/.test(file) ? file.substring(0, 10) : null,
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

function resolveIndex(company, baseIndex, strategy = "static") {
  if (strategy === "by-year") {
    const snap = company?.metadata?.["current-snapshot"] || {};
    const dateStr = snap.document_date || company["creation-date"] || null;
    const year = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr.substring(0, 4) : "unknown";
    return `${baseIndex}-${year}`;
  }
  return baseIndex;
}

export function buildOpenSearchClient({ endpoint, username, password, insecure = false }) {
  const opts = {
    node: endpoint,
  };
  if (username || password) {
    opts.auth = { username: username || "", password: password || "" };
  }
  if (endpoint?.startsWith("https://")) {
    opts.ssl = { rejectUnauthorized: !insecure };
  }
  return new Client(opts);
}

export async function pushCompaniesToOpenSearch(companies, {
  endpoint,
  username,
  password,
  index = "govdoc-companies-000001",
  indexStrategy = "static",
  insecure = false,
  batchSize = 500,
  refresh = false,
} = {}) {
  if (!endpoint) {
    throw new Error("OpenSearch endpoint is required (e.g., https://localhost:9200)");
  }

  const client = buildOpenSearchClient({ endpoint, username, password, insecure });

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const body = [];
    for (const company of batch) {
      const targetIndex = resolveIndex(company, index, indexStrategy);
      body.push({ index: { _index: targetIndex, _id: company["gemi-id"] } });
      body.push(toDoc(company));
    }
    const resp = await client.bulk({ refresh: refresh ? "wait_for" : false, body });
    const b = resp?.body ?? resp;

    if (b?.errors) {
      for (const item of (b.items || [])) {
        const res = item.index || item.create || item.update || item.delete;
        if (res && res.error) {
          failed++;
          errors.push({ id: res._id, index: res._index, error: res.error });
        } else {
          success++;
        }
      }
    } else {
      success += (b?.items || []).length;
    }
  }

  return { success, failed, errors };
}
