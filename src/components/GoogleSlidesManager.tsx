import { getAccessToken, handleFirestoreError, OperationType } from '../firebase';

/**
 * Creates a new Google Slides presentation.
 * @param title The title of the new presentation.
 * @returns The created presentation object containing presentationId and other metadata.
 */
export async function createGoogleSlide(title: string) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google authentication required to create presentations.');
  }

  try {
    const response = await fetch('https://slides.googleapis.com/v1/presentations', {
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
      console.error("Google Slides API Error:", errorText);
      throw new Error(`Google Slides API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'google_slides_api');
    throw error;
  }
}

/**
 * Helper to create a fully populated sample presentation deck.
 */
export async function generateSampleSlideDeck(presentationData: any) {
  try {
    const title = presentationData.title || `InvestMant Deck - ${new Date().toLocaleDateString()}`;
    const presentation = await createGoogleSlide(title);
    
    if (presentation && presentation.presentationId) {
      console.log(`Presentation created successfully: https://docs.google.com/presentation/d/${presentation.presentationId}/edit`);
      return presentation.presentationId;
    }
  } catch (error) {
    console.error("Failed to generate sample slide deck:", error);
    throw error;
  }
}
