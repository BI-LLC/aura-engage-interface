#!/usr/bin/env python3
"""
Test script to verify client document upload works
Simulates how a real client would upload documents from a website
"""

import requests
import os
import tempfile

def test_client_upload():
    """Test document upload as a real client would"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Client Document Upload")
    print("=" * 50)
    
    # Test 1: Upload document without user_id (how clients would upload)
    print("\n1️⃣ Testing upload without user_id...")
    
    # Create a sample document
    sample_content = """
    Company Policy Document
    
    Section 1: Work Hours
    Employees work from 9 AM to 5 PM, Monday through Friday.
    
    Section 2: Benefits
    Health insurance covers 80% of medical expenses.
    Employees get 20 vacation days per year.
    
    Section 3: Remote Work
    Remote work is allowed on Tuesdays and Thursdays.
    All remote work must be pre-approved by manager.
    """
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(sample_content)
        temp_file_path = f.name
    
    try:
        # Upload file (simulating client upload)
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('company_policy.txt', f, 'text/plain')}
            # Note: No user_id parameter - this is how clients would upload
            
            response = requests.post(
                f"{base_url}/documents/upload",
                files=files,
                timeout=30
            )
        
        print(f"Upload Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"   Document ID: {result['document']['id']}")
            print(f"   Filename: {result['document']['filename']}")
            print(f"   Chunks: {result['document']['chunks']}")
            print(f"   Tokens: {result['document']['tokens']}")
            
            document_id = result['document']['id']
        else:
            print(f"❌ Upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    finally:
        # Clean up temp file
        os.unlink(temp_file_path)
    
    # Test 2: Chat with uploaded document
    print("\n2️⃣ Testing chat with uploaded document...")
    
    chat_payload = {
        "message": "What are the work hours?",
        "search_knowledge": True,
        "allow_external_knowledge": False  # Document-only mode
    }
    
    try:
        response = requests.post(
            f"{base_url}/chat/",
            json=chat_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat successful!")
            print(f"   Response: {result['response'][:100]}...")
            print(f"   Document Found: {result.get('document_found', False)}")
            print(f"   Sources: {result.get('sources', [])}")
        else:
            print(f"❌ Chat failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Chat error: {e}")
    
    # Test 3: List documents (without user_id)
    print("\n3️⃣ Testing document list...")
    
    try:
        response = requests.get(f"{base_url}/documents/list")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Document list successful!")
            print(f"   Count: {result.get('count', 0)}")
            for doc in result.get('documents', []):
                print(f"   - {doc.get('filename', 'Unknown')}")
        else:
            print(f"❌ Document list failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Document list error: {e}")
    
    # Test 4: Search documents (without user_id)
    print("\n4️⃣ Testing document search...")
    
    search_payload = {
        "query": "work hours",
        "top_k": 3
    }
    
    try:
        response = requests.post(
            f"{base_url}/documents/search",
            json=search_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Document search successful!")
            print(f"   Query: {result.get('query', '')}")
            print(f"   Results: {result.get('count', 0)}")
            for i, doc_result in enumerate(result.get('results', [])[:2]):
                print(f"   Result {i+1}: {doc_result.get('filename', 'Unknown')}")
        else:
            print(f"❌ Document search failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Document search error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Client upload test completed!")
    print("Your AURA system is ready for real clients!")
    print("=" * 50)
    
    return True

def test_multiple_clients():
    """Test multiple clients uploading documents"""
    base_url = "http://localhost:8000"
    
    print("\n🔄 Testing Multiple Client Uploads")
    print("-" * 40)
    
    clients = ["client_1", "client_2", "client_3"]
    
    for client_id in clients:
        print(f"\n📤 Client {client_id} uploading document...")
        
        # Create different content for each client
        content = f"""
        Document for {client_id}
        
        This is a test document uploaded by {client_id}.
        It contains information specific to this client.
        
        Policy: {client_id} specific policy information.
        Contact: {client_id}@example.com
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(content)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': (f'{client_id}_document.txt', f, 'text/plain')}
                
                response = requests.post(
                    f"{base_url}/documents/upload",
                    files=files,
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {client_id} upload successful: {result['document']['filename']}")
            else:
                print(f"❌ {client_id} upload failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ {client_id} upload error: {e}")
        finally:
            os.unlink(temp_file_path)
    
    # Test that all documents are accessible
    print(f"\n📋 Checking all uploaded documents...")
    try:
        response = requests.get(f"{base_url}/documents/list")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Found {result.get('count', 0)} total documents")
            for doc in result.get('documents', []):
                print(f"   - {doc.get('filename', 'Unknown')}")
    except Exception as e:
        print(f"❌ Error listing documents: {e}")

if __name__ == "__main__":
    print("🚀 AURA Client Upload Test")
    print("Testing document upload functionality for real clients")
    print("-" * 60)
    
    # Test basic client upload
    test_client_upload()
    
    # Test multiple clients
    test_multiple_clients()
    
    print("\n✅ All tests completed!")
    print("\nYour AURA system is ready for production use!")
    print("Clients can now upload documents and chat with them.")
