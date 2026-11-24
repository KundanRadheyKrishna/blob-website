/**
 * High-Performance 3D Particle Constellation (Canvas 3D)
 * Pure HTML5 Canvas with 3D projection math and mouse rotational inertia
 */
(function() {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const numPoints = 85;
    const sphereRadius = 380;
    const points = [];

    // Camera and rotation state
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let mouseX = 0;
    let mouseY = 0;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
    }

    // Initialize 3D Fibonacci sphere distribution
    for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(-1 + (2 * i) / numPoints);
        const theta = Math.sqrt(numPoints * Math.PI) * phi;

        points.push({
            x: sphereRadius * Math.cos(theta) * Math.sin(phi),
            y: sphereRadius * Math.sin(theta) * Math.sin(phi),
            z: sphereRadius * Math.cos(phi),
            baseRadius: Math.random() * 1.6 + 1.2,
            pulseSpeed: Math.random() * 0.02 + 0.01,
            pulse: Math.random() * Math.PI
        });
    }

    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - width / 2) / (width / 2);
        mouseY = (e.clientY - height / 2) / (height / 2);
        targetRotY = mouseX * 0.45;
        targetRotX = -mouseY * 0.45;
    });

    const fov = 420;

    function render() {
        // Smooth rotation damping
        rotX += (targetRotX - rotX) * 0.04;
        rotY += (targetRotY - rotY) * 0.04;

        // Constant gentle background rotation
        targetRotY += 0.0006;

        ctx.clearRect(0, 0, width, height);

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        const projected = [];
        const cx = width / 2;
        const cy = height / 2;

        for (let i = 0; i < points.length; i++) {
            const p = points[i];

            // 3D rotation matrix around Y then X
            const x1 = p.x * cosY + p.z * sinY;
            const z1 = -p.x * sinY + p.z * cosY;

            const y2 = p.y * cosX - z1 * sinX;
            const z2 = p.y * sinX + z1 * cosX;

            const depth = z2 + 650;
            if (depth <= 0) continue;

            const scale = fov / depth;
            const px = cx + x1 * scale;
            const py = cy + y2 * scale;

            p.pulse += p.pulseSpeed;
            const currentR = p.baseRadius * (1 + 0.25 * Math.sin(p.pulse));

            projected.push({
                x: px,
                y: py,
                z: z2,
                scale: scale,
                radius: currentR,
                alpha: Math.min(Math.max((z2 + sphereRadius) / (2 * sphereRadius), 0.15), 0.85)
            });
        }

        // Draw dynamic energy connection filaments
        const maxDist = 95;
        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
                const p1 = projected[i];
                const p2 = projected[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const lineAlpha = (1 - dist / maxDist) * 0.22 * Math.min(p1.alpha, p2.alpha);
                    ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        // Draw 3D glowing particle nodes
        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];
            const glowR = p.radius * p.scale * 1.8;

            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR * 3);
            gradient.addColorStop(0, `rgba(56, 189, 248, ${p.alpha})`);
            gradient.addColorStop(0.5, `rgba(139, 92, 246, ${p.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR * 3, 0, Math.PI * 2);
            ctx.fill();

            // Core point
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(p.radius * p.scale * 0.8, 1), 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(render);
    }

    render();
})();
