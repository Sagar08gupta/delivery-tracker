import { Ticket } from './types';

let cachedAccessToken: string | null = null;

// The static blank Google Sheet ID given by the user
export const SPREADSHEET_ID = '1nwEXVcw3MhzVnXsBaCAaIB9oXVZW_hyjHhZHYWE5woA';

export const HEADERS = [
  'Ticket ID',
  'Client Name',
  'Type of Deliverable',
  'Comments',
  'Assigned To',
  'Reviewer Name',
  'Due Date',
  'Status',
  'Region',
  'Team',
  'Delivery Date',
  'Created At'
];

/**
 * Normalizes tab names based on a date and team name
 */
export function getMonthYearTabName(dateStr: string, team: 'Personality' | 'Cognitive'): string {
  if (!dateStr || dateStr.split('-').length < 2) {
    return `other_period_${team === 'Personality' ? 'Personality' : 'Cog'}`;
  }
  const [year, month] = dateStr.split('-');
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = (mIndex >= 0 && mIndex < 12) ? months[mIndex] : 'unknown';
  return `${monthName}_${year}_${team === 'Personality' ? 'Personality' : 'Cog'}`;
}

/**
 * Attempts to discover the Firebase project's OAuth Web Client ID
 * by fetching the Firebase Auth handler configuration page.
 */
async function getFirebaseOAuthClientId(): Promise<string> {
  const authDomain = 'reference-approach-k6d0h.firebaseapp.com';
  
  try {
    // Firebase Auth handler page contains the OAuth client ID in its HTML
    const handlerUrl = `https://${authDomain}/__/auth/handler`;
    const res = await fetch(handlerUrl);
    if (res.ok) {
      const html = await res.text();
      // Look for any .apps.googleusercontent.com client ID in the page
      const matches = html.match(/[\w-]+\.apps\.googleusercontent\.com/g);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
  } catch (e) {
    console.debug('Could not fetch Firebase Auth handler:', e);
  }

  // Try the Firebase init.json config endpoint
  try {
    const res = await fetch(`https://${authDomain}/__/firebase/init.json`);
    if (res.ok) {
      const text = await res.text();
      const matches = text.match(/[\w-]+\.apps\.googleusercontent\.com/g);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
  } catch (e) {
    console.debug('Could not fetch Firebase init config:', e);
  }

  // Fallback Client ID (replace this placeholder with the actual value when known)
  const fallbackClientId = "PENDING_USER_INPUT_CLIENT_ID.apps.googleusercontent.com";
  
  if (fallbackClientId && fallbackClientId !== "PENDING_USER_INPUT_CLIENT_ID.apps.googleusercontent.com") {
    return fallbackClientId;
  }

  // If all auto-discovery fails, throw with clear instructions
  throw new Error(
    'Google Sheets Sync is currently unavailable because the system could not discover the Google OAuth Web Client ID. ' +
    'Please contact the administrator to provide the correct OAuth Web Client ID in the system configuration.'
  );
}

/**
 * Loads the Google Identity Services (GIS) library if not already loaded.
 */
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Direct Google OAuth 2.0 sign-in via Google Identity Services (GIS).
 * Bypasses Firebase Auth entirely — no "authorized domain" config needed.
 * 
 * Flow:
 * 1. Auto-discovers the OAuth Client ID from the Firebase Auth handler
 * 2. Loads the GIS library
 * 3. Opens Google's consent screen popup
 * 4. User grants Sheets write permission
 * 5. Returns the access token
 */
export const googleSignIn = async (): Promise<{ accessToken: string } | null> => {
  // If we have a cached token, verify it's still valid
  if (cachedAccessToken) {
    try {
      const verifyRes = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${cachedAccessToken}`
      );
      if (verifyRes.ok) {
        return { accessToken: cachedAccessToken };
      }
    } catch (e) {
      // Token expired or invalid, continue to re-auth
    }
    cachedAccessToken = null;
  }

  // Step 1: Discover the OAuth Client ID
  const clientId = await getFirebaseOAuthClientId();
  
  // Step 2: Load GIS
  await loadGIS();

  // Step 3: Request access token via GIS popup
  return new Promise((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(`Google OAuth error: ${response.error_description || response.error}`));
          return;
        }
        cachedAccessToken = response.access_token;
        resolve({ accessToken: response.access_token });
      },
      error_callback: (error: any) => {
        if (error.type === 'popup_closed') {
          resolve(null); // User closed the popup — not an error
        } else {
          reject(new Error(`Google OAuth error: ${error.type || 'unknown'}`));
        }
      }
    });
    tokenClient.requestAccessToken();
  });
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = () => {
  if (cachedAccessToken && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(cachedAccessToken);
  }
  cachedAccessToken = null;
};

/**
 * Maps a Ticket object into a row array aligned with HEADERS
 */
export function mapTicketToRow(ticket: Ticket): any[] {
  return [
    ticket.ticketId || '',
    ticket.clientName || '',
    ticket.deliverableType || '',
    ticket.comments || '',
    ticket.assignedTo || '',
    ticket.reviewerName || '',
    ticket.dueDate || '',
    ticket.status || '',
    ticket.region || '',
    ticket.team || '',
    ticket.deliveryDate || '',
    ticket.createdAt || ''
  ];
}

/**
 * Fetch all sheet titles (tabs) in the target spreadsheet
 */
export async function getSheetTitles(accessToken: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet tabs: ${res.statusText}`);
  }
  const data = await res.json();
  return (data.sheets || []).map((s: any) => s.properties.title);
}

/**
 * Create a new tab with the given title
 */
export async function createSheetTab(accessToken: string, title: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: title
            }
          }
        }
      ]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Create Tab Error:', errText);
    throw new Error(`Failed to create sheet tab ${title}: ${res.statusText}`);
  }
}

