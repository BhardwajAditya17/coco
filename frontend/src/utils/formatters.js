/**
 * Formats an ISO date string into a localized, readable date.
 * @param {string|Date} dateString - The date to format
 * @param {boolean} includeTime - Whether to include the time in the output
 * @returns {string} e.g., "Oct 24, 2023" or "Oct 24, 2023, 2:30 PM"
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'Unknown Date';
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  
  try {
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Converts a date into a relative time string.
 * @param {string|Date} dateString 
 * @returns {string} e.g., "Just now", "5m ago", "2h ago", or formatted date if older than 24h
 */
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    // Fallback to standard date for anything older than 24 hours
    return formatDate(dateString);
  } catch (error) {
    return '';
  }
};

/**
 * Formats large numbers for compact display.
 * @param {number} num 
 * @returns {string} e.g., 1500 -> "1.5k", 2500000 -> "2.5M"
 */
export const formatCompactNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  } catch (error) {
    return num.toString();
  }
};

/**
 * Masks sensitive identification numbers (like Aadhaar or Registration IDs) 
 * to display only the last 4 digits for UI security.
 * @param {string|number} idNumber 
 * @returns {string} e.g., "XXXX-XXXX-1234"
 */
export const maskSensitiveId = (idNumber) => {
  if (!idNumber) return '';
  
  const str = String(idNumber).replace(/\s/g, ''); // Remove existing spaces
  if (str.length < 4) return str;
  
  const lastFour = str.slice(-4);
  const maskedLength = str.length - 4;
  
  // Create a masked string and format it with hyphens every 4 characters
  const maskedSection = 'X'.repeat(maskedLength);
  const fullMasked = maskedSection + lastFour;
  
  return fullMasked.match(/.{1,4}/g).join('-');
};