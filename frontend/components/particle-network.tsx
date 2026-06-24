"use client";

import { useEffect, useRef } from "react";

export function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const numParticles = 150;
    const connectionDistance = 100;
    const trailLength = 20;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      trail: { x: number; y: number }[];

      constructor() {
        this.x = Math.random() * canvas!.offsetWidth;
        this.y = Math.random() * canvas!.offsetHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5 + 0.5;
        this.trail = [];
      }

      update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > trailLength) {
          this.trail.shift();
        }

        this.x += this.vx;
        this.y += this.vy;

        // Circular force field - keep particles in center
        const centerX = canvas!.offsetWidth / 2;
        const centerY = canvas!.offsetHeight / 2;
        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = Math.min(canvas!.offsetWidth, canvas!.offsetHeight) * 0.4;

        if (distance > maxRadius) {
          const angle = Math.atan2(dy, dx);
          this.vx -= Math.cos(angle) * 0.02;
          this.vy -= Math.sin(angle) * 0.02;
        }

        // Gentle random acceleration
        this.vx += (Math.random() - 0.5) * 0.02;
        this.vy += (Math.random() - 0.5) * 0.02;

        // Speed limit
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1) {
          this.vx = (this.vx / speed) * 1;
          this.vy = (this.vy / speed) * 1;
        }

        // Wrap around
        if (this.x < 0) this.x = canvas!.offsetWidth;
        if (this.x > canvas!.offsetWidth) this.x = 0;
        if (this.y < 0) this.y = canvas!.offsetHeight;
        if (this.y > canvas!.offsetHeight) this.y = 0;
      }

      draw() {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
          const alpha = (i / this.trail.length) * 0.3;
          ctx!.beginPath();
          ctx!.arc(this.trail[i].x, this.trail[i].y, this.radius * (i / this.trail.length), 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.fill();
        }

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx!.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx!.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx!.fillRect(0, 0, canvas!.offsetWidth, canvas!.offsetHeight);

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const alpha = (1 - distance / connectionDistance) * 0.3;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      // Occasional energy flare
      if (Math.random() < 0.02) {
        const randomParticle = particles[Math.floor(Math.random() * particles.length)];
        ctx!.beginPath();
        ctx!.arc(randomParticle.x, randomParticle.y, randomParticle.radius * 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx!.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
