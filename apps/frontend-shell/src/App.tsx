import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy-load remote MFEs
const ViewerApp = lazy(() => import('viewer/App'));
const PipelineApp = lazy(() => import('pipeline/App'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <Suspense fallback={<div style={{ padding: 24 }}>Loading viewer...</div>}>
                <ViewerApp />
              </Suspense>
            }
          />
          <Route
            path="/pipelines/*"
            element={
              <Suspense fallback={<div style={{ padding: 24 }}>Loading pipelines...</div>}>
                <PipelineApp />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
