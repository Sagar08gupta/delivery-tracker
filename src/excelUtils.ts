import * as XLSX from 'xlsx';
import { Ticket } from './types';

/**
 * Returns a tab name based on Due Date and team, e.g., "jan_2026_Personality" or "jan_2026_Cog"
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
 * Exports a list of Tickets to a downloadable .xlsx file with tabs divided by month and year
 */
export function exportTicketsToExcel(tickets: Ticket[]) {
  const workbook = XLSX.utils.book_new();

  if (tickets.length === 0) {
    // If empty, export a single empty tab
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'No_Tickets');
  } else {
    // Group tickets by Month_Year of due date and team
    const grouped: { [key: string]: Ticket[] } = {};
    tickets.forEach(item => {
      // Use deliveryDate if completed, otherwise dueDate
      const dateToUse = (item.status === 'Delivered' && item.deliveryDate) ? item.deliveryDate : item.dueDate;
      const tabName = getMonthYearTabName(dateToUse, item.team);
      if (!grouped[tabName]) {
        grouped[tabName] = [];
      }
      grouped[tabName].push(item);
    });

    // Append a sheet for each group
    const sortedTabs = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    sortedTabs.forEach(tabName => {
      const groupData = grouped[tabName].map(item => ({
        'Ticket ID': item.ticketId,
        'Client Name': item.clientName,
        'Type of Deliverable': item.deliverableType,
        'Comments': item.comments || '',
        'Assigned To': item.assignedTo,
        'Reviewer Name': item.reviewerName,
        'Due Date': item.dueDate,
        'Status': item.status,
        'Region': item.region,
        'Team': item.team,
        'Delivery Date': item.deliveryDate || '',
        'Created At': item.createdAt || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(groupData);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 12 }, // Ticket ID
        { wch: 20 }, // Client Name
        { wch: 25 }, // Type of Deliverable
        { wch: 30 }, // Comments
        { wch: 18 }, // Assigned To
        { wch: 18 }, // Reviewer Name
        { wch: 14 }, // Due Date
        { wch: 15 }, // Status
        { wch: 12 }, // Region
        { wch: 15 }, // Team
        { wch: 15 }, // Delivery Date
        { wch: 20 }  // Created At
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
    });
  }

  // Trigger file download
  XLSX.writeFile(workbook, 'Personality_Tickets_Master_Sheet.xlsx');
}

/**
 * Parses an Excel file into a list of Tickets, supporting multi-tab Excel files
 */
export function parseExcelFile(file: File): Promise<Ticket[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const allParsedTickets: Ticket[] = [];

        // Loop through all tabs in the spreadsheet
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert worksheet to raw JSON objects
          const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

          rawRows.forEach((row, index) => {
            // Normalize column detection by finding keys that contain expected words
            const findVal = (keywords: string[], defaultVal: string): string => {
              const key = Object.keys(row).find(k => 
                keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
              );
              return key ? String(row[key]).trim() : defaultVal;
            };

            const ticketId = findVal(['id', 'ticketid', 'number'], `PSY-1000`);
            const clientName = findVal(['client', 'customer', 'company'], 'Unknown Client');
            const deliverableType = findVal(['type', 'deliverable', 'task', 'subject'], 'Deliverable');
            const comments = findVal(['comment', 'remark', 'note', 'desc'], '');
            const assignedTo = findVal(['assigned', 'poc', 'owner', 'person'], 'Unassigned');
            const reviewerName = findVal(['reviewer', 'review', 'audit'], 'Unassigned');
            const rawDueDate = findVal(['date', 'due', 'deadline'], new Date().toISOString().split('T')[0]);
            const rawStatus = findVal(['status', 'state', 'complete', 'delivery'], 'In Progress');
            const region = findVal(['region', 'country', 'place', 'zone'], 'India');
            const rawDeliveryDate = findVal(['delivery', 'delivered'], '');
            
            let team: 'Personality' | 'Cognitive' = 'Personality';
            const sheetLower = sheetName.toLowerCase();
            if (sheetLower.endsWith('_personality') || sheetLower.endsWith('_psy')) {
              team = 'Personality';
            } else if (sheetLower.endsWith('_cog')) {
              team = 'Cognitive';
            } else {
              const teamVal = findVal(['team', 'group', 'dept'], 'Personality');
              team = teamVal.toLowerCase().includes('cog') ? 'Cognitive' : 'Personality';
            }

            // Parse and format due date without timezone shifting
            let dueDate = rawDueDate;
            if (rawDueDate && typeof rawDueDate === 'string') {
              if (/^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)) {
                dueDate = rawDueDate;
              } else {
                const parsed = Date.parse(rawDueDate);
                if (!isNaN(parsed)) {
                  const d = new Date(parsed);
                  dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
              }
            }

            // Parse and format delivery date without timezone shifting
            let deliveryDate = rawDeliveryDate;
            if (rawDeliveryDate && typeof rawDeliveryDate === 'string') {
              if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeliveryDate)) {
                deliveryDate = rawDeliveryDate;
              } else {
                const parsed = Date.parse(rawDeliveryDate);
                if (!isNaN(parsed)) {
                  const d = new Date(parsed);
                  deliveryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
              }
            }

            // Format status
            let status: Ticket['status'] = 'In Progress';
            const lowerStatus = rawStatus.toLowerCase();
            if (lowerStatus.includes('completed') || lowerStatus.includes('complete') || lowerStatus.includes('delivered') || lowerStatus === 'yes' || lowerStatus === 'done' || lowerStatus === '1') {
              status = 'Delivered';
            } else if (lowerStatus.includes('approved')) {
              status = 'Review Approved';
            } else if (lowerStatus.includes('pending') || lowerStatus.includes('review')) {
              status = 'Review Pending';
            }

            allParsedTickets.push({
              id: `t-xlsx-${Date.now()}-${sheetIndex}-${index}`,
              ticketId: ticketId ? ticketId.trim() : `${team === 'Cognitive' ? 'COG' : 'PSY'}-${1000 + index}`,
              clientName,
              deliverableType,
              comments,
              assignedTo,
              reviewerName,
              dueDate,
              status,
              region,
              team: team === 'Cognitive' ? 'Cognitive' : 'Personality',
              deliveryDate: deliveryDate || undefined,
              createdAt: new Date().toISOString()
            });
          });
        });

        resolve(allParsedTickets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parses raw JSON rows from a sheet into Ticket objects
 */
export function parseSheetJsonRows(rawRows: any[], sheetName: string): Ticket[] {
  const allParsedTickets: Ticket[] = [];
  rawRows.forEach((row, index) => {
    // Only process rows that have at least some data
    const values = Object.values(row).filter(v => v !== null && v !== '');
    if (values.length === 0) return;

    const findVal = (keywords: string[], defaultVal: string): string => {
      const key = Object.keys(row).find(k => 
        keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
      );
      return key ? String(row[key]).trim() : defaultVal;
    };

    const ticketId = findVal(['id', 'ticketid', 'number'], '');
    
    // If we can't find standard headers, just use first few columns to map data so it isn't lost
    const cols = Object.keys(row);
    
    let clientName = findVal(['client', 'customer', 'company', 'name'], '');
    if (!clientName && cols.length > 0) clientName = String(row[cols[0]] || '').trim();
    if (!clientName) clientName = 'Unknown Client';

    let deliverableType = findVal(['type', 'deliverable', 'task', 'subject', 'category'], '');
    if (!deliverableType && cols.length > 1) deliverableType = String(row[cols[1]] || '').trim();
    if (!deliverableType) deliverableType = 'Deliverable';

    let comments = findVal(['comment', 'remark', 'note', 'desc'], '');
    if (!comments && cols.length > 2) comments = String(row[cols[2]] || '').trim();

    const assignedTo = findVal(['assigned', 'poc', 'owner', 'person'], 'Unassigned');
    const reviewerName = findVal(['reviewer', 'review', 'audit'], 'Unassigned');
    const rawDueDate = findVal(['date', 'due', 'deadline'], new Date().toISOString().split('T')[0]);
    const rawStatus = findVal(['status', 'state', 'complete', 'delivery'], 'In Progress');
    const region = findVal(['region', 'country', 'place', 'zone'], 'India');
    const rawDeliveryDate = findVal(['delivery', 'delivered'], '');
    
    let team: 'Personality' | 'Cognitive' = 'Personality';
    const sheetLower = sheetName.toLowerCase();
    if (sheetLower.endsWith('_personality') || sheetLower.endsWith('_psy')) {
      team = 'Personality';
    } else if (sheetLower.endsWith('_cog')) {
      team = 'Cognitive';
    } else {
      const teamVal = findVal(['team', 'group', 'dept'], 'Personality');
      team = teamVal.toLowerCase().includes('cog') ? 'Cognitive' : 'Personality';
    }

    let dueDate = rawDueDate;
    if (rawDueDate && typeof rawDueDate === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)) {
        dueDate = rawDueDate;
      } else {
        const parsed = Date.parse(rawDueDate);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
    }

    let deliveryDate = rawDeliveryDate;
    if (rawDeliveryDate && typeof rawDeliveryDate === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeliveryDate)) {
        deliveryDate = rawDeliveryDate;
      } else {
        const parsed = Date.parse(rawDeliveryDate);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          deliveryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
    }

    let status: Ticket['status'] = 'In Progress';
    const lowerStatus = rawStatus.toLowerCase();
    if (lowerStatus.includes('completed') || lowerStatus.includes('complete') || lowerStatus.includes('delivered') || lowerStatus === 'yes' || lowerStatus === 'done' || lowerStatus === '1') {
      status = 'Delivered';
    } else if (lowerStatus.includes('approved')) {
      status = 'Review Approved';
    } else if (lowerStatus.includes('pending') || lowerStatus.includes('review')) {
      status = 'Review Pending';
    }

    // Determine fallback ticket ID if blank
    const fallbackId = `${team === 'Cognitive' ? 'COG' : 'PSY'}-${1000 + index}`;

    allParsedTickets.push({
      id: `t-sync-${Date.now()}-${sheetName}-${index}`,
      ticketId: ticketId ? ticketId.trim() : fallbackId,
      clientName,
      deliverableType,
      comments,
      assignedTo,
      reviewerName,
      dueDate,
      status,
      region,
      team,
      deliveryDate: deliveryDate || undefined,
      createdAt: new Date().toISOString()
    });
  });

  return allParsedTickets;
}

