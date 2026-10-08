import { useEffect, useState } from "react";
import { useAppUpdate } from "./hooks/useAppUpdate";
import { InstallApp } from "./components/InstallApp";
import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Grid2X2,
  AudioLines,
  History,
  Settings2,
  ArrowUpRight,
  WifiOff,
} from "lucide-react";
import { Home } from "./features/jd-technology/Home";
import { LumoHome } from "./features/lumo/Home";
import { MeetingScreen } from "./features/lumo/Meeting";
import { HistoryScreen } from "./features/lumo/History";
import { SummaryScreen } from "./features/lumo/Summary";
import { SettingsScreen } from "./features/lumo/Settings";
import { WhiteboardScreen } from "./features/whiteboard/Whiteboard";
import {
  DataToolsHome,
  PaceCalculator,
  PercentageCalculator,
  CapacityCalculator,
} from "./features/data/DataTools";
import { StoreProvider, useStore } from "./storage/AppStore";
function Shell() {
  const { settings, error, clearError } = useStore();
  const location = useLocation();
  const inMeeting = location.pathname === "/lumo/meeting";
  const { needRefresh, updateApp } = useAppUpdate();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const theme = () =>
      (document.documentElement.dataset.theme =
        settings.appearance === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.appearance);
    theme();
    media.addEventListener("change", theme);
    return () => media.removeEventListener("change", theme);
  }, [settings.appearance]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${location.pathname.startsWith("/data") ? "Data Tools" : location.pathname.startsWith("/whiteboard") ? "White Board Clean Up" : location.pathname.startsWith("/lumo") ? "Lumo" : "Workspace"} · JD Technology`;
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">
            jd
            <span />
          </span>
          <span>
            JD TECHNOLOGY<small>BUSINESS, BETTER.</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          {!inMeeting && (
            <>
              <NavLink end to="/">
                <Grid2X2 size={16} />
                <span>Workspace</span>
              </NavLink>
              <NavLink to="/lumo">
                <AudioLines size={17} />
                <span>Lumo</span>
              </NavLink>
            </>
          )}
          <span className="header-device">
            <span className="tiny-dot" /> YOUR PERSONAL WORKSPACE
          </span>
        </nav>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={inMeeting ? "main meeting-main" : "main"}
      >
        {needRefresh && (
          <div className="banner" role="status">
            <span>
              {inMeeting
                ? "An app update is ready. End your meeting to apply it."
                : "An app update is ready."}
            </span>
            {!inMeeting && (
              <button className="button secondary small" onClick={updateApp}>
                Update app
              </button>
            )}
          </div>
        )}
        {!online && (
          <div className="banner">
            <WifiOff size={17} />
            You’re offline. Saved meetings and manual actions are available.
          </div>
        )}
        <InstallApp hidden={inMeeting} />
        {error && (
          <div className="banner error-banner" role="alert">
            <span>{error}</span>
            <button className="text-button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/whiteboard" element={<WhiteboardScreen />} />
          <Route path="/data" element={<DataToolsHome />} />
          <Route path="/data/pace" element={<PaceCalculator />} />
          <Route path="/data/percentage" element={<PercentageCalculator />} />
          <Route path="/data/capacity" element={<CapacityCalculator />} />
          <Route path="/lumo" element={<LumoHome />} />
          <Route path="/lumo/meeting" element={<MeetingScreen />} />
          <Route path="/lumo/history" element={<HistoryScreen />} />
          <Route path="/lumo/history/:id" element={<SummaryScreen />} />
          <Route path="/lumo/settings" element={<SettingsScreen />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Let’s get you back.</h1>
                <Link className="button primary" to="/">
                  Open workspace
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      {!inMeeting && (
        <>
          <footer className="site-footer">
            <span>
              JD TECHNOLOGY <span className="muted">/ Thoughtfully built.</span>
            </span>
            <Link to="/lumo/settings">
              Made for the way you work <ArrowUpRight size={14} />
            </Link>
          </footer>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <NavLink end to="/">
              <Grid2X2 size={20} />
              <span>Workspace</span>
            </NavLink>
            <NavLink end to="/lumo">
              <AudioLines size={20} />
              <span>Lumo</span>
            </NavLink>
            <NavLink to="/lumo/history">
              <History size={20} />
              <span>History</span>
            </NavLink>
            <NavLink to="/lumo/settings">
              <Settings2 size={20} />
              <span>Settings</span>
            </NavLink>
          </nav>
        </>
      )}
    </div>
  );
}
export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}
