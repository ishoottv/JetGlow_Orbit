import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationStackContext = createContext();

/**
 * NavigationStackProvider manages a history stack per tab.
 * Each tab has its own navigation history, allowing back/forward without losing state.
 */
export function NavigationStackProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stacks, setStacks] = useState({
    dashboard: ["/"],
    aircraft: ["/aircraft"],
    customers: ["/customers"],
    flights: ["/flights"],
    maintenance: ["/maintenance"],
    alerts: ["/alerts"],
    rules: ["/rules"],
    quotes: ["/quotes"],
    settings: ["/settings"],
  });
  const [currentTab, setCurrentTab] = useState("dashboard");

  const push = useCallback(
    (path, tabKey = currentTab) => {
      setStacks(prev => ({
        ...prev,
        [tabKey]: [...prev[tabKey], path],
      }));
      navigate(path);
    },
    [currentTab, navigate]
  );

  const pop = useCallback(
    (tabKey = currentTab) => {
      setStacks(prev => {
        const stack = prev[tabKey];
        if (stack.length > 1) {
          const newStack = stack.slice(0, -1);
          navigate(newStack[newStack.length - 1]);
          return { ...prev, [tabKey]: newStack };
        }
        return prev;
      });
    },
    [currentTab, navigate]
  );

  const switchTab = useCallback((tabKey) => {
    setCurrentTab(tabKey);
    const stack = stacks[tabKey];
    if (stack && stack.length > 0) {
      navigate(stack[stack.length - 1]);
    }
  }, [stacks, navigate]);

  const resetTabStack = useCallback((tabKey) => {
    const defaultPaths = {
      dashboard: "/",
      aircraft: "/aircraft",
      customers: "/customers",
      flights: "/flights",
      maintenance: "/maintenance",
      alerts: "/alerts",
      rules: "/rules",
      quotes: "/quotes",
      settings: "/settings",
    };
    setStacks(prev => ({
      ...prev,
      [tabKey]: [defaultPaths[tabKey]],
    }));
    navigate(defaultPaths[tabKey]);
  }, [navigate]);

  const value = {
    push,
    pop,
    switchTab,
    resetTabStack,
    currentTab,
    stacks,
  };

  return (
    <NavigationStackContext.Provider value={value}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export function useNavigationStack() {
  const context = useContext(NavigationStackContext);
  if (!context) {
    throw new Error("useNavigationStack must be used within NavigationStackProvider");
  }
  return context;
}