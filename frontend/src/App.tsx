// Top-level app component with navigation
import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { PersonalizationSettings } from './components/PersonalizationSettings';
import { VoiceCall } from './components/VoiceCall';
import { AdminDashboard } from './components/AdminDashboard';

function App() {
  const [currentView, setCurrentView] = React.useState('chat');

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface />;
      case 'settings':
        return <PersonalizationSettings />;
      case 'voice':
        return <VoiceCall />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <nav style={{
        padding: '1rem',
        backgroundColor: '#2563eb',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          AURA Voice AI
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setCurrentView('chat')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'chat' ? '#1d4ed8' : 'transparent',
              color: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Chat
          </button>
          <button
            onClick={() => setCurrentView('voice')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'voice' ? '#1d4ed8' : 'transparent',
              color: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Voice
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'settings' ? '#1d4ed8' : 'transparent',
              color: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Settings
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'admin' ? '#1d4ed8' : 'transparent',
              color: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Admin
          </button>
        </div>
      </nav>
      <main style={{ padding: '2rem' }}>
        {renderView()}
      </main>
    </div>
  );
}

export default App;