import React, { useEffect, useRef, useState } from 'react';
import { GameObject, GameScreen, ObjectType, SavedData } from '../types';
import { 
  BOOST_MULTIPLIER, CLONING_RATES, COLLISION_DAMAGE, COLLISION_FUEL_LEAK, 
  FUEL_CONSUMPTION_BASE, FUEL_EFFICIENCY, FUEL_MAX, HULL_CAPACITIES, 
  HULL_MAX, PLANET_NAMES, SCROLL_SPEED_BASE, SCROLL_SPEED_MAX, SHIP_FRICTION, 
  SHIP_THRUST 
} from '../constants';
import { HUD } from './HUD';
import { Starfield } from './Starfield';

interface GameCanvasProps {
  saveData: SavedData;
  onGameOver: (stats: { zombies: number; credits: number; reason: string }) => void;
  onSuccess: (stats: { zombies: number; credits: number; multiplier: number }) => void;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ saveData, onGameOver, onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const mouseRef = useRef<boolean>(false);
  
  // Game State Refs (Mutable for performance)
  const gameState = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: 0,
    vy: 0,
    fuel: FUEL_MAX,
    hull: HULL_MAX,
    zombies: 10,
    maxZombies: HULL_CAPACITIES[saveData.upgrades.hull - 1],
    cloningRate: CLONING_RATES[saveData.upgrades.cloning - 1],
    fuelEff: FUEL_EFFICIENCY[saveData.upgrades.fuel - 1],
    objects: [] as GameObject[],
    projectiles: [] as Projectile[],
    explosions: [] as Explosion[],
    scrollSpeed: SCROLL_SPEED_BASE,
    distance: 0,
    multiplier: 1.0,
    boostCharge: 100,
    isBoosting: false,
    planetNear: null as string | null,
    isLanding: false,
    landingProgress: 0,
    screenShake: 0,
    lastShotTime: 0
  });

  // Input State
  const keys = useRef<Set<string>>(new Set());

  // React State for HUD updates
  const [hudState, setHudState] = useState({
    fuel: 100, hull: 100, zombies: 10, 
    maxZombies: 100, credits: 0, multiplier: 1,
    boostCharge: 100, nearestPlanet: null as string | null
  });

  // Helper: Spawn Objects
  const spawnObject = (width: number) => {
    const rand = Math.random();
    let type = ObjectType.ASTEROID;
    let radius = 20 + Math.random() * 30;
    let color = '#888';
    let value = 0;

    // Spawn Rates
    if (rand > 0.98) {
       type = ObjectType.PLANET;
       radius = 150;
       color = '#44F';
    } else if (rand > 0.94) {
      type = ObjectType.REPAIR;
      radius = 15;
      color = '#F22';
      value = 25;
    } else if (rand > 0.90) {
      type = ObjectType.FUEL;
      radius = 15;
      color = '#0FF';
      value = 20;
    } else if (rand > 0.88) {
      type = ObjectType.BOOST;
      radius = 10;
      color = '#FA0';
      value = 50;
    }

    // Planets only spawn occasionally
    if (type === ObjectType.PLANET) {
      if (gameState.current.objects.some(o => o.type === ObjectType.PLANET)) return;
      
      const planetName = PLANET_NAMES[Math.floor(Math.random() * PLANET_NAMES.length)];
      
      gameState.current.objects.push({
        id: Math.random().toString(),
        type,
        x: Math.random() * (width - 200) + 100,
        y: -300, 
        radius,
        vx: 0,
        vy: 1, 
        rotation: 0,
        rotationSpeed: 0.001,
        color,
        label: planetName
      });
    } else {
      gameState.current.objects.push({
        id: Math.random().toString(),
        type,
        x: Math.random() * width,
        y: -50,
        radius,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        color,
        value
      });
    }
  };

  const playSound = (type: 'land' | 'shoot' | 'explode') => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (type === 'land') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 2);
          const lfo = audioCtx.createOscillator();
          lfo.type = 'square';
          lfo.frequency.value = 10;
          const lfoGain = audioCtx.createGain();
          lfoGain.gain.value = 500;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start();
          lfo.stop(audioCtx.currentTime + 2.1);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
          osc.stop(audioCtx.currentTime + 2.1);
        } else if (type === 'shoot') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'explode') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc.stop(audioCtx.currentTime + 0.3);
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
    } catch(e) {
      // ignore audio errors
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const landOnPlanet = () => {
      if (gameState.current.isLanding) return;
      gameState.current.isLanding = true;
      playSound('land');
    };

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      // Planet Interaction
      if (gameState.current.planetNear) {
        if (e.key.toLowerCase() === 'y') {
          landOnPlanet();
        } else if (e.key.toLowerCase() === 'n') {
          gameState.current.planetNear = null;
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current = true;
      if (e.button === 0 && gameState.current.planetNear) {
        landOnPlanet();
      }
    };
    
    const handleMouseUp = () => {
      mouseRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // GAME LOOP
    const update = () => {
      const state = gameState.current;
      const now = Date.now();
      
      // LANDING SEQUENCE
      if (state.isLanding) {
        state.landingProgress += 0.01;
        const planet = state.objects.find(o => o.type === ObjectType.PLANET);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (planet) {
          state.x += (planet.x - state.x) * 0.08;
          state.y += (planet.y - state.y) * 0.08;
          
          ctx.save();
          ctx.translate(planet.x, planet.y);
          const scale = 1 + state.landingProgress * 2;
          ctx.scale(scale, scale);
          
          const grad = ctx.createRadialGradient(0, 0, planet.radius * 0.8, 0, 0, planet.radius * 1.2);
          grad.addColorStop(0, planet.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius * 1.2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = planet.color;
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(state.x, state.y);
        const shipScale = Math.max(0, 1 - state.landingProgress);
        ctx.scale(shipScale, shipScale);
        ctx.rotate(state.landingProgress * Math.PI * 2);
        
        ctx.fillStyle = '#EEE';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(15, 15);
        ctx.lineTo(0, 10);
        ctx.lineTo(-15, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = `rgba(255, 255, 255, ${state.landingProgress})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (state.landingProgress >= 1.2) {
          const finalCredits = Math.floor(state.zombies * state.multiplier);
          onSuccess({ 
            zombies: Math.floor(state.zombies), 
            credits: finalCredits, 
            multiplier: state.multiplier 
          });
          return;
        }

        requestRef.current = requestAnimationFrame(update);
        return;
      }

      // --- NORMAL GAME LOOP ---

      // 1. Physics & Input
      if (keys.current.has('w') || keys.current.has('arrowup')) state.vy -= SHIP_THRUST;
      if (keys.current.has('s') || keys.current.has('arrowdown')) state.vy += SHIP_THRUST;
      if (keys.current.has('a') || keys.current.has('arrowleft')) state.vx -= SHIP_THRUST;
      if (keys.current.has('d') || keys.current.has('arrowright')) state.vx += SHIP_THRUST;

      // Boost: Shift only
      state.isBoosting = keys.current.has('shift') && state.boostCharge > 0;
      if (state.isBoosting) {
        state.boostCharge -= 0.5;
        state.scrollSpeed = Math.min(SCROLL_SPEED_MAX * 1.5, state.scrollSpeed + 0.1);
      } else {
        state.boostCharge = Math.min(100, state.boostCharge + 0.05);
        const targetSpeed = SCROLL_SPEED_BASE + (state.distance / 10000);
        state.scrollSpeed = state.scrollSpeed * 0.98 + targetSpeed * 0.02;
      }

      // Shooting: Space or Mouse Click (if not landing)
      const isShooting = keys.current.has(' ') || (mouseRef.current && !state.planetNear);
      if (isShooting && now - state.lastShotTime > 250 && state.projectiles.length < 3) {
         state.projectiles.push({
           id: now,
           x: state.x,
           y: state.y - 20,
           vx: state.vx * 0.5, // Inherit some velocity
           vy: -12 // Shoot forward/up
         });
         state.lastShotTime = now;
         playSound('shoot');
         
         // Recoil
         state.vy += 0.5;
      }

      // Apply Friction
      state.vx *= SHIP_FRICTION;
      state.vy *= SHIP_FRICTION;
      state.x += state.vx;
      state.y += state.vy;

      // Boundaries
      if (state.x < 0) { state.x = 0; state.vx *= -0.5; }
      if (state.x > canvas.width) { state.x = canvas.width; state.vx *= -0.5; }
      if (state.y < 0) { state.y = 0; state.vy *= -0.5; }
      if (state.y > canvas.height) { state.y = canvas.height; state.vy *= -0.5; }

      // 2. Resources
      state.fuel -= FUEL_CONSUMPTION_BASE * state.fuelEff * (state.isBoosting ? 3 : 1);
      state.zombies += state.cloningRate * 0.05;
      state.distance += state.scrollSpeed;

      // 3. Object Management
      if (Math.random() < 0.05 + (state.distance / 100000)) {
        spawnObject(canvas.width);
      }

      state.planetNear = null;
      
      // Update Projectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -50 || p.x < 0 || p.x > canvas.width || p.y > canvas.height) {
          state.projectiles.splice(i, 1);
        }
      }

      // Update Explosions
      for (let i = state.explosions.length - 1; i >= 0; i--) {
        const ex = state.explosions[i];
        ex.radius += 1.5;
        ex.alpha -= 0.05;
        if (ex.alpha <= 0) state.explosions.splice(i, 1);
      }
      
      // Screen Shake Decay
      if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) state.screenShake = 0;
      }

      // Object Physics & Collision
      state.objects.forEach((obj, index) => {
        const speedMult = state.isBoosting ? BOOST_MULTIPLIER : 1;
        obj.y += (state.scrollSpeed * speedMult) + obj.vy;
        obj.x += obj.vx;
        obj.rotation += obj.rotationSpeed;

        const dx = state.x - obj.x;
        const dy = state.y - obj.y;
        const dist = Math.hypot(dx, dy);
        
        if (obj.type === ObjectType.PLANET) {
           if (dist < obj.radius + 200 && obj.y > 0 && obj.y < canvas.height) {
             state.planetNear = obj.label || "Unknown Planet";
           }
        } else {
          // Ship Collision
          if (dist < obj.radius + 15) {
            if (obj.type === ObjectType.ASTEROID) {
              state.hull -= COLLISION_DAMAGE;
              state.fuel -= COLLISION_FUEL_LEAK;
              state.vx += (dx / dist) * 10;
              state.vy += (dy / dist) * 10;
              state.screenShake = 15; // Heavy shake for ship hit
            } else if (obj.type === ObjectType.FUEL) {
              state.fuel = Math.min(FUEL_MAX, state.fuel + (obj.value || 0));
            } else if (obj.type === ObjectType.REPAIR) {
              state.hull = Math.min(HULL_MAX, state.hull + (obj.value || 0));
            } else if (obj.type === ObjectType.BOOST) {
              state.boostCharge = Math.min(100, state.boostCharge + (obj.value || 0));
            }
            state.objects.splice(index, 1);
            return; // Object gone
          }

          // Projectile Collision
          if (obj.type === ObjectType.ASTEROID) {
            for (let pIndex = state.projectiles.length - 1; pIndex >= 0; pIndex--) {
              const p = state.projectiles[pIndex];
              const pDist = Math.hypot(p.x - obj.x, p.y - obj.y);
              if (pDist < obj.radius + 5) {
                // Hit!
                state.objects.splice(index, 1);
                state.projectiles.splice(pIndex, 1);
                
                // Explosion
                state.explosions.push({
                  id: Math.random(),
                  x: obj.x,
                  y: obj.y,
                  radius: 10,
                  maxRadius: 40,
                  alpha: 1,
                  color: '#FA0'
                });
                
                state.screenShake = 5; // Light shake for shooting
                playSound('explode');
                return; 
              }
            }
          }
        }

        if (obj.y > canvas.height + 300) {
           if (obj.type === ObjectType.PLANET) {
             state.multiplier += 0.5;
           }
           state.objects.splice(index, 1);
        }
      });

      // 4. Rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      
      // Apply Screen Shake
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake;
        const shakeY = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Draw Objects
      state.objects.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        
        if (obj.type === ObjectType.PLANET) {
          const grad = ctx.createRadialGradient(0, 0, obj.radius * 0.8, 0, 0, obj.radius * 1.2);
          grad.addColorStop(0, obj.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius * 1.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 5;
          ctx.stroke();
          
          ctx.fillStyle = '#FFF';
          ctx.font = '20px Orbitron';
          ctx.textAlign = 'center';
          ctx.fillText(obj.label || '', 0, obj.radius + 40);
        } else {
          ctx.fillStyle = obj.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = obj.color;
          
          ctx.beginPath();
          if (obj.type === ObjectType.ASTEROID) {
             for(let i=0; i<6; i++) {
               const angle = (i/6) * Math.PI * 2;
               const r = obj.radius * (0.8 + Math.random() * 0.4);
               ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
             }
          } else {
             ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });
      
      // Draw Projectiles
      state.projectiles.forEach(p => {
        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0FF';
        ctx.fillStyle = '#0FF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      
      // Draw Explosions
      state.explosions.forEach(ex => {
        ctx.save();
        ctx.globalAlpha = ex.alpha;
        ctx.fillStyle = ex.color;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Ship
      ctx.save();
      ctx.translate(state.x, state.y);
      
      if (keys.current.has('w') || keys.current.has('arrowup') || state.isBoosting) {
        ctx.beginPath();
        ctx.moveTo(-5, 15);
        ctx.lineTo(0, 30 + Math.random() * 20);
        ctx.lineTo(5, 15);
        ctx.fillStyle = state.isBoosting ? '#FA0' : '#0FF';
        ctx.fill();
      }

      ctx.fillStyle = '#EEE';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 15);
      ctx.lineTo(0, 10);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, -5, 5, 0, Math.PI * 2);
      ctx.fill();

      if (state.hull < 30) {
        ctx.strokeStyle = `rgba(255, 0, 0, ${Math.random()})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI*2);
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore(); // Restore shake context

      setHudState({
        fuel: state.fuel,
        hull: state.hull,
        zombies: state.zombies,
        maxZombies: state.maxZombies,
        credits: Math.floor(state.zombies * state.multiplier),
        multiplier: state.multiplier,
        boostCharge: state.boostCharge,
        nearestPlanet: state.planetNear
      });

      if (state.hull <= 0) {
        onGameOver({ zombies: Math.floor(state.zombies), credits: 0, reason: "CRITICAL HULL FAILURE" });
        return;
      }
      if (state.fuel <= 0) {
        onGameOver({ zombies: Math.floor(state.zombies), credits: 0, reason: "OUT OF FUEL - DRIFTING ETERNALLY" });
        return;
      }
      if (state.zombies >= state.maxZombies) {
        onGameOver({ zombies: Math.floor(state.zombies), credits: 0, reason: "CONTAINMENT BREACH - SHIP OVERRUN" });
        return;
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [saveData, onGameOver, onSuccess]);

  return (
    <div className="relative w-full h-full">
      <Starfield speedMultiplier={gameState.current?.isBoosting ? 2 : 0.5} />
      <canvas ref={canvasRef} className="block cursor-crosshair" />
      <HUD {...hudState} />
    </div>
  );
};