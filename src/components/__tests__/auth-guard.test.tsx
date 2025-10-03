// import { render, screen } from '@testing-library/react'
// import { useAuthStore } from '@/stores/auth'
// import { AuthGuard } from '@/components/auth-guard'

// // Mock the auth store
// jest.mock('@/stores/auth')
// const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

// describe('AuthGuard', () => {
//   const TestComponent = () => <div>Protected Content</div>

//   beforeEach(() => {
//     jest.clearAllMocks()
//   })

//   it('renders children when user is authenticated', () => {
//     mockUseAuthStore.mockReturnValue({
//       user: { id: '1', email: 'test@example.com' },
//       profile: { id: '1', tenant_id: 'tenant-1', first_name: 'Test', last_name: 'User' },
//       loading: false,
//       signIn: jest.fn(),
//       signOut: jest.fn(),
//       fetchProfile: jest.fn(),
//     })

//     render(
//       <AuthGuard>
//         <TestComponent />
//       </AuthGuard>
//     )

//     expect(screen.getByText('Protected Content')).toBeInTheDocument()
//   })

//   it('shows loading state when auth is loading', () => {
//     mockUseAuthStore.mockReturnValue({
//       user: null,
//       profile: null,
//       loading: true,
//       signIn: jest.fn(),
//       signOut: jest.fn(),
//       fetchProfile: jest.fn(),
//     })

//     render(
//       <AuthGuard>
//         <TestComponent />
//       </AuthGuard>
//     )

//     expect(screen.getByText('Loading...')).toBeInTheDocument()
//     expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
//   })

//   it('redirects when user is not authenticated', () => {
//     mockUseAuthStore.mockReturnValue({
//       user: null,
//       profile: null,
//       loading: false,
//       signIn: jest.fn(),
//       signOut: jest.fn(),
//       fetchProfile: jest.fn(),
//     })

//     render(
//       <AuthGuard>
//         <TestComponent />
//       </AuthGuard>
//     )

//     expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
//   })
// }
