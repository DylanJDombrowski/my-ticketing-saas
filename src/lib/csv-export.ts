export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function generateCSV(data: any[], columns: CSVColumn[]): string {
  // Create header row
  const headers = columns.map(col => escapeCSVField(col.label));

  // Create data rows
  const rows = data.map(item =>
    columns.map(col => {
      let value = item[col.key];

      // Apply custom formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value);
      }

      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }

      return escapeCSVField(String(value));
    })
  );

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return csvContent;
}

function escapeCSVField(field: string): string {
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function downloadCSV(csvContent: string, filename: string): void {
  // Create a Blob with CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }
}

// Predefined formatters for common data types
export const formatters = {
  currency: (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  date: (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  },

  datetime: (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US');
  },

  hours: (hours: number) => {
    return hours.toFixed(2);
  },

  boolean: (value: boolean) => {
    return value ? 'Yes' : 'No';
  },

  percentage: (value: number) => {
    return `${value.toFixed(1)}%`;
  }
};

// Helper function to export time entries
export function exportTimeEntries(timeEntries: any[], filename?: string) {
  const columns: CSVColumn[] = [
    { key: 'entry_date', label: 'Date', format: formatters.date },
    { key: 'ticket_title', label: 'Ticket' },
    { key: 'client_name', label: 'Client' },
    { key: 'description', label: 'Description' },
    { key: 'hours', label: 'Hours', format: formatters.hours },
    { key: 'is_billable', label: 'Billable', format: formatters.boolean },
    { key: 'user_name', label: 'User' },
    { key: 'created_at', label: 'Created', format: formatters.datetime }
  ];

  const csvContent = generateCSV(timeEntries, columns);
  const exportFilename = filename || `time-entries-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csvContent, exportFilename);
}

// Helper function to export reports data
export function exportReports(reportData: any, filename?: string) {
  const data = [
    { metric: 'Total Revenue', value: formatters.currency(reportData.totalRevenue || 0) },
    { metric: 'Monthly Revenue', value: formatters.currency(reportData.monthlyRevenue || 0) },
    { metric: 'Billable Hours', value: formatters.hours(reportData.billableHours || 0) },
    { metric: 'Active Clients', value: reportData.activeClients || 0 },
    { metric: 'New Clients This Period', value: reportData.newClientsThisMonth || 0 },
    { metric: 'Resolved Tickets', value: reportData.resolvedTickets || 0 },
    { metric: 'Previous Period Revenue', value: formatters.currency(reportData.previousMonthRevenue || 0) }
  ];

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' }
  ];

  const csvContent = generateCSV(data, columns);
  const exportFilename = filename || `reports-summary-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csvContent, exportFilename);
}

// Helper function to export client activity data
export function exportClientActivity(clientData: any[], filename?: string) {
  const columns: CSVColumn[] = [
    { key: 'clientName', label: 'Client Name' },
    { key: 'totalHours', label: 'Total Hours', format: formatters.hours },
    { key: 'totalRevenue', label: 'Total Revenue', format: formatters.currency },
    { key: 'ticketCount', label: 'Ticket Count' },
    { key: 'lastActivity', label: 'Last Activity', format: formatters.date }
  ];

  const csvContent = generateCSV(clientData, columns);
  const exportFilename = filename || `client-activity-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csvContent, exportFilename);
}

// Helper function to export team time tracking data
export function exportTeamTimeTracking(timeTrackingData: any[], filename?: string) {
  const columns: CSVColumn[] = [
    { key: 'userName', label: 'Team Member' },
    { key: 'totalHours', label: 'Total Hours', format: formatters.hours },
    { key: 'billableHours', label: 'Billable Hours', format: formatters.hours },
    { key: 'nonBillableHours', label: 'Non-Billable Hours', format: formatters.hours },
    { key: 'ticketCount', label: 'Tickets Worked' },
    {
      key: 'billablePercentage',
      label: 'Billable %',
      format: (value: number) => formatters.percentage(value)
    }
  ];

  // Add calculated billable percentage
  const enrichedData = timeTrackingData.map(user => ({
    ...user,
    billablePercentage: user.totalHours > 0 ? (user.billableHours / user.totalHours) * 100 : 0
  }));

  const csvContent = generateCSV(enrichedData, columns);
  const exportFilename = filename || `team-time-tracking-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csvContent, exportFilename);
}