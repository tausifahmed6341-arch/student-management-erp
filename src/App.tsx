import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabId } from './components/layout/Sidebar';
import { AIChatWidget } from './components/ai/AIChatWidget';

import { DashboardView } from './components/views/DashboardView';
import { OrganizationSetupView } from './components/views/OrganizationSetupView';
import { SyllabusView } from './components/views/SyllabusView';
import { TimetableView } from './components/views/TimetableView';
import { AttendanceView } from './components/views/AttendanceView';
import { FeesView } from './components/views/FeesView';
import { PerformanceView } from './components/views/PerformanceView';
import { BiometricsSimulatorView } from './components/views/BiometricsSimulatorView';
import { SystemTestsView } from './components/views/SystemTestsView';
import { LoginView } from './components/auth/LoginView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-base font-bold">Initializing ERP Nexus</h2>
          <p className="text-xs text-slate-500 mt-1">Preparing your secure academic workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'org_setup':
        return <OrganizationSetupView />;
      case 'syllabus':
        return <SyllabusView />;
      case 'timetable':
        return <TimetableView />;
      case 'attendance':
        return <AttendanceView />;
      case 'fees':
        return <FeesView />;
      case 'performance':
        return <PerformanceView />;
      case 'biometrics':
        return <BiometricsSimulatorView />;
      case 'system_tests':
        return <SystemTestsView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const mainMarginLeft = sidebarCollapsed ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-800 flex flex-col antialiased font-sans">
      <Navbar />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ${mainMarginLeft}`}>
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>{renderActiveView()}</ErrorBoundary>
          </div>
        </main>
      </div>

      <ToastContainer />
      <AIChatWidget />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainLayout />
      </SocketProvider>
    </AuthProvider>
  );
}
