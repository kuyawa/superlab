// SuperLab - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('superlab-theme', newTheme);
            if (themeIcon) {
                themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        });
    }

    // Navbar Toggle (Mobile)
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('active');
            navbarToggle.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navbarToggle.contains(e.target) && !navbarMenu.contains(e.target)) {
                navbarMenu.classList.remove('active');
                navbarToggle.classList.remove('active');
            }
        });

        // Close menu when clicking a link
        navbarMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navbarMenu.classList.remove('active');
                navbarToggle.classList.remove('active');
            });
        });
    }

    // Auto-dismiss alerts after 5 seconds
    document.querySelectorAll('.alert').forEach(function(alert) {
        setTimeout(function() {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(function() {
                alert.remove();
            }, 500);
        }, 5000);
    });

    // Modal helpers
    window.openModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    };

    window.closeModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    };

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Form validation
    document.querySelectorAll('form[data-validate]').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            let valid = true;
            form.querySelectorAll('[required]').forEach(function(field) {
                if (!field.value.trim()) {
                    field.classList.add('error');
                    valid = false;
                    const errorEl = field.parentElement.querySelector('.form-error');
                    if (errorEl) errorEl.textContent = 'Este campo es obligatorio';
                } else {
                    field.classList.remove('error');
                    const errorEl = field.parentElement.querySelector('.form-error');
                    if (errorEl) errorEl.textContent = '';
                }
            });
            if (!valid) e.preventDefault();
        });
    });

    // File input validation
    document.querySelectorAll('input[type="file"]').forEach(function(input) {
        input.addEventListener('change', function() {
            const files = this.files;
            const maxSize = 10 * 1024 * 1024; // 10 MB
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!allowedTypes.includes(file.type)) {
                    alert('Tipo de archivo no permitido. Solo se aceptan JPG, PNG, WEBP, GIF y PDF.');
                    this.value = '';
                    return;
                }
                if (file.size > maxSize) {
                    alert('El archivo excede el tamaño máximo de 10 MB.');
                    this.value = '';
                    return;
                }
            }
        });
    });
});
