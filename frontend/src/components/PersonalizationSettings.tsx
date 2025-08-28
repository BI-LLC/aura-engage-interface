// User settings and document upload interface
// Where users customize their AI and manage their files

import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface PersonaSettings {
  formality: 'casual' | 'balanced' | 'professional';
  detail_level: 'brief' | 'normal' | 'detailed';
  example_style: 'abstract' | 'concrete' | 'mixed';
  energy: 'calm' | 'moderate' | 'enthusiastic';
}

interface Document {
  doc_id: string;
  filename: string;
  doc_type: string;
  upload_time: string;
  size: number;
  chunks: number;
}

export const PersonalizationSettings = () => {
  // Keep track of user preferences and uploaded files
  const [persona, setPersona] = useState<PersonaSettings>({
    formality: 'balanced',
    detail_level: 'normal',
    example_style: 'mixed',
    energy: 'moderate'
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'persona' | 'knowledge'>('persona');
  const userId = localStorage.getItem('userId') || 'default_user';
  
  // Get user's current settings when page loads
  useEffect(() => {
    loadPersona();
    loadDocuments();
  }, []);
  
  // Fetch how the user likes their AI to behave
  const loadPersona = async () => {
    try {
      const response = await api.getPersona(userId);
      if (response.persona) {
        setPersona(response.persona);
      }
    } catch (error) {
      console.error('Failed to load persona:', error);
    }
  };
  
  // Get list of files user has uploaded
  const loadDocuments = async () => {
    try {
      const response = await api.getUserDocuments(userId);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };
  
  // File upload handler
  const onDrop = async (acceptedFiles: File[]) => {
    setLoading(true);
    
    for (const file of acceptedFiles) {
      try {
        const response = await api.uploadDocument(file, userId);
        
        if (response.success) {
          toast.success(`Uploaded ${file.name}`);
          await loadDocuments();
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        toast.error(`Error uploading ${file.name}`);
        console.error(error);
      }
    }
    
    setLoading(false);
  };
  
  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });
  
  // Update persona settings
  const updatePersona = async (field: keyof PersonaSettings, value: string) => {
    const newPersona = { ...persona, [field]: value };
    setPersona(newPersona);
    
    try {
      await api.updatePersona(userId, newPersona);
      toast.success('Persona updated');
    } catch (error) {
      toast.error('Failed to update persona');
      console.error(error);
    }
  };
  
  // Delete document
  const deleteDocument = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    
    try {
      await api.deleteDocument(docId, userId);
      toast.success('Document deleted');
      await loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
      console.error(error);
    }
  };

  // Utility function to format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  return React.createElement('div', {
    style: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
  }, [
    React.createElement('h2', { key: 'title' }, 'Personalization Settings'),
    
    // Tab Navigation
    React.createElement('div', {
      key: 'tabs',
      style: {
        display: 'flex',
        gap: '10px',
        margin: '20px 0',
        borderBottom: '2px solid #e0e0e0'
      }
    }, [
      React.createElement('button', {
        key: 'persona-tab',
        style: {
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          color: activeTab === 'persona' ? '#667eea' : '#666',
          borderBottom: activeTab === 'persona' ? '3px solid #667eea' : 'none'
        },
        onClick: () => setActiveTab('persona')
      }, '🎭 Persona'),
      
      React.createElement('button', {
        key: 'knowledge-tab',
        style: {
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          color: activeTab === 'knowledge' ? '#667eea' : '#666',
          borderBottom: activeTab === 'knowledge' ? '3px solid #667eea' : 'none'
        },
        onClick: () => setActiveTab('knowledge')
      }, '📚 Knowledge Base')
    ]),
    
    // Persona Tab Content
    activeTab === 'persona' && React.createElement('div', {
      key: 'persona-content',
      style: { margin: '20px 0' }
    }, [
      React.createElement('h3', { key: 'persona-title' }, 'Communication Style'),
      
      React.createElement('div', {
        key: 'formality',
        style: { margin: '20px 0' }
      }, [
        React.createElement('label', {
          key: 'formality-label',
          style: { display: 'block', marginBottom: '8px', fontWeight: '600' }
        }, 'Formality Level'),
        React.createElement('select', {
          key: 'formality-select',
          value: persona.formality,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => updatePersona('formality', e.target.value),
          style: {
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px'
          }
        }, [
          React.createElement('option', { key: 'casual', value: 'casual' }, 'Casual - Friendly and relaxed'),
          React.createElement('option', { key: 'balanced', value: 'balanced' }, 'Balanced - Professional yet approachable'),
          React.createElement('option', { key: 'professional', value: 'professional' }, 'Professional - Formal and precise')
        ])
      ]),
      
      React.createElement('div', {
        key: 'preview',
        style: {
          marginTop: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }
      }, [
        React.createElement('h4', { key: 'preview-title' }, 'Preview'),
        React.createElement('p', { key: 'preview-text' }, 
          `AURA will communicate in a ${persona.formality} manner, providing ${persona.detail_level} responses with ${persona.example_style} examples, delivered with ${persona.energy} energy.`
        )
      ])
    ]),
    
    // Knowledge Base Tab Content
    activeTab === 'knowledge' && React.createElement('div', {
      key: 'knowledge-content',
      style: { margin: '20px 0' }
    }, [
      React.createElement('h3', { key: 'knowledge-title' }, 'Your Knowledge Base'),
      
      // File Upload Area
      React.createElement('div', {
        key: 'dropzone',
        ...getRootProps(),
        style: {
          border: '2px dashed #667eea',
          borderRadius: '10px',
          padding: '40px',
          textAlign: 'center' as const,
          cursor: 'pointer',
          background: isDragActive ? 'rgba(102, 126, 234, 0.1)' : '#f8f9fa',
          margin: '20px 0'
        }
      }, [
        React.createElement('input', { key: 'file-input', ...getInputProps() }),
        loading ? 
          React.createElement('p', { key: 'loading' }, 'Uploading...') :
          isDragActive ?
            React.createElement('p', { key: 'drop-active' }, 'Drop files here...') :
            React.createElement('div', { key: 'drop-inactive' }, [
              React.createElement('p', { key: 'drop-text' }, '📁 Drag & drop files here, or click to browse'),
              React.createElement('small', { key: 'drop-help' }, 'Supported: PDF, TXT, MD, JSON (Max 10MB)')
            ])
      ]),
      
      // Document List
      React.createElement('div', {
        key: 'document-list',
        style: { margin: '20px 0' }
      }, documents.length === 0 ? 
        React.createElement('p', {
          key: 'empty-state',
          style: { textAlign: 'center' as const, color: '#999', padding: '40px' }
        }, 'No documents uploaded yet') :
        documents.map((doc) => 
          React.createElement('div', {
            key: doc.doc_id,
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px',
              margin: '10px 0',
              background: '#f8f9fa',
              borderRadius: '8px'
            }
          }, [
            React.createElement('div', {
              key: 'doc-info',
              style: { display: 'flex', flexDirection: 'column' as const }
            }, [
              React.createElement('span', {
                key: 'doc-name',
                style: { fontWeight: '600', color: '#333' }
              }, `📄 ${doc.filename}`),
              React.createElement('span', {
                key: 'doc-meta',
                style: { fontSize: '12px', color: '#666', marginTop: '4px' }
              }, `${doc.chunks} chunks • ${formatBytes(doc.size)} • ${new Date(doc.upload_time).toLocaleDateString()}`)
            ]),
            React.createElement('button', {
              key: 'delete-btn',
              style: {
                background: '#ff4757',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer'
              },
              onClick: () => deleteDocument(doc.doc_id)
            }, '🗑️')
          ])
        )
      ),
      
      // Stats
      React.createElement('div', {
        key: 'stats',
        style: {
          marginTop: '20px',
          padding: '15px',
          background: '#e8f5e9',
          borderRadius: '8px'
        }
      }, [
        React.createElement('p', { key: 'doc-count' }, `Total Documents: ${documents.length}`),
        React.createElement('p', { key: 'total-size' }, `Total Size: ${formatBytes(documents.reduce((sum, doc) => sum + doc.size, 0))}`)
      ])
    ])
  ]);
};