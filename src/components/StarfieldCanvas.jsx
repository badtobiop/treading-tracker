import React, { useEffect, useRef } from 'react';

export default function StarfieldCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Mouse parallax tracking (subtle and smooth)
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX - width / 2) * 0.02;
      targetMouseY = (e.clientY - height / 2) * 0.02;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Create 3D Stars - Slower, gentle cosmic drift
    const NUM_STARS = 220;
    const stars = [];

    const starColors = [
      'rgba(255, 241, 242, ', // Starlight Rose White
      'rgba(251, 113, 133, ', // Aesthetic Rose Pink
      'rgba(244, 114, 182, ', // Sakura Pink
      'rgba(253, 164, 175, ', // Soft Blush Pink
      'rgba(254, 205, 211, '  // Pale Quartz Rose
    ];

    for (let i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        baseColor: starColors[Math.floor(Math.random() * starColors.length)],
        size: Math.random() * 1.4 + 0.5,
        // Dhire move karne ke liye speed ko 0.12 - 0.28 kar diya (gentle floating)
        speed: Math.random() * 0.18 + 0.10
      });
    }

    // Render loop
    const render = () => {
      // Smooth mouse follow
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + mouseX;
      const cy = height / 2 + mouseY;

      for (let i = 0; i < NUM_STARS; i++) {
        const star = stars[i];

        // Gentle forward movement
        star.z -= star.speed;
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        // 3D Perspective Projection
        const k = 260 / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const depthAlpha = Math.min(0.85, Math.max(0.12, 1 - star.z / width));
          const radius = Math.max(0.5, star.size * k);

          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `${star.baseColor}${depthAlpha.toFixed(2)})`;
          ctx.fill();

          // Delicate soft halo for closer stars
          if (star.z < width * 0.3) {
            ctx.beginPath();
            ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = `${star.baseColor}${(depthAlpha * 0.2).toFixed(2)})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.75,
        contain: 'strict',
        willChange: 'transform'
      }}
    />
  );
}
