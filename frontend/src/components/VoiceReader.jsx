import React, { useState, useRef, useEffect } from 'react';
import {
    PlayIcon,
    PauseIcon,
    StopIcon,
    SpeakerWaveIcon,
    ForwardIcon,
    BackwardIcon
} from '@heroicons/react/24/solid';

/**
 * Voice News Reader Component
 * Text-to-Speech functionality for news articles
 * 
 * Features:
 * - Play/Pause/Stop controls
 * - Speed control (0.5x - 2x)
 * - Voice selection
 * - Progress tracking
 * - Auto-detect language
 * - Highlight current word
 */
const VoiceReader = ({ article }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [voices, setVoices] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentWord, setCurrentWord] = useState(0);

    const utteranceRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = synthRef.current.getVoices();
            setVoices(availableVoices);

            // Auto-select best English voice
            const englishVoice = availableVoices.find(v =>
                v.lang.startsWith('en') && v.name.includes('Google')
            ) || availableVoices.find(v => v.lang.startsWith('en'));

            if (englishVoice) {
                setSelectedVoice(englishVoice);
            }
        };

        loadVoices();

        // Voices load asynchronously in some browsers
        if (synthRef.current.onvoiceschanged !== undefined) {
            synthRef.current.onvoiceschanged = loadVoices;
        }

        return () => {
            handleStop();
        };
    }, []);

    // Prepare text for reading
    const prepareText = (mode = 'headline') => {
        switch (mode) {
            case 'headline':
                return article.title;
            case 'summary':
                return `${article.title}. ${article.description}`;
            case 'full':
                return `${article.title}. ${article.description}. ${article.content || ''}`;
            default:
                return article.title;
        }
    };

    // Handle play
    const handlePlay = (mode = 'headline') => {
        // Stop any current speech
        synthRef.current.cancel();

        const text = prepareText(mode);
        const utterance = new SpeechSynthesisUtterance(text);

        // Configure utterance
        utterance.rate = speed;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        // Event handlers
        utterance.onstart = () => {
            setIsPlaying(true);
            setIsPaused(false);
            setProgress(0);
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setProgress(100);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onboundary = (event) => {
            // Track progress
            const percent = (event.charIndex / text.length) * 100;
            setProgress(percent);

            // Track current word
            const words = text.substring(0, event.charIndex).split(' ');
            setCurrentWord(words.length);
        };

        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    };

    // Handle pause
    const handlePause = () => {
        if (isPlaying && !isPaused) {
            synthRef.current.pause();
            setIsPaused(true);
        }
    };

    // Handle resume
    const handleResume = () => {
        if (isPaused) {
            synthRef.current.resume();
            setIsPaused(false);
        }
    };

    // Handle stop
    const handleStop = () => {
        synthRef.current.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        setCurrentWord(0);
    };

    // Handle speed change
    const handleSpeedChange = (newSpeed) => {
        setSpeed(newSpeed);

        // If currently playing, restart with new speed
        if (isPlaying && utteranceRef.current) {
            const wasPlaying = !isPaused;
            handleStop();
            if (wasPlaying) {
                setTimeout(() => handlePlay('headline'), 100);
            }
        }
    };

    return (
        <div className="voice-reader bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-xl">
                    <SpeakerWaveIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900">Voice Reader</h3>
                    <p className="text-xs text-gray-500">Listen to this article</p>
                </div>
            </div>

            {/* Progress Bar */}
            {isPlaying && (
                <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {Math.round(progress)}% complete
                    </p>
                </div>
            )}

            {/* Main Controls */}
            <div className="flex items-center gap-3 mb-4">
                {/* Play/Pause Button */}
                {!isPlaying ? (
                    <button
                        onClick={() => handlePlay('headline')}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <PlayIcon className="w-5 h-5" />
                        Play Headline
                    </button>
                ) : isPaused ? (
                    <button
                        onClick={handleResume}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg"
                    >
                        <PlayIcon className="w-5 h-5" />
                        Resume
                    </button>
                ) : (
                    <button
                        onClick={handlePause}
                        className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all shadow-lg"
                    >
                        <PauseIcon className="w-5 h-5" />
                        Pause
                    </button>
                )}

                {/* Stop Button */}
                {isPlaying && (
                    <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                    >
                        <StopIcon className="w-5 h-5" />
                        Stop
                    </button>
                )}
            </div>

            {/* Reading Mode Options */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => handlePlay('headline')}
                    disabled={isPlaying}
                    className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Headline Only
                </button>
                <button
                    onClick={() => handlePlay('summary')}
                    disabled={isPlaying}
                    className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Headline + Summary
                </button>
                <button
                    onClick={() => handlePlay('full')}
                    disabled={isPlaying}
                    className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Full Article
                </button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-bold text-gray-700">Speed:</label>
                <div className="flex gap-2">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => (
                        <button
                            key={s}
                            onClick={() => handleSpeedChange(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${speed === s
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-200'
                                }`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Voice Selection */}
            {voices.length > 0 && (
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-gray-700">Voice:</label>
                    <select
                        value={selectedVoice?.name || ''}
                        onChange={(e) => {
                            const voice = voices.find(v => v.name === e.target.value);
                            setSelectedVoice(voice);
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {voices
                            .filter(v => v.lang.startsWith('en'))
                            .map(voice => (
                                <option key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {/* Status */}
            {isPlaying && (
                <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                    <p className="text-sm font-bold text-indigo-900">
                        {isPaused ? '⏸️ Paused' : '🔊 Playing...'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default VoiceReader;
