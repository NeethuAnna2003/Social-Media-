import React from 'react';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router/AppRouter';


function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AppRouter />

    </>
  );
}

export default App;
