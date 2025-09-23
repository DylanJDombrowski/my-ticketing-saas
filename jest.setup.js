import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
  useParams() {
    return {}
  },
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
  })),
}))

// Mock Supabase Server
jest.mock('@/lib/supabase-server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
  })),
}))

// Mock Zustand stores
jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(() => ({
    user: null,
    profile: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    fetchProfile: jest.fn(),
  })),
}))

jest.mock('@/stores/clients', () => ({
  useClientsStore: jest.fn(() => ({
    clients: [],
    loading: false,
    fetchClients: jest.fn(),
    createClient: jest.fn(),
    updateClient: jest.fn(),
    deleteClient: jest.fn(),
  })),
}))

jest.mock('@/stores/tickets', () => ({
  useTicketsStore: jest.fn(() => ({
    tickets: [],
    selectedTicket: null,
    loading: false,
    fetchTickets: jest.fn(),
    fetchTicket: jest.fn(),
    createTicket: jest.fn(),
    updateTicket: jest.fn(),
    updateTicketStatus: jest.fn(),
    deleteTicket: jest.fn(),
  })),
}))

jest.mock('@/stores/time-entries', () => ({
  useTimeEntriesStore: jest.fn(() => ({
    timeEntries: [],
    loading: false,
    fetchTimeEntries: jest.fn(),
    createTimeEntry: jest.fn(),
    updateTimeEntry: jest.fn(),
    deleteTimeEntry: jest.fn(),
  })),
}))

jest.mock('@/stores/invoices', () => ({
  useInvoicesStore: jest.fn(() => ({
    invoices: [],
    loading: false,
    fetchInvoices: jest.fn(),
    createInvoice: jest.fn(),
    updateInvoiceStatus: jest.fn(),
    deleteInvoice: jest.fn(),
  })),
}))

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  notify: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Silence console errors during tests
beforeEach(() => {
  jest.clearAllMocks()
})