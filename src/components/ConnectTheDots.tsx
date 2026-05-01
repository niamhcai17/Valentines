
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './ConnectTheDots.css';

interface Point {
    x: number;
    y: number;
    label?: string; // Optional text near the dot
}

// Points based on the reference image to form "I love you" (Original "good" version)
const points: Point[] = [
    { x: 50, y: 350, label: "If" }, //1
    { x: 80, y: 250, label: "you" }, //2
    { x: 95, y: 350, label: "connect" }, //3
    { x: 180, y: 180 }, // connecting curve //4
    { x: 160, y: 120, label: "these" }, //5
    { x: 190, y: 350, label: "dots" }, //6
    { x: 250, y: 290 }, // connecting curve //7
    { x: 260, y: 350, label: "slowly" }, //8
    { x: 275, y: 290, label: "you" }, //9
    { x: 330, y: 250, label: "will" }, //10
    { x: 370, y: 350, label: "Know" }, //11
    { x: 410, y: 270, label: "how" }, //12
    { x: 440, y: 290, label: "much" }, //13
    { x: 470, y: 275, label: "my" }, //14
    { x: 460, y: 240 }, // bottom curve //15
    { x: 440, y: 290 }, //16
    { x: 500, y: 350, label: "♥" }, // Heart top //17
    { x: 530, y: 250 }, // going up to heart //18
    { x: 590, y: 320, label: "it" }, //19
    { x: 630, y: 250, label: "means" }, //20
    { x: 620, y: 430 }, // connector //21
    { x: 600, y: 400 }, //22
    { x: 695, y: 280, label: "in" }, //23
    { x: 710, y: 350, label: "moments" }, //24
    { x: 725, y: 280 }, // going down //25
    { x: 790, y: 280, label: "Love" }, //26
    { x: 800, y: 350 }, //27
    { x: 830, y: 350 }, // curve up //28
    { x: 840, y: 280, label: "You" } //29
];

// Manual overrides for specific segments (0-indexed: segment i connects point i → i+1)
const segmentOverrides: Record<number, string> = {
    // 1→2 (idx 0→1): i cursiva, subida con curva hacia adentro
    0: `M 50,350 C 70,300 80,270 80,250`,
    // 2→3 (idx 1→2): i cursiva, bajada con curva hacia adentro
    1: `M 80,250 C 80,270 70,310 95,350`,
    // 7→8 (idx 6→7): left half of O, curve down
    6: `M 250,290 C 240,325 250,350 260,350`,
    // 8→9 (idx 7→8): right half of O, curve up
    7: `M 260,350 C 270,350 275,325 275,290`,
    // 9→10 (idx 8→9): straight line ascending
    8: `M 275,290 L 330,250`,
    // 12→13 (idx 11→12): straight line
    11: `M 410,270 L 440,290`,
    // 23→24 (idx 22→23): left half of O, curve down
    22: `M 695,280 C 685,320 695,350 710,350`,
    // 24→25 (idx 23→24): right half of O, curve back up
    23: `M 710,350 C 725,350 735,320 725,280`,
    // 25→26 (idx 24→25): straight line
    24: `M 725,280 L 790,280`,
};

