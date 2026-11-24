/**
 * Gyroscopic 3D Tilt & Specular Glare Engine
 * 60fps / 120fps hardware-accelerated transforms
 */
(function() {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const cards = document.querySelectorAll('[data-tilt]');

    cards.forEach((card) => {
        // Inject dynamic specular glare element if absent
        let glare = card.querySelector('.tilt-glare-overlay');
        if (!glare) {
            glare = document.createElement('div');
            glare.className = 'tilt-glare-overlay';
            card.appendChild(glare);
        }

        const maxTilt = parseFloat(card.getAttribute('data-tilt-max') || '10');
        let bounds = null;
        let rafId = null;

        function updateBounds() {
            bounds = card.getBoundingClientRect();
        }

        function onMouseMove(e) {
            if (!bounds) updateBounds();

            const mouseX = e.clientX - bounds.left;
            const mouseY = e.clientY - bounds.top;

            const xPercent = mouseX / bounds.width;
            const yPercent = mouseY / bounds.height;

            const rotateX = ((0.5 - yPercent) * (maxTilt * 2)).toFixed(2);
            const rotateY = ((xPercent - 0.5) * (maxTilt * 2)).toFixed(2);

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

                if (glare) {
                    glare.style.opacity = '0.55';
                    glare.style.background = `radial-gradient(circle at ${xPercent * 100}% ${yPercent * 100}%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 65%)`;
                }
            });
        }

        function onMouseEnter() {
            updateBounds();
            card.style.transition = 'transform 0.15s ease-out';
        }

        function onMouseLeave() {
            if (rafId) cancelAnimationFrame(rafId);
            card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

            if (glare) {
                glare.style.opacity = '0';
            }
        }

        card.addEventListener('mouseenter', onMouseEnter);
        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('resize', updateBounds);
    });
})();
