import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LayoutProvider, useLayout } from "./contexts/LayoutContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Planning from "./pages/Planning";
import Approval from "./pages/Approval";
import POGenerator from "./pages/POGenerator";
import POHistory from "./pages/POHistory";
import Payment from "./pages/Payment";

import Received from "./pages/Received";
import { ProtectedRoute } from "./components/ProtectedRoute";
import PaymentHistory from "./pages/PaymentHistory";
import Report from "./pages/Report"

// Layout wrapper component that uses the layout context
const LayoutWrapper = () => {
  const { hideSidebar, hideHeader, hideFooter } = useLayout();

  return (
    <Layout
      hideSidebar={hideSidebar}
      hideHeader={hideHeader}
      hideFooter={hideFooter}
    />
  );
};

function App() {
  return (

    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<LayoutWrapper />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <Planning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approval"
            element={
              <ProtectedRoute>
                <Approval />
              </ProtectedRoute>
            }
          />
          <Route
            path="/po-generator"
            element={
              <ProtectedRoute>
                <POGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/po-history"
            element={
              <ProtectedRoute>
                <POHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history"
            element={
              <ProtectedRoute>
                <PaymentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/received"
            element={
              <ProtectedRoute>
                <Received />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Catch all route - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>

  );
}

export default App;
