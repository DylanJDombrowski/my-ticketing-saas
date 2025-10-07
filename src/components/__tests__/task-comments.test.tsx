// import { render, screen, fireEvent, waitFor } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
// import { TicketComments } from '@/components/ticket-comments'
// import { useAuthStore } from '@/stores/auth'
// import { createBrowserClient } from '@/lib/supabase'

// // Mock dependencies
// jest.mock('@/stores/auth')
// jest.mock('@/lib/supabase')

// const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
// const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

// describe('TicketComments', () => {
//   const mockProps = {
//     ticketId: 'ticket-1',
//     tenantId: 'tenant-1',
//   }

//   const mockProfile = {
//     id: 'user-1',
//     tenant_id: 'tenant-1',
//     first_name: 'John',
//     last_name: 'Doe',
//     email: 'john@example.com',
//   }

//   const mockComments = [
//     {
//       id: 'comment-1',
//       content: 'This is a test comment',
//       created_at: '2024-01-01T10:00:00Z',
//       updated_at: '2024-01-01T10:00:00Z',
//       created_by: 'user-1',
//       created_user: {
//         id: 'user-1',
//         first_name: 'John',
//         last_name: 'Doe',
//         email: 'john@example.com',
//       },
//     },
//   ]

//   const mockSupabase = {
//     from: jest.fn(() => ({
//       select: jest.fn().mockReturnThis(),
//       insert: jest.fn().mockReturnThis(),
//       update: jest.fn().mockReturnThis(),
//       delete: jest.fn().mockReturnThis(),
//       eq: jest.fn().mockReturnThis(),
//       order: jest.fn().mockReturnThis(),
//       single: jest.fn(),
//     })),
//   }

//   beforeEach(() => {
//     jest.clearAllMocks()

//     mockUseAuthStore.mockReturnValue({
//       user: { id: 'user-1', email: 'john@example.com' },
//       profile: mockProfile,
//       loading: false,
//       signIn: jest.fn(),
//       signOut: jest.fn(),
//       fetchProfile: jest.fn(),
//     })

//     mockCreateBrowserClient.mockReturnValue(mockSupabase as any)
//   })

//   it('renders loading state initially', () => {
//     mockSupabase.from().select().eq().eq().order.mockResolvedValue({
//       data: [],
//       error: null,
//     })

//     render(<TicketComments {...mockProps} />)

//     expect(screen.getByText('Comments')).toBeInTheDocument()
//   })

//   it('renders comments when loaded', async () => {
//     mockSupabase.from().select().eq().eq().order.mockResolvedValue({
//       data: mockComments,
//       error: null,
//     })

//     render(<TicketComments {...mockProps} />)

//     await waitFor(() => {
//       expect(screen.getByText('This is a test comment')).toBeInTheDocument()
//       expect(screen.getByText('John Doe')).toBeInTheDocument()
//     })
//   })

//   it('allows adding a new comment', async () => {
//     const user = userEvent.setup()

//     mockSupabase.from().select().eq().eq().order.mockResolvedValue({
//       data: [],
//       error: null,
//     })

//     mockSupabase.from().insert().select().single.mockResolvedValue({
//       data: {
//         id: 'new-comment',
//         content: 'New test comment',
//         created_at: '2024-01-01T11:00:00Z',
//         updated_at: '2024-01-01T11:00:00Z',
//         created_by: 'user-1',
//         created_user: mockProfile,
//       },
//       error: null,
//     })

//     render(<TicketComments {...mockProps} />)

//     const textarea = screen.getByPlaceholderText('Add a comment...')
//     const submitButton = screen.getByText('Post Comment')

//     await user.type(textarea, 'New test comment')
//     await user.click(submitButton)

//     await waitFor(() => {
//       expect(mockSupabase.from().insert).toHaveBeenCalledWith({
//         ticket_id: 'ticket-1',
//         tenant_id: 'tenant-1',
//         content: 'New test comment',
//         created_by: 'user-1',
//       })
//     })
//   })

//   it('shows empty state when no comments', async () => {
//     mockSupabase.from().select().eq().eq().order.mockResolvedValue({
//       data: [],
//       error: null,
//     })

//     render(<TicketComments {...mockProps} />)

//     await waitFor(() => {
//       expect(screen.getByText('No comments yet')).toBeInTheDocument()
//       expect(screen.getByText('Be the first to add a comment to this ticket.')).toBeInTheDocument()
//     })
//   })
// }
