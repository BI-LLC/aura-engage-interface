# AURA Document-Only Mode Guide

## Overview

AURA's Document-Only Mode is a powerful feature that restricts AI responses to only use information from your uploaded documents. This ensures that the AI doesn't rely on external knowledge and provides answers based solely on your specific documents.

## Key Features

- **Document-Exclusive Responses**: AI only answers based on uploaded documents
- **Automatic Rejection**: Questions not covered in documents are politely declined
- **Enhanced Context**: More document chunks are used for better accuracy
- **Source Tracking**: Shows which documents were used for each response
- **Seamless Integration**: Works with existing document upload and chat systems

## How It Works

### Regular Mode vs Document-Only Mode

| Feature | Regular Mode | Document-Only Mode |
|---------|--------------|-------------------|
| External Knowledge | ✅ Allowed | ❌ Blocked |
| Document Knowledge | ✅ Used | ✅ Required |
| Memory Context | ✅ Used | ❌ Disabled |
| Persona | ✅ Applied | ❌ Disabled |
| Response Scope | Broad | Document-only |

### Architecture

```
User Question
     ↓
Document Search (Enhanced)
     ↓
Document Found? → No → Reject Response
     ↓ Yes
Enhanced Context Injection
     ↓
LLM Processing (Document-Only Prompt)
     ↓
Response with Source Tracking
```

## API Usage

### Chat Endpoint

```http
POST /chat/
Content-Type: application/json

{
  "message": "What are the company policies?",
  "user_id": "your_user_id",
  "document_only_mode": true,
  "search_knowledge": true,
  "use_memory": false,
  "use_persona": false
}
```

### Response Format

```json
{
  "response": "Based on your company handbook, the work hours are 9 AM to 5 PM...",
  "model_used": "gpt-4-turbo",
  "document_only_mode": true,
  "document_found": true,
  "sources": ["company_handbook.pdf", "policy_document.docx"],
  "cost": 0.0023,
  "response_time": 1.45
}
```

### Key Response Fields

- `document_only_mode`: Indicates if document-only mode was used
- `document_found`: Whether relevant documents were found
- `sources`: List of documents used for the response
- `response`: AI response based only on documents (if found)

## Implementation Details

### Code Changes Made

1. **Chat Router Updates** (`app/routers/chat.py`):
   - Added `document_only_mode` parameter to `ChatRequest`
   - Added early rejection for questions without relevant documents
   - Enhanced response tracking

2. **Document Processor Updates** (`app/services/document_processor.py`):
   - Enhanced context generation for document-only mode
   - Specialized prompts for document-only responses
   - Increased chunk limits for better context

3. **Frontend Updates** (`app/main.py`):
   - Added document-only mode toggle
   - Enhanced UI for testing the feature
   - Color-coded responses based on mode

### Document Processing Flow

```python
# Document-only mode processing
if request.document_only_mode:
    # Search for relevant documents
    search_results = await data_service.search_documents(
        request.message, user_id, limit=5  # Increased limit
    )
    
    if not search_results:
        # Reject if no relevant documents found
        return ChatResponse(
            response="No relevant information in uploaded documents...",
            document_only_mode=True,
            document_found=False
        )
    
    # Enhanced context injection
    knowledge_context = enhanced_context_for_document_only(search_results)
```

## Testing

### Test Files Created

1. **`test_document_only_mode.py`**: Comprehensive test suite
2. **`test_document_only_api.py`**: Quick API validation tests

### Running Tests

```bash
# Comprehensive tests
python test_document_only_mode.py

# Quick API tests
python test_document_only_api.py

# Quick validation
python test_document_only_api.py quick
```

### Test Scenarios

1. **Document Upload**: Upload sample documents
2. **Regular Mode**: Test normal chat with external knowledge
3. **Document-Only Mode**: Test restricted responses
4. **Edge Cases**: Empty messages, very long messages
5. **Performance**: Multiple concurrent requests
6. **Document Management**: List, stats, delete operations

## Usage Examples

### Example 1: Company Handbook

```python
# Upload company handbook
upload_document("handbook.pdf", content)

# Regular mode - can use external knowledge
ask_question("What are the office hours?")  # Uses handbook + external knowledge

# Document-only mode - only uses handbook
ask_question("What are the office hours?", document_only=True)  # Only handbook
ask_question("What is the capital of France?", document_only=True)  # Rejected
```

