import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import axiosClient, { resetCsrfCookie } from '../axiosClient';
import type { AppUser } from '../types/domain';

interface StateContextValue {
  user: AppUser | null;
  token: string | null;
  initializing: boolean;
  setUser: (user: AppUser | null) => void;
  setToken: (token: string | null) => void;
}

const StateContext = createContext<StateContextValue | undefined>(undefined);

export const ContextProvider = ({ children }: PropsWithChildren) => {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const setUser = useCallback((nextUser: AppUser | null) => {
    setUserState(nextUser);
  }, []);

  const setToken = useCallback((nextToken: string | null) => {
    setTokenState(nextToken ? 'session' : null);
    if (!nextToken) {
      resetCsrfCookie();
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    const expire = () => {
      setTokenState(null);
      setUser(null);
      setInitializing(false);
    };
    window.addEventListener('qhs:auth-expired', expire);
    return () => window.removeEventListener('qhs:auth-expired', expire);
  }, [setUser]);

  useEffect(() => {
    let active = true;
    axiosClient.get<AppUser>('/user')
      .then(({ data }) => {
        if (!active) return;
        setUser(data);
        setTokenState('session');
      })
      .catch(() => {
        if (!active) return;
        setTokenState(null);
        setUser(null);
      })
      .finally(() => active && setInitializing(false));

    return () => { active = false; };
  }, [setUser]);

  const value = useMemo(
    () => ({ user, token, initializing, setUser, setToken }),
    [initializing, setToken, setUser, token, user],
  );

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

export const useStateContext = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error('useStateContext must be used inside ContextProvider.');
  return context;
};
