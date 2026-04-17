import React, { createContext, useContext, useState } from "react";

const TabStateContext = createContext();

export function TabStateProvider({ children }) {
  const [tabStates, setTabStates] = useState({});

  const saveTabState = (tabKey, state) => {
    setTabStates(prev => ({
      ...prev,
      [tabKey]: state
    }));
  };

  const getTabState = (tabKey) => {
    return tabStates[tabKey] || {};
  };

  const clearTabState = (tabKey) => {
    setTabStates(prev => {
      const newState = { ...prev };
      delete newState[tabKey];
      return newState;
    });
  };

  return (
    <TabStateContext.Provider value={{ saveTabState, getTabState, clearTabState }}>
      {children}
    </TabStateContext.Provider>
  );
}

export function useTabState(tabKey) {
  const context = useContext(TabStateContext);
  if (!context) {
    throw new Error("useTabState must be used within TabStateProvider");
  }
  return {
    saveState: (state) => context.saveTabState(tabKey, state),
    getState: () => context.getTabState(tabKey),
    clearState: () => context.clearTabState(tabKey),
  };
}