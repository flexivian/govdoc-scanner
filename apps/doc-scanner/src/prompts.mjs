/**
 * Gemini prompts for Greek GEMI document processing
 * Optimized for representative identification and Greek legal terminology
 */
export function getInitialExtractionPrompt(extractedDate) {
  return `You are analyzing a Greek GEMI (General Commercial Registry) document to extract essential company metadata. This document may be one of the following types:
- Ανακοίνωση τροποποίησης καταστατικού (Constitutional amendment announcement)
- Ανακοίνωση εκλογής ελεγκτών (Auditor election announcement)
- Καταχώρηση απόφασης Συνέλευσης Εταίρων (Partners Assembly decision registration)
- Εκλογή ΔΣ και συγκρότηση αυτού σε σώμα (Board election and formation)
- Ανακοίνωση σύστασης από ΥΜΣ (Foundation announcement from Limited Partnership)
- Partnership share transfers and modifications
- Other corporate legal documents

CRITICAL INSTRUCTIONS FOR REPRESENTATIVES:
1. ONLY include people who are CURRENT representatives at the time of this document
2. Look for these patterns to identify representatives:
   
   ACTIVE REPRESENTATIVES (is_active = TRUE):
   - People described as "ομόρρυθμος εταίρος" (general partner) currently in the company
   - People described as "διαχειριστής" (manager/administrator) currently active
   - People being appointed or elected to positions
   - People who remain after transfers/changes
   - **IMPORTANT**: People who have εταιρικό κεφάλαιο (company capital/shares) are ACTIVE
   
   DEPARTING REPRESENTATIVES (is_active = FALSE):
   - People described as leaving: "αποχωρεί", "αποχώρηση", "παραιτείται"
   - People transferring their shares completely and leaving
   - People being replaced or removed from positions
   - People who no longer hold εταιρικό κεφάλαιο (company capital/shares)
   
3. Common role keywords:
   - "Διαχειριστής" (Manager/Administrator)
   - "Ομόρρυθμος εταίρος" (General partner)
   - "Ετερόρρυθμος εταίρος" (Limited partner)
   - "Μέλος ΔΣ" (Board member)
   - "Πρόεδρος" (President)
   - "Διευθύνων Σύμβουλος" (Managing Director)

4. For partnership documents, pay attention to:
   - Who is transferring shares and leaving vs staying
   - New partners entering the company
   - Changes in management roles during transfers
   - Share percentages and capital amounts for each representative

5. EXTRACT CAPITAL SHARE INFORMATION:
   - Look for share percentages: "ποσοστό στα κέρδη και στις ζημίες X%"
   - Look for capital amounts: "μετέχει στο εταιρικό κεφάλαιο με X ευρώ"
   - Examples: "49%", "51%", "20%", "9.800,00 ευρώ"
   - Include this in the capital_share field for each representative

6. DO NOT include:
   - Lawyers, accountants, notaries
   - Government officials or registry personnel
   - Witnesses to documents
   - People mentioned only in historical context

Document date extracted from filename: ${extractedDate || "Unknown"}

Strictly follow the provided JSON schema. For fields where information is not found or you are not 100% certain, use null.
Ensure all text results are in Greek. Use only the exact choices from the enums where applicable.`;
}

export function getMergeMetadataPrompt(extractedDate, existingMetadata) {
  return `You are analyzing a new Greek GEMI document to update existing company metadata. Your task is to intelligently merge information while being extremely careful about representative identification.

DOCUMENT TYPES YOU MAY ENCOUNTER:
- Ανακοίνωση τροποποίησης καταστατικού (Constitutional amendments)
- Ανακοίνωση εκλογής ελεγκτών (Auditor elections)
- Εκλογή ΔΣ και συγκρότηση αυτού σε σώμα (Board elections)
- Καταχώρηση απόφασης Συνέλευσης Εταίρων (Assembly decisions)
- Partnership share transfers and ownership changes
- And other corporate legal documents

CRITICAL REPRESENTATIVE UPDATE RULES:

1. UNDERSTAND THE DOCUMENT CONTEXT:
   - If it's a share transfer document, identify who is LEAVING vs who is STAYING/ENTERING
   - Look for phrases like "αποχωρεί", "αποχώρηση", "μεταβιβάζει" (leaving/transferring)
   - Look for phrases like "εισέρχεται", "γίνεται εταίρος" (entering/becoming partner)
   - People who transfer ALL their shares typically become inactive
   - People receiving shares or being appointed become active

2. UPDATE is_active STATUS CAREFULLY:
   - Set to FALSE: 
     * People explicitly leaving: "αποχωρεί", "παραιτείται", "αποχώρηση"
     * People transferring all their shares and exiting
     * People who no longer hold εταιρικό κεφάλαιο (company capital/shares)
     * People being replaced by others
   - Set to TRUE:
     * New people entering the company with roles
     * People being elected or appointed
     * People remaining active after changes
     * People receiving shares and becoming partners
     * **IMPORTANT**: People who have εταιρικό κεφάλαιο (company capital/shares) are ACTIVE

3. ROLE IDENTIFICATION:
   - "Ομόρρυθμος εταίρος" = General partner (active in management)
   - "Ετερόρρυθμος εταίρος" = Limited partner (passive investor)
   - "Διαχειριστής" = Manager/Administrator
   - For O.E. (Ομόρρυθμη Εταιρία), partners are typically also managers

4. SHARE OWNERSHIP RULE:
   - Look for mentions of share percentages or εταιρικό κεφάλαιο amounts
   - Examples: "μετέχει στο εταιρικό κεφάλαιο με... ποσοστό στα κέρδη και στις ζημίες 49,00%"
   - People with current share ownership are ACTIVE representatives
   - People who transferred all shares and have no remaining ownership are INACTIVE
   - EXTRACT the specific percentage or amount for the capital_share field

5. DUPLICATE PREVENTION & MERGING:
   - MERGE representatives by name - do NOT create duplicates
   - If a person already exists in the array, UPDATE their existing entry
   - Handle name variations (e.g., "ΚΥΡΙΑΖΟΣ" vs "ΚΥΡΙΑΖΟ")
   - Update role if the new document provides more specific information
   - Update is_active status based on the MOST RECENT document action
   - Update capital_share with the most recent ownership information
   - Only ADD new entries for people not already in the array

6. SPECIAL HANDLING FOR PARTNERSHIP CHANGES:
   - When partners transfer shares, determine if they remain in the company
   - New shareholders often become "ομόρρυθμος εταίρος" in O.E. companies
   - Someone can transfer shares but remain as manager (check carefully)

7. DO NOT include lawyers, accountants, notaries, witnesses, or government officials

MERGE STRATEGY:
1. Keep all existing valid information
2. Update fields based on chronological order - newer documents override older ones
3. For representatives: MERGE by name, do NOT duplicate people
4. Always update document_date to: ${extractedDate || "Unknown"}
5. Maintain consistency in Greek language and enum values
6. CRITICAL: Return a clean representatives array with NO duplicates

IMPORTANT: The representatives array should contain each person only ONCE. If someone appears in both the existing metadata and the new document, merge their information into a single entry with the most current status.

Existing metadata:
${JSON.stringify(existingMetadata, null, 2)}

New document date: ${extractedDate || "Unknown"}

Analyze the new document and return updated metadata following the JSON schema. Focus especially on accurate representative identification and status updates based on the document's specific actions (transfers, appointments, departures).`;
}