// Precompute smooth curve segments using Catmull-Rom → Cubic Bezier conversion
const smoothSegments: string[] = points.slice(0, -1).map((_, i) => {
    if (segmentOverrides[i]) return segmentOverrides[i];

    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    return `M ${p1.x},${p1.y} C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
});

const ConnectTheDots: React.FC = () => {
    const [nextDotIndex, setNextDotIndex] = useState(0);
    const [completedPaths, setCompletedPaths] = useState<string[]>([]);
    const [currentPathPoints, setCurrentPathPoints] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const nextDotRef = useRef(0);
    const [isPortrait, setIsPortrait] = useState(false);

    const svgRef = useRef<SVGSVGElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleStart = () => {
        setHasStarted(true);
        setIsPlaying(true);
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.volume = 1;
                audioRef.current.play().catch(e => console.log("Play failed", e));
            }
        }, 0);
    };

    useEffect(() => {
        // No autoplay on mount, handled by handleStart
    }, []);

    useEffect(() => {
        const checkOrientation = () => {
            const portrait = window.innerHeight > window.innerWidth;
            const smallDevice = Math.min(window.innerWidth, window.innerHeight) < 768;
            setIsPortrait(portrait && smallDevice);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    const [volume, setVolume] = useState(100);

    const handleVolume = (level: number) => {
        setVolume(level);
        if (audioRef.current) {
            audioRef.current.volume = level / 100;
            if (level === 0) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else if (audioRef.current.paused) {
                audioRef.current.play().catch(e => console.log("Play failed", e));
                setIsPlaying(true);
            }
        }
    };


    // Helper to get SVG coordinates transformed to SVG space
    const getMousePos = (e: React.MouseEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };

        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };

        return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (completed) return;

        const pos = getMousePos(e);

        setIsDrawing(true);
        setCurrentPathPoints([{ x: pos.x, y: pos.y }]);

        if (nextDotRef.current === 0) {
            const startDot = points[0];
            const dist = Math.hypot(pos.x - startDot.x, pos.y - startDot.y);
            if (dist < 30) {
                nextDotRef.current = 1;
                setNextDotIndex(1);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (completed || !isDrawing) return;

        e.preventDefault();

        const pos = getMousePos(e);

        setCurrentPathPoints(prev => [...prev, { x: pos.x, y: pos.y }]);

        if (nextDotRef.current > 0) {
            const target = points[nextDotRef.current];
            const dist = Math.hypot(pos.x - target.x, pos.y - target.y);

            if (dist < 15) {
                handleDotReached(pos);
            }
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setCurrentPathPoints([]);
    };

    // Touch event handlers for mobile
    const getTouchPos = (e: React.TouchEvent) => {
        if (!svgRef.current || !e.touches.length) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        const touch = e.touches[0];
        return {
            x: (touch.clientX - CTM.e) / CTM.a,
            y: (touch.clientY - CTM.f) / CTM.d
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        if (completed) return;
        const pos = getTouchPos(e);
        setIsDrawing(true);
        setCurrentPathPoints([{ x: pos.x, y: pos.y }]);
        if (nextDotRef.current === 0) {
            const startDot = points[0];
            const dist = Math.hypot(pos.x - startDot.x, pos.y - startDot.y);
            if (dist < 35) {
                nextDotRef.current = 1;
                setNextDotIndex(1);
            }
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (completed || !isDrawing) return;
        const pos = getTouchPos(e);
        setCurrentPathPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
        if (nextDotRef.current > 0) {
            const target = points[nextDotRef.current];
            const dist = Math.hypot(pos.x - target.x, pos.y - target.y);
            if (dist < 20) {
                handleDotReached(pos);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(false);
        setCurrentPathPoints([]);
    };

    const handleDotReached = (_pos: { x: number, y: number }) => {
        const currentIdx = nextDotRef.current;
        const segmentIndex = currentIdx - 1;
        if (segmentIndex >= 0 && segmentIndex < smoothSegments.length) {
            setCompletedPaths(prev => [...prev, smoothSegments[segmentIndex]]);
        }

        const target = points[currentIdx];
        setCurrentPathPoints([{ x: target.x, y: target.y }]);

        if (currentIdx === points.length - 1) {
            setCompleted(true);
            setIsDrawing(false);
            triggerCelebration();
        } else {
            nextDotRef.current = currentIdx + 1;
            setNextDotIndex(currentIdx + 1);
        }
    };


    const triggerCelebration = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const rotateOverlay = isPortrait ? (
        <div className="rotate-overlay">
            <div className="rotate-animation">
                <div className="rotate-phone-icon">
                    <div className="phone-screen-inner"></div>
                    <div className="phone-notch"></div>
                </div>
                <svg className="rotate-arrow-svg" viewBox="0 0 80 80" width="60" height="60">
                    <path d="M 50 12 A 32 32 0 0 1 68 50" fill="none" stroke="#d81b60" strokeWidth="2.5" strokeLinecap="round" />
                    <polygon points="64,53 72,48 68,57" fill="#d81b60" />
                </svg>
            </div>
            <p className="rotate-text">Gira tu pantalla</p>
            <p className="rotate-subtext">para una mejor experiencia</p>
        </div>
    ) : null;

    if (!hasStarted) {
        return (
            <>
                {rotateOverlay}
                <div className="start-screen" onClick={handleStart}>
                    <div className="start-heart">❤️</div>
                    <div className="start-text">Tap to Open<br />My Love</div>
                </div>
            </>
        );
    }


    return (
        <>
            {rotateOverlay}
            <div className="connect-game">
                {/* Audio Element */}
                <audio ref={audioRef} src="/lauv_all_4_nothing.mp3" loop autoPlay />

                <div className="volume-control">
                    <svg className="volume-icon" viewBox="0 0 24 24" width="18" height="18">
                        <path d="M9 3L4 8H1v8h3l5 5V3zm10.5 9c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.73 2.5-2.25 2.5-4.02z" fill="#880e4f"/>
                    </svg>
                    <div className="volume-bars">
                        {[25, 50, 75, 100].map(level => (
                            <button
                                key={level}
                                className={`volume-bar ${volume >= level ? 'active' : ''}`}
                                onClick={() => handleVolume(volume === level && level === 25 ? 0 : level)}
                                style={{ height: `${level * 0.6 + 40}%` }}
                            />
                        ))}
                    </div>
                </div>

                <h3>Draw to connect the dots...</h3>
                <div className="canvas-wrapper">
                    <svg
                        ref={svgRef}
                        width="100%"
                        height="100%"
                        viewBox="0 0 900 500"
                        preserveAspectRatio="xMidYMid meet"
                        className="dots-svg"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Completed Paths */}
                        {completedPaths.map((pathData, i) => (
                            <path key={i} d={pathData} stroke="#d81b60" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}

                        {/* Guiding line from last reached dot to current mouse position */}
                        {isDrawing && currentPathPoints.length > 0 && nextDotIndex > 0 && (
                            <line
                                x1={points[nextDotIndex - 1].x}
                                y1={points[nextDotIndex - 1].y}
                                x2={currentPathPoints[currentPathPoints.length - 1].x}
                                y2={currentPathPoints[currentPathPoints.length - 1].y}
                                stroke="#d81b60"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                opacity={0.4}
                                strokeLinecap="round"
                            />
                        )}

                        {/* Dots */}
                        {points.map((point, index) => {
                            const isNext = index === nextDotIndex;
                            const isVisited = index < nextDotIndex;

                            return (
                                <g key={index}>
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r={isNext ? 6 : 4}
                                        fill={isVisited ? "#d81b60" : (isNext ? "#ff80ab" : "#ccc")}
                                        className={`dot ${isNext ? 'active-dot' : ''}`}
                                    />

                                    {/* Numbers */}
                                    <text
                                        x={point.x}
                                        y={point.y - 12}
                                        textAnchor="middle"
                                        fill="#880e4f"
                                        fontSize="10"
                                        style={{ opacity: 0.8 }}
                                    >
                                        {index + 1}
                                    </text>

                                    {/* Poem Words */}
                                    {point.label && (
                                        <text
                                            x={point.x}
                                            y={point.y + 18}
                                            textAnchor="middle"
                                            fill="#795548"
                                            fontSize="9"
                                            fontStyle="italic"
                                            fontFamily="serif"
                                        >
                                            {point.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {completed && (
                        <div className="final-message">
                            {!accepted ? (
                                <>
                                    <h1 className="pixel-text">Will you be my<br />valentine?</h1>
                                    <div className="proposal-buttons">
                                        <button
                                            className="pixel-btn yes-btn"
                                            onClick={() => {
                                                setAccepted(true);
                                                triggerCelebration();
                                            }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            className="pixel-btn no-btn"
                                            disabled
                                            style={{ position: 'relative' }}
                                            onMouseEnter={() => {
                                                // Optional: fun little run away or just static disabled
                                                // For now just disabled per strict instruction "solo se pueda presionar yes"
                                            }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="final-answer">
                                    <p>Yeah!</p>
                                    <p>I know you love me ❤️</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ConnectTheDots;
