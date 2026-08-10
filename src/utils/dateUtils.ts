export const isEntryLocked = (dateStr: string | undefined | null): boolean => {
  if (!dateStr) return false;
  
  try {
    const entryDate = new Date(dateStr);
    const today = new Date();
    
    // Normalize both dates to midnight to avoid timezone/time-of-day edge cases
    entryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = today.getTime() - entryDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Lock if strictly older than 30 days
    return diffDays > 30;
  } catch (err) {
    console.error("Error parsing date in isEntryLocked:", err);
    return false;
  }
};
