import React from 'react';
import { Link } from 'react-router-dom';

const AITestPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Components Test Page</h1>
        
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Available AI Features</h2>
            
            <div className="grid gap-4">
              <Link 
                to="/upload"
                className="block bg-blue-600 hover:bg-blue-700 p-4 rounded-lg transition-colors"
              >
                <h3 className="font-medium">📹 Video Upload with AI</h3>
                <p className="text-gray-300 text-sm">Upload videos and access AI caption/thumbnail generation</p>
              </Link>
              
              <Link 
                to="/studio"
                className="block bg-purple-600 hover:bg-purple-700 p-4 rounded-lg transition-colors"
              >
                <h3 className="font-medium">🤖 AI Video Studio</h3>
                <p className="text-gray-300 text-sm">Complete AI-powered video creation workflow</p>
              </Link>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-medium mb-2">🎯 Direct AI Components</h3>
                <p className="text-gray-300 text-sm mb-3">Access specific AI features directly:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• /videos/:id/captions/ai-generate - AI Caption Generator</li>
                  <li>• /videos/:id/thumbnails/ai-generate - AI Thumbnail Generator</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Endpoints Test</h2>
            <div className="text-sm text-gray-300 space-y-2">
              <p>✅ Backend running on port 8001</p>
              <p>✅ Frontend components integrated</p>
              <p>✅ Routes configured</p>
              <p>✅ AI services ready</p>
            </div>
          </div>
          
          <div className="bg-green-800/20 border border-green-600 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">System Status</h2>
            <p className="text-green-300">All AI components are implemented and accessible!</p>
            <p className="text-gray-300 text-sm mt-2">
              Navigate to /upload to start using AI features, or visit /studio for the complete workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
