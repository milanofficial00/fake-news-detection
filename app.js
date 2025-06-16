document.addEventListener('DOMContentLoaded', function() {
    // Theme switcher
    const themeSwitcher = document.getElementById('theme-switcher');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set the initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeSwitcher.checked = currentTheme === 'dark';
    
    // Theme switcher event listener
    themeSwitcher.addEventListener('change', function() {
        const newTheme = this.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    // Ripple effect for buttons
    const buttons = document.querySelectorAll('.ripple-button');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = this.querySelector('.ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            // Reset animation
            ripple.classList.remove('ripple');
            void ripple.offsetWidth; // Trigger reflow
            ripple.classList.add('ripple');
        });
    });
    
    // Floating label effect
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        // Check if textarea has content on page load
        if (textarea.value.trim() !== '') {
            textarea.nextElementSibling.classList.add('active');
        }
        
        textarea.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.nextElementSibling.classList.add('active');
            } else {
                this.nextElementSibling.classList.remove('active');
            }
        });
    });
    
    // Form submission loading spinner
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            this.appendChild(spinner);
            spinner.style.display = 'block';
            
            // Disable submit button to prevent multiple submissions
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.querySelector('.button-text').textContent = 'Analyzing...';
            }
        });
    });
    
    // If we're on the result page, animate the confidence meter
    if (document.querySelector('.meter-circle')) {
        animateMeter();
    }
});

function animateMeter() {
    const meter = document.querySelector('.meter-circle');
    const confidenceValue = parseFloat(document.querySelector('.meter-value').textContent);
    const percentage = confidenceValue / 100;
    
    // Animate the meter
    let progress = 0;
    const interval = setInterval(() => {
        if (progress >= percentage) {
            clearInterval(interval);
            return;
        }
        progress += 0.01;
        meter.style.background = `conic-gradient(var(--primary-color) ${progress * 100}%, transparent 0%)`;
    }, 10);
}