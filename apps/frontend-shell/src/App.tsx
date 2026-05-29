import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const ViewerApp = lazy(() => import('viewer/App'));
const PipelineApp = lazy(() => import('pipeline/App'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
              <Suspense fallback={<div className="p-6 text-tg-text-muted dark:text-tg-text-muted-dark">Loading viewer...</div>}>
                <ViewerApp />
              </Suspense>
            }
          />
          <Route
            path="/pipelines/*"
            element={
              <Suspense fallback={<div className="p-6 text-tg-text-muted dark:text-tg-text-muted-dark">Loading pipelines...</div>}>
                <PipelineApp />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
