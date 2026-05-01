/**
 * Particle Animation System — Minecraft-themed particles during conversion.
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.running = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        if (!this.canvas) return;
        this.running = true;
        this.canvas.classList.add('active');
        this.spawnBatch();
        this.animate();
    }

    stop() {
        this.running = false;
        if (this.canvas) this.canvas.classList.remove('active');
        this.particles = [];
    }

    spawnBatch() {
        if (!this.running) return;

        // Spawn 3-5 particles
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }

        // Keep spawning
        setTimeout(() => this.spawnBatch(), 300 + Math.random() * 500);
    }

    createParticle() {
        const colors = [
            '#7c5cfc', '#f472b6', '#38bdf8', '#34d399',
            '#fbbf24', '#a78bfa', '#fb923c', '#67e8f9'
        ];

        const isSquare = Math.random() > 0.4; // Minecraft-style square particles

        return {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + 10,
            size: isSquare ? (3 + Math.random() * 5) : (2 + Math.random() * 3),
            color: colors[Math.floor(Math.random() * colors.length)],
            speedX: (Math.random() - 0.5) * 1.5,
            speedY: -(1.5 + Math.random() * 3),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            opacity: 0.5 + Math.random() * 0.5,
            fadeRate: 0.003 + Math.random() * 0.005,
            isSquare,
            life: 1.0
        };
    }

    animate() {
        if (!this.running && this.particles.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;
            p.life -= p.fadeRate;

            if (p.life <= 0 || p.y < -20) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.life * p.opacity;
            this.ctx.fillStyle = p.color;

            if (p.isSquare) {
                // Minecraft pixel-style square
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else {
                // Soft circle
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize globally
window.particleSystem = new ParticleSystem('particleCanvas');
