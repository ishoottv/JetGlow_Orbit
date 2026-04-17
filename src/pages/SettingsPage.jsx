import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/shared/PageHeader";
import DeleteAccountDialog from "../components/settings/DeleteAccountDialog";
import { toast } from "sonner";
import { Upload, Palette, Type, Image, Trash2, Wrench, ChevronRight, Sun, Moon, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const COLOR_PRESETS = {
  primary: [
    { label: "Gold", value: "43 74% 49%" },
    { label: "Sky Blue", value: "206 100% 50%" },
    { label: "Emerald", value: "152 69% 44%" },
    { label: "Violet", value: "258 90% 66%" },
    { label: "Rose", value: "346 77% 58%" },
    { label: "Orange", value: "24 95% 55%" },
  ],
  background: [
    { label: "Light Gray", value: "0 0% 97%" },
    { label: "Pure White", value: "0 0% 100%" },
    { label: "Warm White", value: "40 30% 97%" },
    { label: "Dark", value: "0 0% 6%" },
    { label: "Slate Dark", value: "220 20% 8%" },
    { label: "Navy", value: "222 47% 11%" },
  ],
  sidebar: [
    { label: "White Card", value: "0 0% 100%" },
    { label: "Light Gray", value: "0 0% 97%" },
    { label: "Slate", value: "215 20% 18%" },
    { label: "Dark", value: "0 0% 10%" },
    { label: "Navy", value: "222 47% 14%" },
    { label: "Charcoal", value: "220 15% 12%" },
  ],
};

function ColorSwatch({ label, value, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
        selected ? "border-primary shadow-md" : "border-transparent hover:border-border"
      }`}
    >
      <div
        className="w-10 h-10 rounded-lg shadow-inner border border-black/10"
        style={{ background: `hsl(${value})` }}
      />
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

// Convert hex color to HSL string like "43 74% 49%"
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert HSL string "43 74% 49%" to hex for the color input
function hslToHex(hsl) {
  const parts = hsl.replace(/%/g, "").split(" ").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return "#c8931a";
  let [h, s, l] = parts;
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return "#" + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

export default function SettingsPage() {
  const { settings, save } = useSettings();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({
    app_name: "",
    logo_url: "",
    color_primary: "43 74% 49%",
    color_background: "0 0% 97%",
    color_sidebar: "0 0% 100%",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        app_name: settings.app_name || "",
        logo_url: settings.logo_url || "",
        color_primary: settings.color_primary || "43 74% 49%",
        color_background: settings.color_background || "0 0% 97%",
        color_sidebar: settings.color_sidebar || "0 0% 100%",
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = { ...form, logo_url: file_url };
      setForm(updated);
      setSaving(true);
      await save(updated);
      toast.success("Logo uploaded and saved");
      setSaving(false);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await save(form);
    // Apply sidebar color via CSS variable override on card
    document.documentElement.style.setProperty("--card", form.color_sidebar);
    toast.success("Settings saved!");
    setSaving(false);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await base44.auth.logout();
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <PageHeader title="App Settings" subtitle="Customize branding and theme" />

      {/* Theme */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-primary" /> Appearance
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "light", label: "Light Mode", icon: Sun },
              { value: "dark", label: "Dark Mode", icon: Moon },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  theme === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{label}</span>
                {theme === value && <span className="ml-auto text-xs font-bold text-primary">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Logo & Name */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Type className="w-4 h-4 text-primary" /> Branding
        </h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>App Name</Label>
            <Input
              value={form.app_name}
              onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
              placeholder="JetGlow ORBIT"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logo Image</Label>
            <div className="flex items-center gap-4">
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain border border-border bg-muted" />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-muted/50 transition-all text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              {form.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, logo_url: "" }))} className="text-muted-foreground text-xs">
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-5">
          <Palette className="w-4 h-4 text-primary" /> Theme Colors
        </h2>

        {[
          { key: "color_primary", label: "Primary / Accent Color", presets: COLOR_PRESETS.primary },
          { key: "color_background", label: "Page Background", presets: COLOR_PRESETS.background },
          { key: "color_sidebar", label: "Sidebar / Card Background", presets: COLOR_PRESETS.sidebar },
        ].map(({ key, label, presets }) => (
          <div key={key} className="mb-6 last:mb-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
            <div className="flex flex-wrap gap-1">
              {presets.map(p => (
                <ColorSwatch
                  key={p.value}
                  label={p.label}
                  value={p.value}
                  selected={form[key] === p.value}
                  onSelect={v => setForm(f => ({ ...f, [key]: v }))}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Pick color:</span>
              <input
                type="color"
                value={hslToHex(form[key])}
                onChange={e => setForm(f => ({ ...f, [key]: hexToHsl(e.target.value) }))}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                title="Pick a color"
              />
              <span className="text-xs text-muted-foreground">or HSL:</span>
              <Input
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="h-7 text-xs w-44 font-mono"
                placeholder="e.g. 43 74% 49%"
              />
              <div className="w-7 h-7 rounded-md border border-border shadow-inner" style={{ background: `hsl(${form[key]})` }} />
            </div>
          </div>
        ))}
      </section>

      {/* Preview */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm mb-4">Preview</h2>
        <div
          className="rounded-xl p-4 flex items-center gap-3 border border-border"
          style={{ background: `hsl(${form.color_sidebar})` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: `hsl(${form.color_primary})` }}>
            {form.logo_url
              ? <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
              : <span className="text-white font-black text-base">J</span>
            }
          </div>
          <div>
            <p className="font-black text-sm" style={{ color: `hsl(${form.color_background === "0 0% 6%" || form.color_background.includes("8%") || form.color_background.includes("11%") || form.color_background.includes("12%") ? "0 0% 95%" : "0 0% 8%"})` }}>
              {form.app_name || "JetGlow ORBIT"}
            </p>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: `hsl(${form.color_primary})` }}>
              ORBIT Tracker
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Wrench className="w-4 h-4 text-primary" /> Service Categories & Rules
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Manage service categories, trigger intervals, work classes, and condition weights for all ORBIT services.
        </p>
        <Link to="/rules">
          <Button variant="outline" className="gap-2 w-full justify-between">
            <span className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Manage Services</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* Account */}
      <section className="bg-card border border-border rounded-2xl p-6 mt-8 mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <LogOut className="w-4 h-4 text-primary" /> Account
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Sign out of your account and return to the login screen.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2 w-full justify-center"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4 text-red-700">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          className="gap-2 w-full justify-center"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </Button>
      </section>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}