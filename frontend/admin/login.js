// Admin Login Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const btnLogin = document.querySelector('.btn-login');

    // Check if already logged in
    if (localStorage.getItem('aura_token')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        if (!username || !password) {
            showError('Please fill in all fields');
            return;
        }

        // Show loading state
        setLoading(true);

        try {
            // Attempt login
            const response = await AuraAPI.login(username, password);
            
            if (response.success || response.token) {
                // Success - redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Set loading state
    function setLoading(loading) {
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            btnLogin.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            btnLogin.disabled = false;
        }
    }

    // Add some nice animations
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
});
