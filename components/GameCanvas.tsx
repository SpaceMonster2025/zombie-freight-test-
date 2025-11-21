
import React, { useEffect, useRef, useState } from 'react';
import { GameObject, GameScreen, ObjectType, SavedData, Difficulty } from '../types';
import { 
  BOOST_MULTIPLIER, CLONING_RATES, COLLISION_DAMAGE, COLLISION_FUEL_LEAK, 
  FUEL_CONSUMPTION_BASE, FUEL_EFFICIENCY, FUEL_MAX, HULL_CAPACITIES, 
  HULL_MAX, PLANET_NAMES, SCROLL_SPEED_BASE, SCROLL_SPEED_MAX, SHIP_FRICTION, 
  SHIP_THRUST, DIFFICULTY_CONFIG, COLLECTOR_CONFIG, MINING_COST, 
  MINERAL_VALUE, MINERAL_ENERGY, MINING_DIFFICULTY_SETTINGS
} from '../constants';
import { HUD } from './HUD';
import { Starfield } from './Starfield';

interface GameCanvasProps {
  saveData: SavedData;
  difficulty: Difficulty;
  onGameOver: (stats: { zombies: number; credits: number; reason: string }) => void;
  onSuccess: (stats: { zombies: number; credits: number; multiplier: number }) => void;
}

