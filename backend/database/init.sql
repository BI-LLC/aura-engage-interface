-- AURA Voice AI Database Schema
-- Phase 3: User preferences, documents, and persona data

-- Every table includes tenant_id
CREATE TABLE documents (
    doc_id VARCHAR(255),
    tenant_id VARCHAR(255),  -- CRITICAL: Links to tenant
    user_id VARCHAR(255),
    content TEXT,
    ...
    PRIMARY KEY (doc_id, tenant_id)
);

-- Separate schema per tenant (optional)
CREATE SCHEMA tenant_abc123;
CREATE SCHEMA tenant_xyz789;


-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    communication_style VARCHAR(50) DEFAULT 'conversational',
    response_pace VARCHAR(50) DEFAULT 'normal',
    expertise_areas TEXT[], -- Array of strings
    preferred_examples VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User personas table
CREATE TABLE IF NOT EXISTS user_personas (
    user_id VARCHAR(255) PRIMARY KEY,
    formality VARCHAR(50) DEFAULT 'balanced',
    detail_level VARCHAR(50) DEFAULT 'normal',
    example_style VARCHAR(50) DEFAULT 'mixed',
    questioning VARCHAR(50) DEFAULT 'direct',
    energy VARCHAR(50) DEFAULT 'moderate',
    confidence FLOAT DEFAULT 0.8,
    sessions_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table for knowledge base
CREATE TABLE IF NOT EXISTS documents (
    doc_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    doc_type VARCHAR(50),
    content_preview TEXT, -- First 1000 chars
    chunks_count INTEGER DEFAULT 0,
    metadata JSONB,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    INDEX idx_user_docs (user_id),
    INDEX idx_upload_time (upload_time)
);

-- Document chunks for retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id VARCHAR(255) REFERENCES documents(doc_id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536), -- For future semantic search
    INDEX idx_doc_chunks (doc_id)
);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    summary TEXT,
    key_topics TEXT[],
    message_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_conversations (user_id),
    INDEX idx_timestamp (timestamp)
);

-- A/B testing results for persona
CREATE TABLE IF NOT EXISTS ab_test_results (
    test_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    test_attribute VARCHAR(50),
    original_value VARCHAR(50),
    test_value VARCHAR(50),
    engagement_score FLOAT,
    selected BOOLEAN DEFAULT FALSE,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_tests (user_id)
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    api_name VARCHAR(50) NOT NULL, -- 'grok', 'openai', 'elevenlabs'
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    request_time FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_timestamp (timestamp),
    INDEX idx_user_usage (user_id)
);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_personas_updated_at 
    BEFORE UPDATE ON user_personas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_preferences_updated ON user_preferences(updated_at);
CREATE INDEX IF NOT EXISTS idx_personas_confidence ON user_personas(confidence);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON documents(user_id, doc_type);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aura;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aura;