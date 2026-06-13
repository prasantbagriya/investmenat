import { getAccessToken, handleFirestoreError, OperationType } from '../firebase';

/**
 * Creates a new Google Document using the Google Docs REST API.
 * @param title The title of the new document.
 * @returns The created document object containing documentId and other metadata.
 */
export async function createGoogleDoc(title: string) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google authentication required to create documents.');
  }

  try {
    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Docs API Error:", errorText);
      throw new Error(`Google Docs API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'google_docs_api');
    throw error;
  }
}

/**
 * Inserts text into an existing Google Document.
 * @param documentId The ID of the document.
 * @param text The text to insert.
 */
export async function insertTextToDoc(documentId: string, text: string) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google authentication required to write to documents.');
  }

  try {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: {
                index: 1, // Insert at the beginning of the document
              },
              text: text
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Docs API Error:", errorText);
      throw new Error(`Google Docs API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `google_docs_api/${documentId}`);
    throw error;
  }
}

/**
 * Helper to create a fully populated sample report.
 */
export async function generateSampleReportDoc(reportData: any) {
  try {
    const title = reportData.title || `InvestMant Report - ${new Date().toLocaleDateString()}`;
    const doc = await createGoogleDoc(title);
    
    if (doc && doc.documentId) {
      const bodyText = `
InvestMant Auto-Generated Report
---------------------------------
Generated on: ${new Date().toLocaleString()}

Content:
${JSON.stringify(reportData, null, 2)}

This document was successfully created via the InvestMant Google Docs Integration!
`;
      await insertTextToDoc(doc.documentId, bodyText);
      console.log(`Document created successfully: https://docs.google.com/document/d/${doc.documentId}/edit`);
      return doc.documentId;
    }
  } catch (error) {
    console.error("Failed to generate sample report:", error);
    throw error;
  }
}
