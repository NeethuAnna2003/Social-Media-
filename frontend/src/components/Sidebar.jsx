import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  NewspaperIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'News Feed', path: '/news-dashboard', icon: NewspaperIcon },
    { name: 'Friends', path: '/friends', icon: UserGroupIcon },
    { name: 'Saved', path: '/saved', icon: BookmarkIcon },
    { name: 'Word Filters', path: '/settings/word-filters', icon: ShieldCheckIcon },
    { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="hidden md:block w-64 bg-white rounded-lg shadow p-4 h-fit sticky top-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Icon className="h-6 w-6 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