### Example 2: Technical Documentation

```python
# Upload API documentation
upload_document("api_docs.pdf", content)

# Document-only mode for API questions
ask_question("How do I authenticate?", document_only=True)  # Uses API docs
ask_question("What is machine learning?", document_only=True)  # Rejected
```

### Example 3: Research Papers

```python
# Upload research papers
upload_document("research_paper.pdf", content)

# Document-only mode for research questions
ask_question("What were the main findings?", document_only=True)  # Uses paper
ask_question("What is quantum physics?", document_only=True)  # Rejected
```

## Frontend Integration

### Web Interface

Visit `http://localhost:8000/test` to access the test interface with:

- Document upload area
- Document-only mode checkbox
- Two test buttons (regular and document-only)
- Real-time response display
- Source tracking

### JavaScript Integration

```javascript
// Enable document-only mode
const response = await fetch('/chat/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Your question here",
    user_id: "your_user_id",
    document_only_mode: true,
    search_knowledge: true,
    use_memory: false,
    use_persona: false
  })
});

const data = await response.json();
console.log('Document found:', data.document_found);
console.log('Sources:', data.sources);
```

## Best Practices

### When to Use Document-Only Mode

✅ **Good Use Cases:**
- Company policy questions
- Technical documentation queries
- Research paper analysis
- Legal document interpretation
- Product specification questions
- Training material queries

❌ **Avoid When:**
- General knowledge questions are needed
- Creative tasks requiring external context
- Real-time information is required
- Cross-domain knowledge is needed

### Document Preparation

1. **Upload Relevant Documents**: Ensure all necessary information is uploaded
2. **Clear Structure**: Well-formatted documents work better
3. **Sufficient Content**: Documents should contain comprehensive information
4. **Regular Updates**: Keep documents current and relevant

### Error Handling

```python
# Handle document-only mode responses
if data.document_only_mode and not data.document_found:
    print("No relevant documents found. Please upload relevant documents first.")
elif data.document_only_mode and data.document_found:
    print(f"Answer based on: {', '.join(data.sources)}")
```

## Performance Considerations

### Optimization Tips

1. **Document Chunking**: Smaller, focused chunks improve search accuracy
2. **Embedding Quality**: Use high-quality embeddings for better semantic search
3. **Cache Results**: Cache document search results for repeated queries
4. **Limit Context**: Balance context size with response quality

### Monitoring

- Track `document_found` rates
- Monitor response times for document-only queries
- Watch for rejected questions patterns
- Analyze source usage statistics

## Troubleshooting

### Common Issues

1. **No Documents Found**
   - Check document upload status
   - Verify document content is searchable
   - Ensure proper user_id association

2. **Poor Search Results**
   - Improve document quality
   - Check embedding generation
   - Adjust search parameters

3. **Slow Responses**
   - Optimize document chunking
   - Reduce context size
   - Check API rate limits

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check document search results
search_results = await data_service.search_documents(query, user_id)
print(f"Found {len(search_results)} relevant documents")
```

## Future Enhancements

### Planned Features

1. **Document Categories**: Organize documents by type/topic
2. **Confidence Scores**: Show how confident the AI is in its response
3. **Citation Links**: Direct links to specific document sections
4. **Multi-Document Synthesis**: Combine information from multiple documents
5. **Document Versioning**: Track document changes over time

### Integration Opportunities

1. **Knowledge Base Management**: Better document organization
2. **User Preferences**: Remember document-only mode preference
3. **Analytics Dashboard**: Track document usage patterns
4. **Automated Updates**: Sync with external document sources

## Conclusion

AURA's Document-Only Mode provides a powerful way to ensure AI responses are based solely on your specific documents. This feature is particularly valuable for:

- **Compliance**: Ensuring responses follow specific guidelines
- **Accuracy**: Avoiding hallucination from external knowledge
- **Privacy**: Keeping information within your document boundaries
- **Consistency**: Providing uniform responses based on your materials

The implementation is robust, well-tested, and ready for production use. The comprehensive test suite ensures reliability, and the enhanced frontend makes it easy to use and validate.