/**
 * Append value rows to a specific range in the spreadsheet
 */
export async function appendValues(accessToken: string, range: string, values: any[][]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: values
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Append Values Error:', errText);
    throw new Error(`Failed to append rows to range ${range}: ${res.statusText}`);
  }
}

/**
 * Clears values from a specific range in the spreadsheet
 */
export async function clearValues(accessToken: string, range: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:clear`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Clear Values Error:', errText);
    throw new Error(`Failed to clear range ${range}: ${res.statusText}`);
  }
}

/**
 * Sync a single ticket to its respective month-year tab
 */
export async function syncTicketToGoogleSheets(accessToken: string, ticket: Ticket): Promise<void> {
  const dateToUse = (ticket.status === 'Delivered' && ticket.deliveryDate) 
    ? ticket.deliveryDate 
    : ticket.dueDate;

  const tabName = getMonthYearTabName(dateToUse, ticket.team);
  
  const existingTabs = await getSheetTitles(accessToken);
  
  if (!existingTabs.includes(tabName)) {
    await createSheetTab(accessToken, tabName);
    await appendValues(accessToken, `${tabName}!A1`, [HEADERS]);
  }
  
  const rowData = mapTicketToRow(ticket);
  await appendValues(accessToken, `${tabName}!A1`, [rowData]);
}

/**
 * Fully reset and sync all tickets to Google Sheets grouped by month tabs
 */
export async function syncAllTicketsToGoogleSheets(accessToken: string, tickets: Ticket[]): Promise<void> {
  const existingTabs = await getSheetTitles(accessToken);
  
  const grouped: { [tabName: string]: Ticket[] } = {};
  tickets.forEach(ticket => {
    const dateToUse = (ticket.status === 'Delivered' && ticket.deliveryDate) 
      ? ticket.deliveryDate 
      : ticket.dueDate;
    const tabName = getMonthYearTabName(dateToUse, ticket.team);
    if (!grouped[tabName]) {
      grouped[tabName] = [];
    }
    grouped[tabName].push(ticket);
  });
  
  for (const tabName of Object.keys(grouped)) {
    if (!existingTabs.includes(tabName)) {
      await createSheetTab(accessToken, tabName);
    } else {
      // Clear existing data to prevent infinite duplication
      await clearValues(accessToken, `${tabName}!A1:Z`);
    }
    
    const rows = grouped[tabName].map(mapTicketToRow);
    await appendValues(accessToken, `${tabName}!A1`, [HEADERS, ...rows]);
  }
}
