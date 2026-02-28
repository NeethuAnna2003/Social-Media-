import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import loginBg from '../assets/login_bg.mp4';


const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validations, setValidations] = useState({
    username: null, // null = initial, true = valid, false = invalid
    email: null,
    password: null,
    confirmPassword: null
  });

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    number: false,
    special: false,
    uppercase: false
  });

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Real-time Validation Logic
  useEffect(() => {
    const { username, email, password, confirmPassword } = formData;

    // Username: Min 3 chars
    const isUsernameValid = username.length >= 3;

    // Email: Simple Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);

    // Password Criteria
    const criteria = {
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      uppercase: /[A-Z]/.test(password)
    };
    setPasswordCriteria(criteria);
    const isPasswordValid = Object.values(criteria).every(Boolean);

    // Confirm Password
    const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

    setValidations({
      username: username ? isUsernameValid : null,
      email: email ? isEmailValid : null,
      password: password ? isPasswordValid : null,
      confirmPassword: confirmPassword ? isConfirmValid : null
    });

  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final Validation Check
    if (!validations.username || !validations.email || !validations.password || !validations.confirmPassword) {
      toast.error('Please fix the errors in the form before submitting.');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        navigate('/login', { state: { registered: true } });
      } else {
        toast.error(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (status) => {
    const base = "w-full pl-4 pr-10 py-3 rounded-xl border outline-none transition-all duration-300 backdrop-blur-sm ";
    if (status === null) return base + "border-gray-200 bg-white/50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 text-gray-900 placeholder-gray-400";
    if (status === true) return base + "border-green-400 bg-green-50/50 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 text-gray-900";
    return base + "border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-gray-900";
  };

  const ValidationIcon = ({ status }) => {
    if (status === null) return null;
    if (status === true) return <svg className="w-5 h-5 text-green-500 animate-bounce-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
    return <svg className="w-5 h-5 text-red-500 animate-shake" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
  };

  return (
    <div className="min-h-screen flex font-sans">
      <Toaster position="top-center" toastOptions={{ style: { backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.8)' } }} />

      {/* Left Side - Video Background */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/20 z-10"></div>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={loginBg} type="video/mp4" />
        </video>

        {/* Branding Overlay */}
        <div className="absolute bottom-0 left-0 p-12 z-20 text-white">
          <h1 className="text-4xl font-bold mb-4">Join the Community</h1>
          <p className="text-lg opacity-90 max-w-md">
            Connect, share, and engage with people who share your interests.
          </p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-xl rotate-3 flex items-center justify-center shadow-md mb-3">
              <svg className="w-6 h-6 text-white -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Create Account
            </h2>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              Start your journey with us today
            </p>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>

            {/* Username */}
            <div className="relative group">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Username</label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  required
                  className={getInputClass(validations.username).replace('py-3', 'py-2.5')}
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ValidationIcon status={validations.username} />
                </div>
              </div>
              <p className={`text-[10px] mt-0.5 ml-1 transition-all duration-300 ${validations.username === false ? 'text-red-500 h-3' : 'h-0 opacity-0 overflow-hidden'}`}>
                Must be at least 3 characters
              </p>
            </div>

            {/* Email */}
            <div className="relative group">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Email</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  required
                  className={getInputClass(validations.email).replace('py-3', 'py-2.5')}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ValidationIcon status={validations.email} />
                </div>
              </div>
              <p className={`text-[10px] mt-0.5 ml-1 transition-all duration-300 ${validations.email === false ? 'text-red-500 h-3' : 'h-0 opacity-0 overflow-hidden'}`}>
                Invalid email
              </p>
            </div>

            {/* Password */}
            <div className="relative group">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  className={getInputClass(validations.password).replace('py-3', 'py-2.5')}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ValidationIcon status={validations.password} />
                </div>
              </div>

              {/* Visual Password Criteria */}
              <div className={`mt-2 grid grid-cols-2 gap-1 text-[10px] font-medium transition-all duration-300 overflow-hidden ${formData.password ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                {[
                  { label: "8+ Chars", pass: passwordCriteria.length },
                  { label: "Number", pass: passwordCriteria.number },
                  { label: "Special", pass: passwordCriteria.special },
                  { label: "Uppercase", pass: passwordCriteria.uppercase },
                ].map((c, i) => (
                  <div key={i} className={`flex items-center gap-1 ${c.pass ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${c.pass ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative group">
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirm Password</label>
              </div>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  className={getInputClass(validations.confirmPassword).replace('py-3', 'py-2.5')}
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ValidationIcon status={validations.confirmPassword} />
                </div>
              </div>
              <p className={`text-[10px] mt-0.5 ml-1 transition-all duration-300 ${validations.confirmPassword === false ? 'text-red-500 h-3' : 'h-0 opacity-0 overflow-hidden'}`}>
                Dont match
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !Object.values(validations).every(v => v === true)}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gray-900 hover:bg-black shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 transform active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <>
                    Create Account
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline decoration-2 underline-offset-4 transition-all">
                  Sign in here
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;