/**
 * Client-side Gemini AI Service
 * Enables direct AI inference in Browser & Native APK without requiring a Node.js backend.
 */

const getApiKey = (): string => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_api_key') : '') ||
    ''
  );
};
const GEMINI_MODEL = 'gemini-3.8-flash';

async function callGeminiRest(payload: any): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY or save in Settings.');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

export async function clientChat(message: string, context: string = ''): Promise<{ reply: string }> {
  const prompt = `You are a highly professional, expert AI Financial Assistant for the app InvestMant.
Context of user's current finances (bank balances, recent transactions, assets, net worth):
${context}

User's Query: ${message}

Provide a concise, highly analytical, and tailored response. Use clear markdown formatting (bolding, lists) to make it easy to read.`;

  const text = await callGeminiRest({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  });

  return { reply: text };
}

export async function clientParseSms(
  smsText: string,
  pendingPayments: any[] = [],
  recurringBills: any[] = [],
  bankAccounts: any[] = []
): Promise<any> {
  const pendingList = pendingPayments.map((p: any) => `[ID: ${p.id}] ${p.person} owes/owed ₹${p.amount} on ${p.dueDate}`).join('\n');
  const billsList = recurringBills.map((b: any) => `[ID: ${b.id}] ${b.title} of ₹${b.amount} due on ${b.nextDueDate}`).join('\n');
  const bankAccsList = bankAccounts.map((b: any) => `[ID: ${b.id}] ${b.bankName} (${b.accountName} - ${b.accountNumber || ''})`).join('\n');

  const prompt = `You are an expert Automation Architect and Financial Data Parser. Your task is to extract transaction data from a raw bank SMS/Email and map it to a predefined JSON schema for my Personal Finance Manager.

Input SMS: ${smsText}

Available Pending Payments:
${pendingList || 'None'}

Available Recurring Bills:
${billsList || 'None'}

Available Bank Accounts:
${bankAccsList || 'None'}

Rules:
Extract: Amount, Transaction Type (Credit/Debit), Date, Payee/Merchant, and Transaction Reference Number.
Detail Extraction: Explicitly capture the Name of the sender/receiver and the UPI ID if present.
Categorize: Based on the description, automatically assign a category (e.g., 'Business', 'Trading', 'Shopping', 'Institutional', 'Utilities', 'Dining Out', 'Groceries', 'Entertainment', 'Housing', 'Transportation').
Format: Output the result as a strict JSON object without markdown formatting or code blocks.
Alignment: Ensure the data maps directly to my database schema: { "transaction_id": "", "amount": 0.00, "type": "CR/DR", "category": "", "merchant": "", "description": "", "matched_pending_id": "", "matched_recurring_id": "", "matched_bank_account_id": "" }. The "description" should combine the Merchant Name, UPI ID, and Reference Number in a clean readable format.
Cleanse: Remove any extra text, disclaimers, or noise from the input.
Matching Pending/Bills: If the SMS perfectly matches the amount and context of an available Pending Payment, set its ID in "matched_pending_id". If it matches a Recurring Bill, set its ID in "matched_recurring_id". Otherwise leave them blank strings.
Matching Bank Account: Identify which Bank Account this SMS belongs to by checking the bank name (e.g. HDFC, SBI) or the account number suffix (e.g. a/c XX1234). If it matches, set its ID in "matched_bank_account_id". Otherwise leave blank.
If the input is for Trading (e.g., deposits to a Brokerage/Prop Firm), tag it as 'Investment/Trading' category specifically. Output ONLY raw JSON.`;

  const text = await callGeminiRest({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  });

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

export async function clientParseReceipt(base64Image: string): Promise<{ result: string }> {
  const prompt = `You are an expert OCR and financial data extractor. You are provided with an image of a receipt or bill.
Extract the transaction details and output EXACTLY a JSON object with this structure:
{
  "amount": number (total amount of the bill),
  "date": "YYYY-MM-DD" (extract date if visible, else leave blank),
  "category": "Food" | "Transport" | "Shopping" | "Utilities" | "Other" (guess based on the receipt),
  "note": "Vendor name or short description"
}
Output ONLY the raw JSON object, without any markdown blocks or formatting.`;

  const text = await callGeminiRest({
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  });

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '').trim();
  return { result: clean };
}

export async function clientParseSubscriptions(emailSnippets: string): Promise<{ result: string }> {
  const prompt = `You are an AI that extracts recurring subscriptions from email snippets.
Here are recent emails that match 'subscription' or 'invoice':
${emailSnippets}

Extract any active recurring subscriptions. Output EXACTLY a JSON array of objects:
[{
  "name": "Netflix, Spotify, AWS, etc.",
  "amount": number (monthly cost in INR or local currency),
  "category": "Entertainment, Software, Utility, etc.",
  "dueDate": "YYYY-MM-DD" (guess next billing date if mentioned, else leave blank)
}]
Output ONLY the raw JSON array, without any markdown blocks or formatting.`;

  const text = await callGeminiRest({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  });

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '').trim();
  return { result: clean };
}

export async function clientParseCsv(csvText: string, bankAccounts: any[] = []): Promise<{ transactions: any[] }> {
  const bankContext = bankAccounts && bankAccounts.length > 0 
    ? `Available bank accounts:\n${bankAccounts.map((b: any) => `- ID: ${b.id}, Name: ${b.bankName}, Number: ${b.accountNumber}`).join('\n')}\nAssign matched ID to "matched_bank_account_id".`
    : '';

  const prompt = `You are a strict financial transaction parser. You are given the raw text contents of a bank statement CSV.
Your job is to extract all the transactions and return them as a JSON array.
${bankContext}

Output a JSON array where each element has this exact structure:
[{
  "date": "YYYY-MM-DD",
  "amount": number (positive),
  "type": "income" or "expense",
  "category": "Food" | "Transport" | "Shopping" | "Utilities" | "Trading" | "Salary" | "Investment" | "Entertainment" | "Healthcare" | "Transfer" | "Other",
  "note": "A short, clean description of the transaction",
  "matched_bank_account_id": "string ID or null"
}]
Output ONLY the raw JSON array, without markdown.
Raw CSV Text:
${csvText.slice(0, 10000)}
`;

  const text = await callGeminiRest({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  });

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '').trim();
  return { transactions: JSON.parse(clean) };
}