/**
 * Extracts Google Sheet data securely using the CSV endpoint instead of JSONP script injection.
 */
export async function fetchGoogleSheetSecure(sheetId: string, tabName: string): Promise<any[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load tab ${tabName}. Make sure it is shared with 'Anyone with the link can view'.`);
  }
  
  const csvText = await response.text();
  // If the sheet doesn't exist, Google sometimes returns an HTML error page instead of CSV
  if (csvText.trim().startsWith('<html') || csvText.trim().startsWith('<!DOCTYPE html>')) {
    throw new Error(`Tab ${tabName} not found or not accessible.`);
  }

  const workbook = XLSX.read(csvText, { type: 'string', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
}

export function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Sync tickets from public Google Sheet tabs
 */
export async function syncFromGoogleSheet(sheetUrl: string, onProgress?: (msg: string) => void): Promise<Ticket[]> {
  const sheetId = extractGoogleSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL format. Please provide a valid sheet URL.');
  }

  onProgress?.('Extracting document metadata...');
  
  let activeTabs: string[] = [];
  try {
    const editUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const editRes = await fetch(editUrl);
    if (editRes.ok) {
      const htmlText = await editRes.text();
      const regex1 = /\\"name\\":\\"([^"]+)\\"/g;
      let match;
      while ((match = regex1.exec(htmlText)) !== null) {
        let name = match[1].replace(/\\u0026/g, '&');
        activeTabs.push(name);
      }
      
      const regex2 = /"name"\s*:\s*"([^"]+)"/g;
      while ((match = regex2.exec(htmlText)) !== null) {
        let name = match[1].replace(/\\u0026/g, '&');
        activeTabs.push(name);
      }
      
      // Deduplicate and filter out Google internal metadata names
      const googleInternalNames = new Set([
        'docs.security', 'Basics', 'Brochures & newsletters', 'Calendars & schedules',
        'Contracts, onboarding and other forms', 'Finance & accounting', 'Letters',
        'Reports & proposals', 'Trackers', 'Uncategorised', 'Uncategorized',
        'Education', 'Human Resources', 'Invoices', 'Personal', 'Project Management',
        'Sales & CRM', 'Task Management', 'Travel & Event Planning'
      ]);
      activeTabs = [...new Set(activeTabs)].filter(t => !googleInternalNames.has(t));
    }
  } catch (e) {
    console.warn('Could not fetch edit metadata, using smart scan...', e);
  }

  // If no real tabs found, try common default/user tab names
  if (activeTabs.length === 0) {
    activeTabs = ['Sheet1', 'Sheet 1', 'Deliverables', 'Tasks'];
    
    // Also try the month-year format tabs we generate
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const years = ['2025', '2026', '2027'];
    const teams = ['Personality', 'Cog'];
    years.forEach(year => {
      months.forEach(month => {
        teams.forEach(team => {
          activeTabs.push(`${month}_${year}_${team}`);
        });
      });
    });
  }

  onProgress?.(`Found ${activeTabs.length} sheets to check. Downloading tab data...`);

  const allSyncedTickets: Ticket[] = [];
  let syncErrors: string[] = [];

  // Fetch in parallel batches of 5 to not hit rate limits
  for (let i = 0; i < activeTabs.length; i += 5) {
    const batch = activeTabs.slice(i, i + 5);
    onProgress?.(`Syncing tabs: ${batch.join(', ')}...`);
    
    await Promise.all(batch.map(async (tabName) => {
      try {
        const rawRows = await fetchGoogleSheetSecure(sheetId, tabName);
        if (rawRows.length > 0) {
          const parsed = parseSheetJsonRows(rawRows, tabName);
          allSyncedTickets.push(...parsed);
        }
      } catch (err: any) {
        // Silently skip tabs that don't exist — this is expected for a blank sheet
        console.debug(`Tab "${tabName}" not found or empty:`, err.message);
        syncErrors.push(`[${tabName}]: ${err.message || 'Unknown error'}`);
      }
    }));
  }


  return allSyncedTickets;
}

