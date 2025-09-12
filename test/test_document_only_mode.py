#!/usr/bin/env python3
"""
Test script for AURA Document-Only Mode
Tests the new document-exclusive functionality where AI only responds based on uploaded documents
"""

import sys
import os
import requests
import json
import time
from typing import Dict, List, Optional

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

class DocumentOnlyTester:
    def __init__(self, backend_url="http://localhost:8000"):
        """Initialize the document-only mode tester"""
        self.backend_url = backend_url
        self.user_id = "test_document_user"
        self.uploaded_documents = []
        
        print("=" * 60)
        print("AURA DOCUMENT-ONLY MODE TESTER")
        print("=" * 60)
        print("Testing the new document-exclusive functionality")
        print("-" * 60)
    
    def test_backend_connection(self):
        """Test if backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            data = response.json()
            
            print("Backend Status:")
            print(f"   Overall: {data.get('status', 'unknown')}")
            print(f"   Services: {data.get('services', {})}")
            
            return True
            
        except Exception as e:
            print("Backend not running!")
            print("   Start it with: cd backend && python -m uvicorn app.main:app --reload")
            return False
    
    def upload_test_document(self, filename: str, content: str) -> bool:
        """Upload a test document"""
        try:
            # Create a temporary file
            temp_file_path = f"/tmp/{filename}"
            with open(temp_file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Upload the file
            with open(temp_file_path, 'rb') as f:
                files = {'file': (filename, f, 'text/plain')}
                data = {'user_id': self.user_id}
                
                response = requests.post(
                    f"{self.backend_url}/documents/upload",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            # Clean up temp file
            os.remove(temp_file_path)
            
            if response.status_code == 200:
                result = response.json()
                self.uploaded_documents.append({
                    'filename': filename,
                    'id': result['document']['id'],
                    'content': content
                })
                print(f"✅ Uploaded: {filename}")
                return True
            else:
                print(f"❌ Upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False
    
    def chat_with_document_mode(self, message: str, document_only: bool = False) -> Dict:
        """Send a chat message with document-only mode"""
        try:
            payload = {
                "message": message,
                "user_id": self.user_id,
                "use_memory": False,
                "use_persona": False,
                "search_knowledge": True,
                "document_only_mode": document_only
            }
            
            response = requests.post(
                f"{self.backend_url}/chat/",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Chat failed: {response.status_code} - {response.text}")
                return {"error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Chat error: {e}")
            return {"error": str(e)}
    
    def run_comprehensive_tests(self):
        """Run comprehensive tests for document-only mode"""
        print("\n" + "=" * 60)
        print("COMPREHENSIVE DOCUMENT-ONLY MODE TESTS")
        print("=" * 60)
        
        # Test 1: Upload sample documents
        print("\n📚 Test 1: Uploading Sample Documents")
        print("-" * 40)
        
        test_documents = [
            {
                "filename": "company_policy.txt",
                "content": """
                Company Policy Document
                
                Section 1: Work Hours
                Employees are expected to work from 9 AM to 5 PM, Monday through Friday.
                Remote work is allowed on Tuesdays and Thursdays.
                
                Section 2: Vacation Policy
                Each employee gets 20 vacation days per year.
                Vacation requests must be submitted 2 weeks in advance.
                
                Section 3: Benefits
                Health insurance covers 80% of medical expenses.
                Dental and vision coverage is included.
                """
            },
            {
                "filename": "product_specs.txt",
                "content": """
                Product Specifications
                
                Product: AURA Voice AI Assistant
                Version: 4.0.0
                Features:
                - Voice conversation capabilities
                - Document knowledge base
                - Multi-tenant support
                - Real-time streaming
                
                Technical Requirements:
                - Python 3.11+
                - OpenAI API key
                - ElevenLabs API key
                - 4GB RAM minimum
                
                Supported File Types:
                - PDF documents
                - Word documents (.docx)
                - Text files (.txt)
                - Markdown files (.md)
                """
            },
            {
                "filename": "faq.txt",
                "content": """
                Frequently Asked Questions
                
                Q: How do I upload documents?
                A: Use the /documents/upload endpoint with a POST request.
                
                Q: What file types are supported?
                A: PDF, DOCX, TXT, and MD files are supported.
                
                Q: How does document-only mode work?
                A: When enabled, the AI only responds based on your uploaded documents.
                
                Q: What is the maximum file size?
                A: Files up to 10MB are supported.
                
                Q: How do I enable document-only mode?
                A: Set document_only_mode=true in your chat request.
                """
            }
        ]
        
        upload_success = True
        for doc in test_documents:
            if not self.upload_test_document(doc["filename"], doc["content"]):
                upload_success = False
        
        if not upload_success:
            print("❌ Document upload failed. Cannot continue tests.")
            return
        
        print(f"✅ Uploaded {len(self.uploaded_documents)} documents successfully")
        
        # Test 2: Regular mode (with external knowledge)
        print("\n💬 Test 2: Regular Chat Mode (External Knowledge Allowed)")
        print("-" * 40)
        
        regular_tests = [
            "What are the company work hours?",
            "How many vacation days do employees get?",
            "What is the capital of France?",  # External knowledge
            "Tell me about AURA Voice AI features"
        ]
        
        for question in regular_tests:
            print(f"\n❓ Question: {question}")
            result = self.chat_with_document_mode(question, document_only=False)
            
            if "error" not in result:
                print(f"✅ Response: {result['response'][:200]}...")
                print(f"   Sources: {result.get('sources', [])}")
                print(f"   Document Found: {result.get('document_found', False)}")
            else:
                print(f"❌ Error: {result['error']}")
            
            time.sleep(1)  # Rate limiting
        
        # Test 3: Document-only mode
        print("\n📋 Test 3: Document-Only Mode (No External Knowledge)")
        print("-" * 40)
        
        document_only_tests = [
            "What are the company work hours?",
            "How many vacation days do employees get?", 
            "What is the capital of France?",  # Should be rejected
            "Tell me about AURA Voice AI features",
            "What file types are supported for upload?",
            "How do I enable document-only mode?",
            "What is quantum computing?"  # Should be rejected
        ]
        
        for question in document_only_tests:
            print(f"\n❓ Question: {question}")
            result = self.chat_with_document_mode(question, document_only=True)
            
            if "error" not in result:
                print(f"✅ Response: {result['response'][:200]}...")
                print(f"   Sources: {result.get('sources', [])}")
                print(f"   Document Only Mode: {result.get('document_only_mode', False)}")
                print(f"   Document Found: {result.get('document_found', False)}")
                
                # Check if external knowledge was rejected
                if "capital of France" in question or "quantum computing" in question:
                    if "don't have" in result['response'].lower() or "no relevant information" in result['response'].lower():
                        print("✅ Correctly rejected external knowledge question")
                    else:
                        print("⚠️  May have used external knowledge")
            else:
                print(f"❌ Error: {result['error']}")
            
            time.sleep(1)  # Rate limiting
        
        # Test 4: Edge cases
        print("\n🔍 Test 4: Edge Cases and Error Handling")
        print("-" * 40)
        
        edge_cases = [
            "",  # Empty message
            "   ",  # Whitespace only
            "a" * 1000,  # Very long message
            "What is 2+2?",  # Simple math (should work in regular mode, rejected in document-only)
        ]
        
        for question in edge_cases:
            print(f"\n❓ Edge Case: '{question[:50]}{'...' if len(question) > 50 else ''}'")
            
            # Test regular mode
            result_regular = self.chat_with_document_mode(question, document_only=False)
            print(f"   Regular Mode: {'✅' if 'error' not in result_regular else '❌'}")
            
            # Test document-only mode
            result_doc_only = self.chat_with_document_mode(question, document_only=True)
            print(f"   Doc-Only Mode: {'✅' if 'error' not in result_doc_only else '❌'}")
            
            time.sleep(1)
        
        # Test 5: Performance test
        print("\n⚡ Test 5: Performance Test")
        print("-" * 40)
        
        start_time = time.time()
        for i in range(5):
            result = self.chat_with_document_mode("What are the company work hours?", document_only=True)
            if "error" in result:
                print(f"❌ Request {i+1} failed")
            else:
                print(f"✅ Request {i+1} completed in {result.get('response_time', 0):.2f}s")
        
        total_time = time.time() - start_time
        print(f"📊 Total time for 5 requests: {total_time:.2f}s")
        print(f"📊 Average response time: {total_time/5:.2f}s")
        
        # Test 6: Document management
        print("\n🗂️  Test 6: Document Management")
        print("-" * 40)
        
        # List documents
        try:
            response = requests.get(f"{self.backend_url}/documents/list?user_id={self.user_id}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Found {data.get('count', 0)} documents")
                for doc in data.get('documents', []):
                    print(f"   - {doc.get('filename', 'Unknown')}")
            else:
                print(f"❌ Failed to list documents: {response.status_code}")
        except Exception as e:
            print(f"❌ Error listing documents: {e}")
        
        # Get document stats
        try:
            response = requests.get(f"{self.backend_url}/documents/stats?user_id={self.user_id}")
            if response.status_code == 200:
                data = response.json()
                stats = data.get('stats', {})
                print(f"📊 Document Stats:")
                print(f"   Total Documents: {stats.get('total_documents', 0)}")
                print(f"   Total Chunks: {stats.get('total_chunks', 0)}")
                print(f"   Total Tokens: {stats.get('total_tokens', 0)}")
                print(f"   Estimated Cost: ${stats.get('estimated_cost', 0):.4f}")
            else:
                print(f"❌ Failed to get stats: {response.status_code}")
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
        
        print("\n" + "=" * 60)
        print("DOCUMENT-ONLY MODE TESTS COMPLETED")
        print("=" * 60)
    
    def run_interactive_mode(self):
        """Run interactive testing mode"""
        print("\n" + "=" * 60)
        print("INTERACTIVE DOCUMENT-ONLY MODE TESTING")
        print("=" * 60)
        print("Upload documents and test document-only responses")
        print("Commands:")
        print("  'upload <filename>' - Upload a file")
        print("  'ask <question>' - Ask in regular mode")
        print("  'askdoc <question>' - Ask in document-only mode")
        print("  'list' - List uploaded documents")
        print("  'quit' - Exit")
        print("-" * 60)
        
        while True:
            try:
                user_input = input("\n> ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() == 'quit':
                    break
                
                if user_input.lower() == 'list':
                    try:
                        response = requests.get(f"{self.backend_url}/documents/list?user_id={self.user_id}")
                        if response.status_code == 200:
                            data = response.json()
                            print(f"📚 Documents ({data.get('count', 0)}):")
                            for doc in data.get('documents', []):
                                print(f"   - {doc.get('filename', 'Unknown')}")
                        else:
                            print(f"❌ Failed to list documents")
                    except Exception as e:
                        print(f"❌ Error: {e}")
                    continue
                
                if user_input.startswith('upload '):
                    filename = user_input[7:].strip()
                    if not filename:
                        print("❌ Please provide a filename")
                        continue
                    
                    content = input("Enter document content (or press Enter for sample): ").strip()
                    if not content:
                        content = f"Sample content for {filename}. This is a test document with some information about {filename}."
                    
                    self.upload_test_document(filename, content)
                    continue
                
                if user_input.startswith('ask '):
                    question = user_input[4:].strip()
                    if not question:
                        print("❌ Please provide a question")
                        continue
                    
                    print(f"💬 Regular Mode: {question}")
                    result = self.chat_with_document_mode(question, document_only=False)
                    
                    if "error" not in result:
                        print(f"✅ Response: {result['response']}")
                        print(f"   Sources: {result.get('sources', [])}")
                    else:
                        print(f"❌ Error: {result['error']}")
                    continue
                
                if user_input.startswith('askdoc '):
                    question = user_input[7:].strip()
                    if not question:
                        print("❌ Please provide a question")
                        continue
                    
                    print(f"📋 Document-Only Mode: {question}")
                    result = self.chat_with_document_mode(question, document_only=True)
                    
                    if "error" not in result:
                        print(f"✅ Response: {result['response']}")
                        print(f"   Sources: {result.get('sources', [])}")
                        print(f"   Document Found: {result.get('document_found', False)}")
                    else:
                        print(f"❌ Error: {result['error']}")
                    continue
                
                print("❌ Unknown command. Use 'upload <filename>', 'ask <question>', 'askdoc <question>', 'list', or 'quit'")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")


def main():
    """Main entry point"""
    print("\nAURA Document-Only Mode Tester")
    print("This tests the new document-exclusive functionality")
    print("-" * 50)
    
    tester = DocumentOnlyTester()
    
    if not tester.test_backend_connection():
        print("\nPlease start the backend first")
        return
    
    print("\nSelect test mode:")
    print("1. Comprehensive Tests (automated)")
    print("2. Interactive Mode (manual testing)")
    
    choice = input("\nChoice (1/2): ").strip()
    
    if choice == "1":
        tester.run_comprehensive_tests()
    elif choice == "2":
        tester.run_interactive_mode()
    else:
        print("Invalid choice, running comprehensive tests...")
        tester.run_comprehensive_tests()


if __name__ == "__main__":
    main()
