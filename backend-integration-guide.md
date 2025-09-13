# Backend Integration Guide

## Required Python Backend Endpoint

Add this endpoint to your Digital Ocean Python backend to enable Supabase authentication integration:

### Endpoint: `/api/auth/exchange-token`

```python
# Add to your FastAPI backend (e.g., main.py or auth router)
from fastapi import HTTPException, Depends, Header
import requests
import jwt
from datetime import datetime, timedelta

@app.post("/api/auth/exchange-token")
async def exchange_supabase_token(
    supabase_token: str = Header(..., alias="authorization"),
    request_body: dict = None
):
    """
    Exchange Supabase JWT token for backend-specific JWT token
    """
    try:
        # Remove 'Bearer ' prefix if present
        if supabase_token.startswith('Bearer '):
            supabase_token = supabase_token[7:]
        
        # Verify Supabase token by calling Supabase auth API
        supabase_url = "https://rmqohckqlpkwtpzqimxk.supabase.co"
        headers = {"Authorization": f"Bearer {supabase_token}"}
        
        response = requests.get(f"{supabase_url}/auth/v1/user", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Supabase token")
        
        user_data = response.json()
        user_email = user_data.get('email')
        user_id = user_data.get('id')
        
        if not user_email:
            raise HTTPException(status_code=401, detail="No email found in token")
        
        # Map user to tenant (you'll need to implement this based on your logic)
        tenant_id = await get_tenant_for_user(user_email, user_id)
        if not tenant_id:
            raise HTTPException(status_code=403, detail="User not assigned to any tenant")
        
        # Generate backend JWT token using your existing auth service
        auth_service = TenantAuthService()
        backend_payload = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "role": "user",  # or get from your database
            "email": user_email,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        backend_token = jwt.encode(
            backend_payload, 
            auth_service.secret_key, 
            algorithm=auth_service.algorithm
        )
        
        return {
            "backend_token": backend_token,
            "user_id": user_id,
            "tenant_id": tenant_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

async def get_tenant_for_user(email: str, user_id: str) -> str:
    """
    Map Supabase user to tenant - implement based on your business logic
    Options:
    1. Query your tenant_users table by email
    2. Create new tenant for first-time users
    3. Use a default tenant for demo purposes
    """
    # Example implementation - replace with your logic:
    
    # Option 1: Query existing tenant mapping
    # result = await db.query("SELECT tenant_id FROM tenant_users WHERE email = ?", email)
    # if result:
    #     return result['tenant_id']
    
    # Option 2: Return demo tenant for testing
    return "demo_tenant_123"  # Replace with your logic
```

## Required Dependencies

Add these to your Python backend requirements:

```txt
requests>=2.31.0
PyJWT>=2.8.0
```

## Environment Variables

Make sure your backend has access to:
- `JWT_SECRET` - Same secret key used in your existing `TenantAuthService`
- Supabase project URL and keys (if needed for additional validation)

## Database Integration

To properly map Supabase users to your tenant system, you may want to:

1. Add a migration to create user mapping table:
```sql
CREATE TABLE IF NOT EXISTS supabase_user_mapping (
    supabase_user_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

2. Implement user onboarding flow when users first authenticate

## Testing

Once implemented, test the integration:
1. Login to your frontend with Supabase auth
2. Try connecting to AURA - it should now work with proper authentication
3. Check backend logs for successful token exchanges

## Security Notes

- Supabase tokens are validated by calling Supabase's auth API
- Backend tokens are signed with your existing secret key
- No sensitive data is stored client-side
- Token exchange happens server-to-server for security