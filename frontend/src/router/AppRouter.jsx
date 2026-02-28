import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { NotificationProvider } from '../context/NotificationContext';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Feed from '../pages/Feed';
import Profile from '../pages/Profile';
import UserPage from '../pages/UserPage';
import TrendingNews from '../pages/TrendingNews';
import HashtagFeed from '../pages/HashtagFeed';
import Messages from '../pages/Messages';
import Search from '../pages/Search';
import NewsDetail from '../pages/NewsDetail';
import AIVideoStudio from '../pages/AIVideoStudio';

import ConnectCall from '../pages/ConnectCall';
import Dashboard from '../pages/Dashboard';
import NewsDashboard from '../pages/NewsDashboard';
import NewsArticleDetail from '../pages/NewsArticleDetail';

// AI Components
import VideoUploadWithAI from '../components/VideoUploadWithAI';
import AICaptionGenerator from '../components/AICaptionGenerator';
import AIThumbnailGenerator from '../components/AIThumbnailGenerator';
import AITestPage from '../pages/AITestPage';

// Admin Components
import AdminRoute from '../components/admin/AdminRoute';


import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminPosts from '../pages/admin/AdminPosts';
import AdminReports from '../pages/admin/AdminReports';
import AdminAnalytics from '../pages/admin/AdminAnalytics';

// Sensitive Word Filter Components
import SensitiveWordFilterManager from '../components/SensitiveWordFilterManager';
import AdminWordFilterReview from '../components/admin/AdminWordFilterReview';



const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : null;
};

const PublicRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <Outlet />;
};

const AppRouter = () => {
  return (
    <div className="h-screen bg-gray-50 overflow-y-auto">
      <NotificationProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          </Route>

          {/* Private User Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Feed />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:username" element={<UserPage />} />
            <Route path="/hashtags/:tag" element={<HashtagFeed />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:threadId" element={<Messages />} />
            <Route path="/studio" element={<AIVideoStudio />} />
            <Route path="/upload" element={<VideoUploadWithAI />} />
            <Route path="/ai-test" element={<AITestPage />} />
            <Route path="/videos/:videoId/captions/ai-generate" element={<AICaptionGenerator />} />
            <Route path="/videos/:videoId/thumbnails/ai-generate" element={<AIThumbnailGenerator />} />
            <Route path="/connect/:userId" element={<ConnectCall />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news-dashboard" element={<NewsDashboard />} />
            <Route path="/news-dashboard/:articleId" element={<NewsArticleDetail />} />

            {/* Sensitive Word Filter Settings */}
            <Route path="/settings/word-filters" element={<SensitiveWordFilterManager />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin-dashboard" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="reported" element={<AdminReports />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="word-filters" element={<AdminWordFilterReview />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationProvider>
    </div>
  );
};

export default AppRouter;
