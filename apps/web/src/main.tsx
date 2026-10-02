import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LandingPage } from './LandingPage';
import './styles.css';

function Root() {
  const params = new URLSearchParams(window.location.search);
  const isApp = params.has('app');

  const openWebApp = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('app', '1');
    window.location.href = url.toString();
  };

  if (isApp) {
    return <App />;
  }

  return <LandingPage onOpenWebApp={openWebApp} />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}