interface DebrisParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  decay: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ saveData, difficulty, onGameOver, onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const mouseRef = useRef<{x: number, y: number, isDown: boolean}>({ x: 0, y: 0, isDown: false });
  const rightMouseRef = useRef<boolean>(false);
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const miningAudioRef = useRef<{
    osc: OscillatorNode | null;
    gain: GainNode | null;
    lfo: OscillatorNode | null;
    lfoGain: GainNode | null;
  }>({ osc: null, gain: null, lfo: null, lfoGain: null });

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
    particles: [] as DebrisParticle[],
    scrollSpeed: SCROLL_SPEED_BASE,
    distance: 0,
    multiplier: 1.0,
    boostCharge: 100,
    isBoosting: false,
    planetNear: null as string | null,
    isLanding: false,
    landingProgress: 0,
    screenShake: 0,
    // Collector State
    collectorUses: COLLECTOR_CONFIG[difficulty].uses,
    collectorMaxTime: COLLECTOR_CONFIG[difficulty].duration,
    collectorTimeLeft: COLLECTOR_CONFIG[difficulty].duration,
    isCollecting: false
  });

  // Input State
  const keys = useRef<Set<string>>(new Set());

  // React State for HUD updates
  const [hudState, setHudState] = useState({
    fuel: 100, hull: 100, zombies: 10, 
    maxZombies: 100, credits: 0, multiplier: 1,
    boostCharge: 100, nearestPlanet: null as string | null,
    collectorUses: 0, collectorActive: false, collectorProgress: 1
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
        value,
        miningProgress: 0
      });
    }
  };

  const spawnMinerals = (x: number, y: number) => {
    const settings = MINING_DIFFICULTY_SETTINGS[difficulty];
    const count = settings.mineralCount.min + Math.floor(Math.random() * (settings.mineralCount.max - settings.mineralCount.min + 1));
    
    for(let i=0; i<count; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = settings.mineralSpeed + (Math.random() * 0.05); 
       
       gameState.current.objects.push({
        id: Math.random().toString(),
        type: ObjectType.MINERAL,
        x: x,
        y: y,
        radius: 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: 0,
        rotationSpeed: 0.1,
        color: '#FFD700', // Gold
        value: MINERAL_VALUE,
        miningProgress: 0
      });
    }
  };

  const createExplosionParticles = (x: number, y: number, baseColor: string, amount: number) => {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      
      const type = Math.random();
      let pColor = baseColor;
      let pSize = Math.random() * 4 + 1;
      let pLife = 1.0;
      let decay = 0.02 + Math.random() * 0.03;

      if (type > 0.7) {
         pColor = '#FFFFFF'; // Flash/Spark
         pSize = 3;
         pLife = 0.6;
         decay = 0.05;
      } else if (type > 0.3) {
         pColor = Math.random() > 0.5 ? '#FF4500' : '#FFA500'; // Fire
         pSize = Math.random() * 8 + 4;
      } else {
         pColor = '#666666'; // Debris
      }

      gameState.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: pSize,
        color: pColor,
        life: pLife,
        decay
      });
    }
  };

  // Dynamic Mining Audio Manager
  const manageMiningAudio = (isMining: boolean, progress: number) => {
      // Init Audio Context lazily
      if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
              audioCtxRef.current = new AudioContextClass();
          }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') ctx.resume();

      if (isMining) {
          // Create Nodes if not existing
          if (!miningAudioRef.current.osc) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const lfo = ctx.createOscillator();
              const lfoGain = ctx.createGain();

              // Main Oscillator - Sawtooth for harsh "beam" sound
              osc.type = 'sawtooth';
              osc.connect(gain);
              gain.connect(ctx.destination);

              // LFO - Square wave for "crackling" modulation
              lfo.type = 'square';
              lfo.connect(lfoGain);
              lfoGain.connect(osc.frequency);

              osc.start();
              lfo.start();

              miningAudioRef.current = { osc, gain, lfo, lfoGain };
          }

          // Modulate Sound based on Heat (Progress)
          const nodes = miningAudioRef.current;
          const now = ctx.currentTime;

          // 1. Pitch rises dramatically as it heats up (80Hz -> 900Hz)
          const targetFreq = 80 + (progress * 820);
          // 2. Crackle rate speeds up (30Hz -> 80Hz)
          const targetLfoRate = 30 + (progress * 50);
          // 3. Crackle intensity deepens (20 -> 200)
          const targetLfoDepth = 20 + (progress * 180);

          if (nodes.osc && nodes.lfo && nodes.lfoGain && nodes.gain) {
              nodes.osc.frequency.setTargetAtTime(targetFreq, now, 0.1);
              nodes.lfo.frequency.setTargetAtTime(targetLfoRate, now, 0.1);
              nodes.lfoGain.gain.setTargetAtTime(targetLfoDepth, now, 0.1);
              // Stabilize volume
              nodes.gain.gain.setTargetAtTime(0.1, now, 0.1);
          }

      } else {
          // Stop and cleanup if running
          if (miningAudioRef.current.osc) {
              const nodes = miningAudioRef.current;
              const now = ctx.currentTime;
              
              // Quick fade out to avoid clicks
              if (nodes.gain) nodes.gain.gain.setTargetAtTime(0, now, 0.05);
              
              // Stop slightly in future to allow fade
              if (nodes.osc) nodes.osc.stop(now + 0.1);
              if (nodes.lfo) nodes.lfo.stop(now + 0.1);
              
              // Reset ref
              miningAudioRef.current = { osc: null, gain: null, lfo: null, lfoGain: null };
          }
      }
  };

  const playSound = (type: 'land' | 'explode' | 'collect') => {
    try {
        if (!audioCtxRef.current) {
             const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
             if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (type === 'land') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 2);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
          osc.stop(audioCtx.currentTime + 2.1);
        } else if (type === 'explode') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'collect') {
           osc.type = 'sine';
           osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
           osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
           gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
           gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
           osc.stop(audioCtx.currentTime + 0.1);
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
    } catch(e) {
      // ignore
    }
  };

  // Lightning Drawing Helper
  const drawLightning = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.save();
    ctx.strokeStyle = '#60A5FA'; // Blue-400
    ctx.lineWidth = 3;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 15;
    
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.floor(dist / 10);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    let cx = x1;
    let cy = y1;
    
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const tx = x1 + (x2 - x1) * t;
      const ty = y1 + (y2 - y1) * t;
      
      const jitter = 5;
      const nx = tx + (Math.random() - 0.5) * jitter;
      const ny = ty + (Math.random() - 0.5) * jitter;
      
      ctx.lineTo(nx, ny);
      cx = nx;
      cy = ny;
    }
    
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Inner White Core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
    
    ctx.restore();
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
      if (e.button === 0) { // Left Click
        mouseRef.current.isDown = true;
        if (gameState.current.planetNear) landOnPlanet();
      }
      if (e.button === 2) { // Right Click
        rightMouseRef.current = true;
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseRef.current.isDown = false;
      if (e.button === 2) rightMouseRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    // GAME LOOP
    const update = () => {
      const state = gameState.current;
      const now = Date.now();
      const collConfig = COLLECTOR_CONFIG[difficulty];
      const miningSettings = MINING_DIFFICULTY_SETTINGS[difficulty];
      
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
        // Passive recharge is slow
        state.boostCharge = Math.min(100, state.boostCharge + 0.02);
        const targetSpeed = SCROLL_SPEED_BASE + (state.distance / 10000);
        state.scrollSpeed = state.scrollSpeed * 0.98 + targetSpeed * 0.02;
      }

      // Collector Ability Logic
      state.isCollecting = rightMouseRef.current && state.collectorUses > 0;
      if (state.isCollecting) {
        state.collectorTimeLeft--;
        if (state.collectorTimeLeft <= 0) {
          state.collectorUses--;
          if (state.collectorUses > 0) {
            state.collectorTimeLeft = state.collectorMaxTime;
          } else {
            state.collectorTimeLeft = 0;
            state.isCollecting = false;
          }
        }
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
      
      // Update Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) state.particles.splice(i, 1);
      }
      
      // Screen Shake Decay
      if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) state.screenShake = 0;
      }

      // 4. Rendering & Mining Logic
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      
      // Apply Screen Shake
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake;
        const shakeY = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // MINING LOGIC
      let isHittingAsteroid = false;
      let currentMiningProgress = 0;
      let rayTargetX = mouseRef.current.x;
      let rayTargetY = mouseRef.current.y;

      // If Mining
      if (mouseRef.current.isDown && !state.planetNear && state.boostCharge > MINING_COST) {
          state.boostCharge -= MINING_COST;
          
          // Check collision with mouse point for asteroids
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;

          for(const obj of state.objects) {
              if (obj.type === ObjectType.ASTEROID && !obj.isDying) {
                  const dx = mx - obj.x;
                  const dy = my - obj.y;
                  if (Math.hypot(dx, dy) < obj.radius + 20) {
                      // Valid Mine Hit
                      isHittingAsteroid = true;
                      currentMiningProgress = obj.miningProgress || 0;
                      rayTargetX = obj.x;
                      rayTargetY = obj.y;
                      
                      obj.miningProgress = (obj.miningProgress || 0) + miningSettings.miningSpeed;
                      
                      // Shake Effect
                      obj.x += (Math.random() - 0.5) * 4;
                      obj.y += (Math.random() - 0.5) * 4;
                      
                      // Mining Complete
                      if (obj.miningProgress >= 1) {
                          obj.isDying = true;
                          obj.flashTime = 3;
                          spawnMinerals(obj.x, obj.y);
                          isHittingAsteroid = false; // Stop sound on kill frame
                      }
                      break; // Mine one at a time
                  }
              }
          }
      }

      // Update Dynamic Audio
      manageMiningAudio(isHittingAsteroid, currentMiningProgress);

      // Draw Objects
      for (let i = state.objects.length - 1; i >= 0; i--) {
        const obj = state.objects[i];

        // Handle Dying State
        if (obj.isDying) {
            obj.flashTime = (obj.flashTime || 0) - 1;
            obj.y += state.scrollSpeed;

            if (obj.flashTime <= 0) {
                createExplosionParticles(obj.x, obj.y, obj.color, Math.floor(obj.radius * 0.8));
                const shakeAmount = obj.radius > 35 ? 20 : 5;
                state.screenShake = Math.max(state.screenShake, shakeAmount);
                playSound('explode');
                state.objects.splice(i, 1);
            } else {
                // Render Flash
                ctx.save();
                ctx.translate(obj.x, obj.y);
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 30;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(0, 0, obj.radius * 1.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            continue;
        }

        // Physics
        const speedMult = state.isBoosting ? BOOST_MULTIPLIER : 1;
        obj.y += (state.scrollSpeed * speedMult) + obj.vy;
        obj.x += obj.vx;
        obj.rotation += obj.rotationSpeed;

        // Collector
        if (state.isCollecting && [ObjectType.FUEL, ObjectType.REPAIR, ObjectType.BOOST, ObjectType.MINERAL].includes(obj.type)) {
           const dx = state.x - obj.x;
           const dy = state.y - obj.y;
           const dist = Math.hypot(dx, dy);
           
           if (dist < collConfig.radius) {
              const force = collConfig.pullSpeed * 2; // Stronger pull for minerals
              const angle = Math.atan2(dy, dx);
              obj.vx += Math.cos(angle) * force;
              obj.vy += Math.sin(angle) * force;
              
              ctx.beginPath();
              ctx.moveTo(state.x, state.y);
              ctx.lineTo(obj.x, obj.y);
              ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 * (1 - dist/collConfig.radius)})`;
              ctx.lineWidth = 2;
              ctx.stroke();
           }
        }

        // Boundary check
        if (obj.y > canvas.height + 300) {
           if (obj.type === ObjectType.PLANET) state.multiplier += 0.5;
           state.objects.splice(i, 1);
           continue;
        }

        const dx = state.x - obj.x;
        const dy = state.y - obj.y;
        const dist = Math.hypot(dx, dy);

        // Render
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);

        if (obj.type === ObjectType.ASTEROID) {
             // Asteroid Rendering
             ctx.fillStyle = obj.color;
             ctx.shadowBlur = 10;
             ctx.shadowColor = '#000';
             
             // Heating Effect Overlay
             if (obj.miningProgress && obj.miningProgress > 0) {
                 // Base asteroid
                 ctx.beginPath();
                 for(let k=0; k<6; k++) {
                    const angle = (k/6) * Math.PI * 2;
                    const r = obj.radius * (0.9 + Math.random() * 0.2); 
                    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                 }
                 ctx.fill();

                 // Heat Overlay
                 const heatColor = `rgba(255, ${Math.floor(100 * (1 - obj.miningProgress))}, 0, ${obj.miningProgress})`;
                 ctx.fillStyle = heatColor;
                 ctx.shadowColor = '#FF4500';
                 ctx.shadowBlur = 20 * obj.miningProgress;
                 ctx.beginPath();
                 for(let k=0; k<6; k++) {
                    const angle = (k/6) * Math.PI * 2;
                    const r = obj.radius * (0.95 + Math.random() * 0.2); 
                    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                 }
                 ctx.fill();

                 // White hot core when near destruction
                 if (obj.miningProgress > 0.8) {
                     ctx.fillStyle = `rgba(255, 255, 255, ${(obj.miningProgress - 0.8) * 5})`;
                     ctx.fill();
                 }

             } else {
                 ctx.beginPath();
                 for(let k=0; k<6; k++) {
                   const angle = (k/6) * Math.PI * 2;
                   const r = obj.radius * (0.8 + Math.random() * 0.4); 
                   ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                 }
                 ctx.fill();
             }

        } else if (obj.type === ObjectType.PLANET) {
             // Planet Rendering (Same as before)
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
        } else if (obj.type === ObjectType.MINERAL) {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFA500';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -obj.radius);
            ctx.lineTo(obj.radius, 0);
            ctx.lineTo(0, obj.radius);
            ctx.lineTo(-obj.radius, 0);
            ctx.fill();
        } else {
             // Pickups
             ctx.fillStyle = obj.color;
             ctx.shadowBlur = 10;
             ctx.shadowColor = obj.color;
             ctx.beginPath();
             ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
             ctx.fill();
        }
        ctx.restore();

        // Collisions
        if (obj.type === ObjectType.PLANET) {
           if (dist < obj.radius + 200 && obj.y > 0 && obj.y < canvas.height) {
             state.planetNear = obj.label || "Unknown Planet";
           }
        } else {
           if (dist < obj.radius + 15) {
             if (obj.type === ObjectType.ASTEROID) {
               state.hull -= COLLISION_DAMAGE;
               state.fuel -= COLLISION_FUEL_LEAK;
               state.vx += (dx / dist) * 10;
               state.vy += (dy / dist) * 10;
               state.screenShake = 15;
               createExplosionParticles(obj.x, obj.y, obj.color, 15);
               playSound('explode');
             } else if (obj.type === ObjectType.FUEL) {
               state.fuel = Math.min(FUEL_MAX, state.fuel + (obj.value || 0));
               playSound('collect');
             } else if (obj.type === ObjectType.REPAIR) {
               state.hull = Math.min(HULL_MAX, state.hull + (obj.value || 0));
               playSound('collect');
             } else if (obj.type === ObjectType.BOOST) {
               state.boostCharge = Math.min(100, state.boostCharge + (obj.value || 0));
               playSound('collect');
             } else if (obj.type === ObjectType.MINERAL) {
                // Mineral Collection
                state.zombies += 1; 
                state.boostCharge = Math.min(100, state.boostCharge + MINERAL_ENERGY);
                playSound('collect');
             }
             state.objects.splice(i, 1);
           }
        }
      } // End Object Loop

      // Draw Mining Ray
      if (mouseRef.current.isDown && !state.planetNear && state.boostCharge > 0) {
         drawLightning(ctx, state.x, state.y - 10, rayTargetX, rayTargetY);
      }

      // Draw Particles
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Ship
      ctx.save();
      ctx.translate(state.x, state.y);
      
      // Collector Shield
      if (state.isCollecting) {
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${0.1 + Math.random() * 0.1})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.random() * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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
      
      // Cockpit
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
        nearestPlanet: state.planetNear,
        collectorUses: state.collectorUses,
        collectorActive: state.isCollecting,
        collectorProgress: state.collectorTimeLeft / state.collectorMaxTime
      });

      if (state.hull <= 0) {
        manageMiningAudio(false, 0);
        onGameOver({ zombies: Math.floor(state.zombies), credits: 0, reason: "CRITICAL HULL FAILURE" });
        return;
      }
      if (state.fuel <= 0) {
        manageMiningAudio(false, 0);
        onGameOver({ zombies: Math.floor(state.zombies), credits: 0, reason: "OUT OF FUEL - DRIFTING ETERNALLY" });
        return;
      }
      if (state.zombies >= state.maxZombies) {
        manageMiningAudio(false, 0);
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
      window.removeEventListener('mousemove', handleMouseMove);
      
      // Audio Cleanup
      if (miningAudioRef.current.osc) {
         try { miningAudioRef.current.osc.stop(); } catch(e){}
         try { miningAudioRef.current.lfo?.stop(); } catch(e){}
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
      }

      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [saveData, difficulty, onGameOver, onSuccess]);

  return (
    <div className="relative w-full h-full">
      <Starfield speedMultiplier={gameState.current?.isBoosting ? 2 : 0.5} />
      <canvas 
        ref={canvasRef} 
        className="block cursor-crosshair"
        onContextMenu={(e) => e.preventDefault()}
      />
      <HUD {...hudState} />
    </div>
  );
};
