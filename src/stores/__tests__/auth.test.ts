import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth'
import { createBrowserClient } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase')
const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('Auth Store', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateBrowserClient.mockReturnValue(mockSupabase as any)

    // Reset Zustand store state
    useAuthStore.setState({
      user: null,
      profile: null,
      loading: false,
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches profile successfully', async () => {
    const mockProfile = {
      id: 'user-1',
      tenant_id: 'tenant-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    }

    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockProfile,
      error: null,
    })

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.fetchProfile('user-1')
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
  })

  it('handles profile fetch error', async () => {
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: null,
      error: { message: 'Profile not found' },
    })

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.fetchProfile('user-1')
    })

    expect(result.current.profile).toBeNull()
  })

  it('signs out successfully', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuthStore())

    // Set initial state
    act(() => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'john@example.com' },
        profile: { id: 'user-1', tenant_id: 'tenant-1' },
      })
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})