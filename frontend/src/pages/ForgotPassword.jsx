import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { toast, Toaster } from 'react-hot-toast';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/accounts/password-reset/', { email });
            setSubmitted(true);
            toast.success('Reset link sent!');
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.error || err.response?.data?.email?.[0] || 'Something went wrong. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <Toaster position="top-right" />

            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-white/50 backdrop-blur-xl">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Enter your email to receive a reset link
                    </p>
                </div>

                {!submitted ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1 ml-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full pl-4 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white 
                bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 
                transform transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
                disabled:opacity-70 disabled:cursor-not-allowed
              `}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="text-center mt-4">
                            <Link to="/login" className="text-sm font-medium text-purple-600 hover:text-purple-500">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                ) : (
                    <div className="mt-8 text-center space-y-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-gray-600">
                            If an account exists with <strong>{email}</strong>, a reset link has been sent.
                            Please check your inbox (and spam folder).
                        </p>
                        <p className="text-xs text-gray-400">
                            Link expires in 15 minutes.
                        </p>
                        <div className="pt-4">
                            <Link to="/login" className="font-bold text-purple-600 hover:text-purple-700">
                                Return to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
