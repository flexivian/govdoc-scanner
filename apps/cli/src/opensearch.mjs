import { buildOpenSearchClient } from "../../../shared/opensearch/client.mjs";
import { companyToDoc } from "../../../shared/opensearch/transform.mjs";

function resolveIndex(company, baseIndex, strategy = "static") {
  if (strategy === "by-year") {
    const snap = company?.metadata?.["current-snapshot"] || {};
    const dateStr = snap.document_date || company["creation-date"] || null;
    const year =
      dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr.substring(0, 4)
        : "unknown";
    return `${baseIndex}-${year}`;
  }
  return baseIndex;
}

export async function pushCompaniesToOpenSearch(
  companies,
  {
    endpoint,
    username,
    password,
    index = "govdoc-companies-000001",
    indexStrategy = "static",
    insecure = false,
    batchSize = 500,
    refresh = false,
  } = {}
) {
  if (!endpoint) {
    throw new Error(
      "OpenSearch endpoint is required (e.g., https://localhost:9200)"
    );
  }

  const client = buildOpenSearchClient({
    endpoint,
    username,
    password,
    insecure,
  });

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const body = [];
    for (const company of batch) {
      const targetIndex = resolveIndex(company, index, indexStrategy);
      body.push({ index: { _index: targetIndex, _id: company["gemi-id"] } });
      body.push(companyToDoc(company));
    }
    const resp = await client.bulk({
      refresh: refresh ? "wait_for" : false,
      body,
    });
    const b = resp?.body ?? resp;

    if (b?.errors) {
      for (const item of b.items || []) {
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
