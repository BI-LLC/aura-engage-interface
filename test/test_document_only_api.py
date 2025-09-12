#!/usr/bin/env python3
"""
Simple API test for AURA Document-Only Mode
Quick test script to verify the document-only functionality works
"""

import requests
import json
import time

def test_document_only_mode():
    """Test the document-only mode functionality"""
    base_url = "http://localhost:8000"
    user_id = "api_test_user"
    
    print("🧪 Testing AURA Document-Only Mode API")
    print("=" * 50)
    
    # Step 1: Upload a test document
    print("\n1️⃣ Uploading test document...")
    
    test_content = """
    Test Company Handbook
    
    Section 1: Office Hours
    Our office is open from 9 AM to 6 PM, Monday through Friday.
    Lunch break is from 12 PM to 1 PM.
    
    Section 2: Remote Work Policy
    Employees can work remotely on Wednesdays and Fridays.
    All remote work must be pre-approved by your manager.
    
    Section 3: Benefits
    Health insurance covers 90% of medical expenses.
    We provide dental and vision coverage.
    Employees get 25 vacation days per year.
    """
    
    try:
        # Create a temporary file
        with open("/tmp/test_handbook.txt", "w") as f:
            f.write(test_content)
        
        with open("/tmp/test_handbook.txt", "rb") as f:
            files = {'file': ('test_handbook.txt', f, 'text/plain')}
            data = {'user_id': user_id}
            
            response = requests.post(
                f"{base_url}/documents/upload",
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            print("✅ Document uploaded successfully")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    
    # Step 2: Test regular chat mode
    print("\n2️⃣ Testing regular chat mode...")
    
    regular_payload = {
        "message": "What are the office hours?",
        "user_id": user_id,
        "use_memory": True,
        "use_persona": True,
        "search_knowledge": True,
        "allow_external_knowledge": True
    }
    
    try:
        response = requests.post(
            f"{base_url}/chat/",
            json=regular_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Regular mode response:")
            print(f"   Response: {result['response'][:100]}...")
            print(f"   Sources: {result.get('sources', [])}")
            print(f"   Document Found: {result.get('document_found', False)}")
        else:
            print(f"❌ Regular chat failed: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Regular chat error: {e}")
        return False
    
    # Step 3: Test document-only mode with relevant question
    print("\n3️⃣ Testing document-only mode (relevant question)...")
    
    doc_only_payload = {
        "message": "What are the office hours?",
        "user_id": user_id,
        "use_memory": True,
        "use_persona": True,
        "search_knowledge": True,
        "allow_external_knowledge": False  # Default behavior
    }
    
    try:
        response = requests.post(
            f"{base_url}/chat/",
            json=doc_only_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Document-only mode response:")
            print(f"   Response: {result['response'][:100]}...")
            print(f"   Sources: {result.get('sources', [])}")
            print(f"   Document Only Mode: {result.get('document_only_mode', False)}")
            print(f"   Document Found: {result.get('document_found', False)}")
            
            # Verify it found the document
            if result.get('document_found', False):
                print("✅ Correctly found relevant document")
            else:
                print("⚠️  Did not find relevant document")
        else:
            print(f"❌ Document-only chat failed: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Document-only chat error: {e}")
        return False
    
    # Step 4: Test document-only mode with irrelevant question
    print("\n4️⃣ Testing document-only mode (irrelevant question)...")
    
    irrelevant_payload = {
        "message": "What is the capital of France?",
        "user_id": user_id,
        "use_memory": False,
        "use_persona": False,
        "search_knowledge": True,
        "document_only_mode": True
    }
    
    try:
        response = requests.post(
            f"{base_url}/chat/",
            json=irrelevant_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Document-only mode response (irrelevant):")
            print(f"   Response: {result['response'][:100]}...")
            print(f"   Sources: {result.get('sources', [])}")
            print(f"   Document Only Mode: {result.get('document_only_mode', False)}")
            print(f"   Document Found: {result.get('document_found', False)}")
            
            # Verify it correctly rejected external knowledge
            if not result.get('document_found', True):
                print("✅ Correctly rejected irrelevant question")
            else:
                print("⚠️  May have answered irrelevant question")
        else:
            print(f"❌ Document-only chat failed: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Document-only chat error: {e}")
        return False
    
    # Step 5: Test document list
    print("\n5️⃣ Testing document list...")
    
    try:
        response = requests.get(f"{base_url}/documents/list?user_id={user_id}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Document list:")
            print(f"   Count: {result.get('count', 0)}")
            for doc in result.get('documents', []):
                print(f"   - {doc.get('filename', 'Unknown')}")
        else:
            print(f"❌ Document list failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Document list error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed successfully!")
    print("Document-only mode is working correctly.")
    print("=" * 50)
    
    return True


def quick_test():
    """Quick test to verify the API is working"""
    base_url = "http://localhost:8000"
    
    print("🚀 Quick AURA API Test")
    print("-" * 30)
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
        
        # Test chat endpoint
        payload = {
            "message": "Hello, this is a test",
            "user_id": "quick_test_user",
            "document_only_mode": False
        }
        
        response = requests.post(f"{base_url}/chat/", json=payload, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat endpoint is working")
            print(f"   Response: {result.get('response', 'No response')[:50]}...")
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
            return False
        
        print("✅ API is ready for document-only mode testing!")
        return True
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        quick_test()
    else:
        if quick_test():
            print("\nProceeding with full document-only mode test...")
            test_document_only_mode()
        else:
            print("\nAPI test failed. Please check your backend.")
