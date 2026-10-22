import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApolloClient, ApolloLink, ApolloProvider, HttpLink, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import App from './App.tsx';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
// The font is shipped with the app (no requests to Google, can be embedded in the family tree export)
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './index.css';
import './i18n';
import { useThemeStore } from './stores/themeStore';
import { useAppearanceStore } from './stores/appearanceStore';
import { applyAppearance } from './lib/appearance';
import { installClientLog, logClient } from './lib/clientLog';

// Log of this browser session (console, uncaught errors) – viewable and exportable under Settings
installClientLog();
import { treeHeaders } from './stores/activeTreeStore';
import { apiUrl } from '@/lib/platform';
import { dataChangeLink } from '@/lib/dataChanges';

// Every request names the active family tree – the backend only works with its data
const treeLink = setContext((_, { headers }) => ({ headers: { ...headers, ...treeHeaders() } }));

// Failed requests go into the log of this browser session
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  for (const error of graphQLErrors ?? []) {
    logClient('error', `GraphQL error in ${operation.operationName}: ${error.message}`);
  }
  if (networkError) {
    logClient('error', `Network error in ${operation.operationName}: ${networkError.message}`);
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, dataChangeLink, treeLink, new HttpLink({ uri: apiUrl('/graphql') })]),
  cache: new InMemoryCache(),
});

// Apply the theme from localStorage at start
useThemeStore.getState().setTheme(useThemeStore.getState().theme);
// ... and the appearance (font, font size, accent colour)
applyAppearance(useAppearanceStore.getState());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        {/* Errors of the layout itself (pages have their own boundary inside it) */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
