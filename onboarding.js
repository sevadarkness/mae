// ========================================
// ONBOARDING SYSTEM - PREMIUM TUTORIAL
// ========================================

class OnboardingSystem {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                title: 'Bem-vindo ao WhatsHybrid! 🎉',
                description: 'Vamos fazer um tour rápido pelas principais funcionalidades da extensão.',
                icon: '👋',
                target: null
            },
            {
                title: '📨 Disparo de Mensagens',
                description: 'Envie mensagens em massa para múltiplos contatos. Cole os números, escreva a mensagem e inicie a campanha.',
                icon: '📨',
                target: '#whlViewPrincipal'
            },
            {
                title: '📥 Extrator de Contatos',
                description: 'Extraia contatos do WhatsApp Web: normais, arquivados e bloqueados.',
                icon: '📥',
                target: '#whlViewExtrator'
            },
            {
                title: '👥 Extrator de Grupos',
                description: 'Extraia membros de qualquer grupo do WhatsApp. Exporte para CSV ou Google Sheets.',
                icon: '👥',
                target: '#whlViewGroups'
            },
            {
                title: '🔄 Recover',
                description: 'Visualize mensagens apagadas ou editadas em tempo real.',
                icon: '🔄',
                target: '#whlViewRecover'
            },
            {
                title: '⚙️ Configurações',
                description: 'Ajuste delays, agende envios e gerencie rascunhos.',
                icon: '⚙️',
                target: '#whlViewConfig'
            },
            {
                title: 'Pronto para começar! 🚀',
                description: 'Você já conhece as principais funcionalidades. Clique no ícone da extensão no WhatsApp Web para começar a usar.',
                icon: '✅',
                target: null
            }
        ];
        
        this.overlay = null;
    }
    
    // Check if onboarding should be shown
    shouldShow() {
        const completed = localStorage.getItem('whl_onboarding_complete');
        return !completed;
    }
    
    // Start onboarding
    start() {
        if (!this.shouldShow()) {
            return;
        }
        
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(this.currentStep);
    }
    
    // Create overlay element
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'whl-onboarding-overlay';
        this.overlay.className = 'onboarding-overlay';
        document.body.appendChild(this.overlay);
    }
    
    // Show specific step
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            return;
        }
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        // Clear overlay
        this.overlay.innerHTML = '';
        
        // Create card
        const card = document.createElement('div');
        card.className = 'onboarding-card';
        
        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.className = 'onboarding-skip';
        skipBtn.textContent = 'Pular tutorial';
        skipBtn.onclick = () => this.complete();
        card.appendChild(skipBtn);
        
        // Icon
        const icon = document.createElement('div');
        icon.className = 'onboarding-icon';
        icon.textContent = step.icon;
        card.appendChild(icon);
        
        // Title
        const title = document.createElement('div');
        title.className = 'onboarding-title';
        title.textContent = step.title;
        card.appendChild(title);
        
        // Description
        const description = document.createElement('div');
        description.className = 'onboarding-description';
        description.textContent = step.description;
        card.appendChild(description);
        
        // Progress dots
        const dots = document.createElement('div');
        dots.className = 'onboarding-dots';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'onboarding-dot';
            if (i === stepIndex) {
                dot.classList.add('active');
            }
            dots.appendChild(dot);
        }
        card.appendChild(dots);
        
        // Buttons
        const buttons = document.createElement('div');
        buttons.className = 'onboarding-buttons';
        
        // Previous button (if not first step)
        if (stepIndex > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'onboarding-btn onboarding-btn-secondary';
            prevBtn.textContent = 'Anterior';
            prevBtn.onclick = () => this.showStep(stepIndex - 1);
            buttons.appendChild(prevBtn);
        }
        
        // Next/Finish button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'onboarding-btn onboarding-btn-primary';
        nextBtn.textContent = stepIndex === this.steps.length - 1 ? 'Começar!' : 'Próximo';
        nextBtn.onclick = () => {
            if (stepIndex === this.steps.length - 1) {
                this.complete();
            } else {
                this.showStep(stepIndex + 1);
            }
        };
        buttons.appendChild(nextBtn);
        
        card.appendChild(buttons);
        this.overlay.appendChild(card);
        
        // Highlight target element if exists
        this.highlightTarget(step.target);
    }
    
    // Highlight target element
    highlightTarget(selector) {
        // Remove previous highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
        
        if (selector) {
            const target = document.querySelector(selector);
            if (target) {
                target.classList.add('onboarding-highlight');
                
                // Scroll to target
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }
    
    // Complete onboarding
    complete() {
        localStorage.setItem('whl_onboarding_complete', 'true');
        
        // Remove highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
        
        // Remove overlay
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
            }, 300);
        }
        
        // Show success toast
        this.showToast('success', 'Tutorial concluído!', 'Você já pode começar a usar o WhatsHybrid.');
    }
    
    // Show toast notification
    showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
        toast.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'toast-content';
        
        const toastTitle = document.createElement('div');
        toastTitle.className = 'toast-title';
        toastTitle.textContent = title;
        content.appendChild(toastTitle);
        
        if (message) {
            const toastMessage = document.createElement('div');
            toastMessage.className = 'toast-message';
            toastMessage.textContent = message;
            content.appendChild(toastMessage);
        }
        
        toast.appendChild(content);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        };
        toast.appendChild(closeBtn);
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Reset onboarding (for testing)
    reset() {
        localStorage.removeItem('whl_onboarding_complete');
        console.log('Onboarding reset. Refresh to see it again.');
    }
}

// Initialize onboarding when DOM is ready
if (typeof window !== 'undefined') {
    window.OnboardingSystem = OnboardingSystem;
}
