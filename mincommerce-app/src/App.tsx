import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import FlashSalePage from './pages/FlashSalePage'
import { useAuthStore } from './store/authStore'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'user' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/flash-sale'} replace />
  }

  return <>{children}</>
}

// Home Route Component - redirects based on user role
const HomeRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Redirect authenticated users to their appropriate dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  } else {
    return <Navigate to="/flash-sale" replace />
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <Routes>
              {/* Home Route - handles redirects based on authentication */}
              <Route path="/" element={<HomeRoute />} />
              
              {/* Protected Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/flash-sale" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <FlashSalePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App