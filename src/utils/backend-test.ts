// Quick backend connectivity test
export const testBackendConnection = async () => {
  console.log('🔍 Testing backend connection...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch('https://iaura.ai/health', {
      method: 'GET',
      mode: 'cors'
    });
    
    console.log('Health Response Status:', healthResponse.status);
    const healthData = await healthResponse.text();
    console.log('Health Response:', healthData);
    
    return {
      healthy: healthResponse.ok,
      status: healthResponse.status,
      response: healthData
    };
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return {
      healthy: false,
      error: error.message
    };
  }
};

// Test CORS
export const testCORS = async () => {
  console.log('🔍 Testing CORS...');
  
  try {
    const response = await fetch('https://iaura.ai/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    console.log('CORS Response:', response.status);
    console.log('CORS Headers:', Object.fromEntries(response.headers.entries()));
    
    return {
      corsEnabled: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    console.error('❌ CORS test failed:', error);
    return {
      corsEnabled: false,
      error: error.message
    };
  }
};