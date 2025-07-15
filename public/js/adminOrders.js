document.addEventListener('DOMContentLoaded', function() {
    const statusFlow = ['Pending', 'Accepted', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    
    // Handle lock button clicks
    document.addEventListener('click', function(e) {
        const lockBtn = e.target.closest('.lock-btn');
        if (!lockBtn) return;
        
        const orderId = lockBtn.dataset.orderId;
        const statusContainer = lockBtn.closest('.status-container');
        const statusSelect = statusContainer.querySelector('.status-select');
        const selectedOption = statusSelect.options[statusSelect.selectedIndex];
        const selectedPosition = parseInt(selectedOption.dataset.position);
        const currentPosition = parseInt(lockBtn.dataset.currentPosition);
        const confirmationModal = statusContainer.querySelector('.confirmation-modal');
        const statusValueSpan = confirmationModal.querySelector('.status-value');
        
        // If trying to select a status that's before current position
        if (selectedPosition < currentPosition) {
            alert("You can't revert to a previous status!");
            statusSelect.value = statusFlow[currentPosition];
            return;
        }
        
        // If status hasn't changed
        if (selectedPosition === currentPosition) {
            return;
        }
        
        // Show confirmation modal
        statusValueSpan.textContent = selectedOption.text;
        confirmationModal.classList.add('active');
    });
    
    // Handle confirm button clicks
    document.addEventListener('click', function(e) {
        const confirmBtn = e.target.closest('.confirm');
        if (!confirmBtn) return;
        
        const confirmationModal = confirmBtn.closest('.confirmation-modal');
        const statusContainer = confirmationModal.closest('.status-container');
        const lockBtn = statusContainer.querySelector('.lock-btn');
        const statusSelect = statusContainer.querySelector('.status-select');
        const selectedOption = statusSelect.options[statusSelect.selectedIndex];
        const selectedPosition = parseInt(selectedOption.dataset.position);
        
        // Update the lock button
        lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
        lockBtn.classList.add('locked');
        lockBtn.dataset.currentPosition = selectedPosition;
        
        // Disable previous options
        Array.from(statusSelect.options).forEach(option => {
            const optionPosition = parseInt(option.dataset.position);
            option.disabled = optionPosition < selectedPosition;
        });
        
        // Submit the form
        statusContainer.querySelector('.status-form').submit();
        
        // Hide modal
        confirmationModal.classList.remove('active');
    });
    
    // Handle cancel button clicks
    document.addEventListener('click', function(e) {
        const cancelBtn = e.target.closest('.cancel');
        if (!cancelBtn) return;
        
        const confirmationModal = cancelBtn.closest('.confirmation-modal');
        confirmationModal.classList.remove('active');
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('confirmation-modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Handle status select changes
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('status-select')) {
            const statusSelect = e.target;
            const lockBtn = statusSelect.closest('.status-container').querySelector('.lock-btn');
            
            // Reset lock state when status changes (only if not already locked)
            if (!lockBtn.classList.contains('locked')) {
                lockBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
            }
        }
    });
});