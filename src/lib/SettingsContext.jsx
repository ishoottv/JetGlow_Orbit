import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const SettingsContext = createContext({});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const applyTheme = (s) => {
    if (!s) return;
    const root = document.documentElement;
    if (s.color_primary) {
      root.style.setProperty("--primary", s.color_primary);
      root.style.setProperty("--accent", s.color_primary);
      root.style.setProperty("--ring", s.color_primary);
    }
    if (s.color_background) {
      root.style.setProperty("--background", s.color_background);
    }
  };

  const load = async () => {
    const list = await base44.entities.AppSettings.list();
    const s = list[0] || null;
    setSettings(s);
    applyTheme(s);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (data) => {
    let updated;
    if (settings?.id) {
      updated = await base44.entities.AppSettings.update(settings.id, data);
    } else {
      updated = await base44.entities.AppSettings.create(data);
    }
    setSettings(updated);
    applyTheme(updated);
    return updated;
  };

  return (
    <SettingsContext.Provider value={{ settings, save, reload: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);