// Voice conversation interface
import React, { useState, useEffect } from 'react';

export const VoiceCall = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startVoiceCall = () => {
    setIsConnected(true);
    // TODO: Connect to voice WebSocket
  };

  const stopVoiceCall = () => {
    setIsConnected(false);
    setIsRecording(false);
    // TODO: Close WebSocket connection
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Start/stop microphone recording
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '600' }}>
        Voice Conversation
      </h2>

      <div style={{
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        backgroundColor: isConnected ? '#10b981' : '#6b7280',
        margin: '0 auto 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '3rem',
        transition: 'all 0.3s ease'
      }}>
        {isRecording ? 'REC' : 'VOICE'}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontSize: '1.125rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: isConnected ? '#10b981' : '#6b7280'
        }}>
          {isConnected ? (isRecording ? 'Listening...' : 'Connected') : 'Not Connected'}
        </div>
        
        {transcript && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem',
            marginTop: '1rem',
            fontStyle: 'italic',
            color: '#4b5563'
          }}>
            "{transcript}"
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isConnected ? (
          <button
            onClick={startVoiceCall}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Start Voice Call
          </button>
        ) : (
          <>
            <button
              onClick={toggleRecording}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: isRecording ? '#ef4444' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button
              onClick={stopVoiceCall}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              End Call
            </button>
          </>
        )}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#fef3c7',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        Note: Voice functionality requires microphone permissions and WebSocket connection to backend.
      </div>
    </div>
  );
};
