import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import axiosClient from '../axiosClient';
import type { AppUser } from '../types/domain';

interface StateContextValue {
  user: AppUser | null;
  token: string | null;
  initializing: boolean;
  setUser: (user: AppUser | null) => void;
  setToken: (token: string | null) => void;
}

const readStoredUser = (): AppUser | null => {
  try {
    const storedUser = localStorage.getItem('USER');
    return storedUser ? JSON.parse(storedUser) as AppUser : null;
  } catch {
    localStorage.removeItem('USER');
    return null;
  }
};

const StateContext = createContext<StateContextValue | undefined>(undefined);

export const ContextProvider = ({ children }: PropsWithChildren) => {
  const [user, setUserState] = useState<AppUser | null>(readStoredUser);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('ACCESS_TOKEN'));
  const [initializing, setInitializing] = useState(Boolean(token));

  const setUser = useCallback((nextUser: AppUser | null) => {
    setUserState(nextUser);
    if (nextUser) localStorage.setItem('USER', JSON.stringify(nextUser));
    else localStorage.removeItem('USER');
  }, []);

  const setToken = useCallback((nextToken: string | null) => {
    setTokenState(nextToken);
    if (nextToken) localStorage.setItem('ACCESS_TOKEN', nextToken);
    else {
      localStorage.removeItem('ACCESS_TOKEN');
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
    if (!token) {
      setInitializing(false);
      return;
    }

    let active = true;
    axiosClient.get<AppUser>('/user')
      .then(({ data }) => active && setUser(data))
      .catch(() => active && setToken(null))
      .finally(() => active && setInitializing(false));

    return () => { active = false; };
  }, [setToken, setUser, token]);

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
