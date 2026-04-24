import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import AlertDetail from './pages/AlertDetail';
import DetectionRules from './pages/DetectionRules';
import SystemHealth from './pages/SystemHealth';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alert/:id" element={<AlertDetail />} />
            <Route path="/rules" element={<DetectionRules />} />
            <Route path="/health" element={<SystemHealth />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
