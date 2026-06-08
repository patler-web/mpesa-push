// Format phone number to international format
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    }
    // If starts with 7 (without country code)
    else if (cleaned.startsWith('7')) {
        cleaned = '254' + cleaned;
    }
    
    return cleaned;
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const fullName = document.getElementById('fullName').value;
    let phoneNumber = document.getElementById('phoneNumber').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const amount = document.getElementById('amount').value;
    const email = document.getElementById('email').value;
    
    // Format phone number
    phoneNumber = formatPhoneNumber(phoneNumber);
    
    // Show loading state
    const payButton = document.getElementById('payButton');
    const buttonText = payButton.querySelector('span');
    const spinner = payButton.querySelector('.spinner');
    const statusDiv = document.getElementById('statusMessage');
    
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    payButton.disabled = true;
    
    // Clear previous status
    statusDiv.classList.add('hidden');
    statusDiv.className = 'status-message hidden';
    
    try {
        // Prepare payment data
        const paymentData = {
            name: fullName,
            phone: phoneNumber,
            invoice: invoiceNumber,
            amount: parseInt(amount),
            email: email,
            timestamp: new Date().toISOString()
        };
        
        // OPTION 1: Using a serverless backend (RECOMMENDED)
        // Replace with your actual backend URL
        const response = await fetch('https://your-backend-api.com/api/initiate-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Success - STK Push sent
            statusDiv.textContent = `✅ Payment prompt sent to ${phoneNumber}! Please check your phone and enter your M-Pesa PIN to complete the payment.`;
            statusDiv.className = 'status-message success';
            statusDiv.classList.remove('hidden');
            
            // Optionally save to local storage for record
            savePaymentRecord(paymentData, result.transactionId);
            
            // Clear form
            document.getElementById('paymentForm').reset();
        } else {
            throw new Error(result.message || 'Payment initiation failed');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        
        // OPTION 2: Fallback - Store payment request locally (for demo/testing)
        if (error.message.includes('Failed to fetch')) {
            // Show demo mode instructions
            statusDiv.innerHTML = `
                <strong>⚠️ Demo Mode</strong><br>
                In production, this would send an STK Push to ${phoneNumber}.<br>
                Payment request saved locally for: KES ${amount}<br>
                <small>Set up a backend to process real payments (see README)</small>
            `;
            statusDiv.className = 'status-message info';
            statusDiv.classList.remove('hidden');
            
            // Store in localStorage for demo
            savePaymentRecord({
                name: fullName,
                phone: phoneNumber,
                invoice: invoiceNumber,
                amount: amount,
                email: email,
                status: 'pending'
            });
        } else {
            statusDiv.textContent = `❌ Error: ${error.message}`;
            statusDiv.className = 'status-message error';
            statusDiv.classList.remove('hidden');
        }
    } finally {
        // Reset button state
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
        payButton.disabled = false;
    }
});

function savePaymentRecord(paymentData, transactionId = null) {
    let payments = JSON.parse(localStorage.getItem('mpesa_payments') || '[]');
    payments.unshift({
        ...paymentData,
        transactionId: transactionId || 'pending_' + Date.now(),
        date: new Date().toISOString()
    });
    // Keep only last 20 records
    payments = payments.slice(0, 20);
    localStorage.setItem('mpesa_payments', JSON.stringify(payments));
}
