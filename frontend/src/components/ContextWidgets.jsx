import React, { useState, useEffect } from 'react';
import {
    MapPinIcon,
    SunIcon,
    BellIcon,
    ChartBarIcon,
    FireIcon
} from '@heroicons/react/24/outline';

/**
 * Personal Context Widgets - Top Bar
 * Displays user location, weather, reminders, sports scores, and stock market
 */
const ContextWidgets = ({ userName = 'User' }) => {
    const [weather, setWeather] = useState(null);
    const [location, setLocation] = useState('Loading...');
    const [stockData, setStockData] = useState(null);
    const [reminder, setReminder] = useState(null);

    useEffect(() => {
        fetchWeatherData();
        fetchStockData();
        setSmartReminder();

        // Auto-refresh every 5 minutes
        const interval = setInterval(() => {
            fetchWeatherData();
            fetchStockData();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // Fetch weather data
    const fetchWeatherData = async () => {
        try {
            // Try to get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;

                        // Using OpenWeatherMap API (you'll need to add API key to .env)
                        const apiKey = import.meta.env.VITE_WEATHER_API_KEY || 'demo';
                        const response = await fetch(
                            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
                        );

                        if (response.ok) {
                            const data = await response.json();
                            setWeather({
                                temp: Math.round(data.main.temp),
                                condition: data.weather[0].main,
                                icon: data.weather[0].icon
                            });
                            setLocation(data.name);
                        } else {
                            setMockWeather();
                        }
                    },
                    () => {
                        setMockWeather();
                    }
                );
            } else {
                setMockWeather();
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            setMockWeather();
        }
    };

    const setMockWeather = () => {
        setWeather({
            temp: 24,
            condition: 'Clear',
            icon: '01d'
        });
        setLocation('Your City');
    };

    // Fetch stock market data
    const fetchStockData = async () => {
        try {
            // Mock stock data - in production, use a real API like Alpha Vantage
            setStockData({
                index: 'S&P 500',
                value: '4,783.45',
                change: '+0.8%',
                trend: 'up'
            });
        } catch (error) {
            console.error('Stock fetch error:', error);
        }
    };

    // Set smart reminder based on time
    const setSmartReminder = () => {
        const hour = new Date().getHours();

        if (hour >= 9 && hour < 12) {
            setReminder({ text: 'Stay hydrated! 💧', type: 'health' });
        } else if (hour >= 12 && hour < 14) {
            setReminder({ text: 'Time for lunch break 🍽️', type: 'break' });
        } else if (hour >= 14 && hour < 17) {
            setReminder({ text: 'Take a 5-min break 🧘', type: 'wellness' });
        } else if (hour >= 17 && hour < 20) {
            setReminder({ text: 'Wrap up your day 🌅', type: 'productivity' });
        } else {
            setReminder({ text: 'Good vibes only ✨', type: 'motivation' });
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Location & Weather Widget */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-gray-700">{location}</span>
                </div>

                {weather && (
                    <>
                        <div className="w-px h-6 bg-blue-200" />
                        <div className="flex items-center gap-2">
                            <SunIcon className="w-5 h-5 text-orange-500 group-hover:rotate-90 transition-transform duration-500" />
                            <span className="text-lg font-black text-gray-900">{weather.temp}°C</span>
                        </div>
                    </>
                )}
            </div>

            {/* Smart Reminder Widget */}
            {reminder && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow group">
                    <BellIcon className="w-4 h-4 text-purple-600 group-hover:animate-bounce" />
                    <span className="text-sm font-bold text-gray-700">{reminder.text}</span>
                </div>
            )}

            {/* Stock Market Widget */}
            {stockData && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow group">
                    <ChartBarIcon className="w-4 h-4 text-emerald-600" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 uppercase">{stockData.index}</span>
                        <span className="text-sm font-black text-gray-900">{stockData.value}</span>
                        <span className={`text-xs font-black ${stockData.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {stockData.change}
                        </span>
                    </div>
                </div>
            )}

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100 shadow-sm">
                <div className="relative">
                    <FireIcon className="w-4 h-4 text-red-600" />
                    <div className="absolute inset-0 animate-ping">
                        <FireIcon className="w-4 h-4 text-red-400 opacity-75" />
                    </div>
                </div>
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Live Feed
                </span>
            </div>
        </div>
    );
};

export default ContextWidgets;
