import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const StoriesCarousel = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch stories
    const fetchStories = async () => {
      try {
        // Replace with actual API call
        // const response = await api.get('/stories/');
        setTimeout(() => {
          setStories([
            { 
              id: 1, 
              username: 'your_story', 
              avatar: user?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg', 
              hasUnseen: false, 
              isYou: true 
            },
            { 
              id: 2, 
              username: 'jane_doe', 
              avatar: 'https://randomuser.me/api/portraits/women/1.jpg', 
              hasUnseen: true 
            },
            { 
              id: 3, 
              username: 'alex_smith', 
              avatar: 'https://randomuser.me/api/portraits/men/2.jpg', 
              hasUnseen: true 
            },
            { 
              id: 4, 
              username: 'sarah_williams', 
              avatar: 'https://randomuser.me/api/portraits/women/2.jpg', 
              hasUnseen: true 
            },
            { 
              id: 5, 
              username: 'mike_johnson', 
              avatar: 'https://randomuser.me/api/portraits/men/3.jpg', 
              hasUnseen: true 
            },
          ]);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching stories:', error);
        setLoading(false);
      }
    };

    fetchStories();
  }, [user]);

  if (loading) {
    return (
      <div className="flex space-x-4 overflow-hidden p-4 bg-white rounded-lg shadow animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-gray-200"></div>
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 overflow-hidden">
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div 
              className={`p-0.5 rounded-full ${
                story.hasUnseen 
                  ? 'bg-gradient-to-tr from-yellow-400 to-pink-500' 
                  : 'bg-gray-200'
              }`}
            >
              <div className="p-0.5 bg-white rounded-full">
                <img
                  src={story.avatar}
                  alt={story.username}
                  className={`h-16 w-16 rounded-full border-2 border-white ${
                    story.isYou ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                />
              </div>
            </div>
            <span className="text-xs truncate w-16 text-center">
              {story.isYou ? 'Your Story' : story.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesCarousel;
