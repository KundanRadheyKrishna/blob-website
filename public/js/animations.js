/**
 * GSAP Micro-Interactions, Stagger Entrances & File Drag-and-Drop
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. GSAP Stagger Feed Entrance
    if (window.gsap) {
        const postCards = document.querySelectorAll('.post-card');
        if (postCards.length > 0) {
            gsap.from(postCards, {
                opacity: 0,
                y: 40,
                scale: 0.95,
                stagger: 0.06,
                duration: 0.75,
                ease: 'power3.out'
            });
        }

        const authCard = document.querySelector('.auth-card');
        if (authCard) {
            gsap.from(authCard, {
                opacity: 0,
                y: 30,
                scale: 0.96,
                duration: 0.8,
                ease: 'power3.out'
            });
        }
    }

    // 2. Drag & Drop Live Preview on Post View
    const fileInput = document.getElementById('image');
    const dropzone = document.getElementById('dropzone');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-image');

    if (fileInput && dropzone) {
        ['dragenter', 'dragover'].forEach(evt => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropzone.classList.add('border-cyan-400', 'bg-cyan-500/10');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropzone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
                updatePreview(files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                updatePreview(fileInput.files[0]);
            }
        });

        function updatePreview(file) {
            if (!file.type.startsWith('image/')) return;
            const objectUrl = URL.createObjectURL(file);
            if (previewImg && previewContainer) {
                previewImg.src = objectUrl;
                previewContainer.classList.remove('hidden');
                if (window.gsap) {
                    gsap.from(previewContainer, {
                        scale: 0.9,
                        opacity: 0,
                        duration: 0.4,
                        ease: 'back.out(1.5)'
                    });
                }
            }
        }
    }
});
