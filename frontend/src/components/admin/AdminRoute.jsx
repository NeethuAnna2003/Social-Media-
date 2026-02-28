import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = () => {
    const { user, loading, fetchUser } = useAuth();

    useEffect(() => {
        if (user && typeof user.is_admin === 'undefined') {
            fetchUser();
        }
    }, [user, fetchUser]);

    if (loading) return <div>Loading...</div>;

    // Wait for permission check if data is stale
    if (user && typeof user.is_admin === 'undefined') {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>;
    }

    // Check if user is admin or superuser
    if (user && (user.is_admin || user.is_superuser)) {
        return <Outlet />;
    }

    return <Navigate to="/" />;
};

export default AdminRoute;
