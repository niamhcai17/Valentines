
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
    { x: 120, y: 350, label: "connect" }, //3
    { x: 180, y: 180 }, // connecting curve //4
    { x: 160, y: 120, label: "these" }, //5
    { x: 190, y: 350, label: "dots" }, //6 
    { x: 240, y: 250 }, // connecting curve //7
    { x: 260, y: 350, label: "slowly" }, //8
    { x: 290, y: 250, label: "you" }, //9
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
    { x: 680, y: 280, label: "in" }, //23
    { x: 710, y: 350, label: "moments" }, //24
    { x: 740, y: 280 }, // going down //25
    { x: 790, y: 280, label: "Love" }, //26
    { x: 800, y: 350 }, //27
    { x: 830, y: 350 }, // curve up //28
    { x: 840, y: 280, label: "You" } //29
];

const ConnectTheDots: React.FC = () => {
    const [nextDotIndex, setNextDotIndex] = useState(0);
    const [completedPaths, setCompletedPaths] = useState<string[]>([]);
    const [currentPathPoints, setCurrentPathPoints] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const svgRef = useRef<SVGSVGElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Attempt autoplay on mount
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            const playPromise = audioRef.current.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                    })
                    .catch(e => {
                        console.log("Autoplay prevented by browser:", e);
                        setIsPlaying(false);
                    });
            }
        }

        // Add distinct click listener to document to catch any first interaction
        const enableAudio = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.log("Still prevented:", e));
            }
        };

        document.addEventListener('click', enableAudio);
        return () => document.removeEventListener('click', enableAudio);
    }, []);

    const toggleMusic = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
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
        // Try to play audio on first interaction if not playing
        if (audioRef.current && !isPlaying) {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log("Audio play failed:", e));
        }

        if (completed) return;

        const pos = getMousePos(e);

        setIsDrawing(true);
        setCurrentPathPoints([{ x: pos.x, y: pos.y }]);

        if (nextDotIndex === 0) {
            // Check if near start dot to activate sequence
            const startDot = points[0];
            const dist = Math.hypot(pos.x - startDot.x, pos.y - startDot.y);
            if (dist < 30) {
                setNextDotIndex(1);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (completed || !isDrawing) return;

        const pos = getMousePos(e);

        // Add point to current path
        setCurrentPathPoints(prev => [...prev, { x: pos.x, y: pos.y }]);

        // Check against target
        if (nextDotIndex > 0) {
            const target = points[nextDotIndex];
            const dist = Math.hypot(pos.x - target.x, pos.y - target.y);

            if (dist < 15) {
                handleDotReached(pos);
            }
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        // If not connected, we keep the scribble or clear it? Keeping it for "sketch" feel if desired, 
        // but clearing it feels cleaner if connection failed.
        // Let's clear uncommited paths to avoid mess.
        setCurrentPathPoints([]);
    };

    const handleDotReached = (pos: { x: number, y: number }) => {
        // Commit trace
        const newPath = pointsToPath([...currentPathPoints, { x: points[nextDotIndex].x, y: points[nextDotIndex].y }]);
        setCompletedPaths(prev => [...prev, newPath]);

        // Start new segment from current pos
        setCurrentPathPoints([{ x: pos.x, y: pos.y }]);

        // Advance
        if (nextDotIndex === points.length - 1) {
            setCompleted(true);
            setIsDrawing(false);
            triggerCelebration();
        } else {
            setNextDotIndex(prev => prev + 1);
        }
    };

    const pointsToPath = (pts: Point[]) => {
        if (pts.length < 2) return "";
        return `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
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

    return (
        <div className="connect-game">
            {/* Audio Element */}
            <audio ref={audioRef} src="/lauv_all_4_nothing.mp3" loop autoPlay />

            <div className="music-control">
                <button className="music-btn" onClick={toggleMusic} title="Play/Pause Music">
                    {isPlaying ? '🔊' : '🔇'}
                </button>
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
                >
                    {/* Completed Paths */}
                    {completedPaths.map((pathData, i) => (
                        <path key={i} d={pathData} stroke="#d81b60" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ))}

                    {/* Current Path */}
                    {currentPathPoints.length > 0 && (
                        <path
                            d={pointsToPath(currentPathPoints)}
                            stroke="#d81b60"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: 0.7 }}
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
                                        onMouseEnter={(e) => {
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
    );
};

export default ConnectTheDots;
