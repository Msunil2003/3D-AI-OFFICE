import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, MapPin, Layers, X, Play, ShieldAlert, Kanban, Sparkles, Eye, ArrowRight } from "lucide-react";
import { useOfficeStore } from "../state/officeStore";
import { AgentData } from "../hooks/useOfficeSocket";

interface SearchResult {
  id: string;
  category: "ACTIONS" | "PEOPLE" | "TEAMS" | "LOCATIONS" | "TASKS" | "BLOCKED";
  type: "action" | "agent" | "department" | "room" | "task";
  name: string;
  meta: string;
  keywords?: string[];
  position?: [number, number, number];
  floor?: number;
  agentId?: string;
  onExecute?: () => void;
}

export type SearchFilterChip = "ALL" | "BLOCKED" | "APPROVALS" | "PEOPLE" | "TASKS" | "TEAMS" | "LOCATIONS";

interface SearchPaletteProps {
  agents: AgentData[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    blocked?: boolean;
    blockReason?: string;
    assigneeId?: string;
  }>;
}

const DEPARTMENTS: Omit<SearchResult, "category">[] = [
  { id: "dept-eng", type: "department", name: "Engineering Wing", meta: "Level 0 · West wing", keywords: ["dev", "code", "backend", "frontend", "engineering"], position: [-13, 0, -4], floor: 0 },
  { id: "dept-qa", type: "department", name: "QA Automation Lab", meta: "Level 0 · East wing", keywords: ["testing", "tests", "verification", "qa"], position: [13, 0, 1], floor: 0 },
  { id: "dept-devops", type: "department", name: "DevOps Control", meta: "Level 0 · North-east", keywords: ["ci", "cd", "deploy", "pipeline", "infrastructure"], position: [13, 0, -9], floor: 0 },
  { id: "dept-security", type: "department", name: "Security Operations", meta: "Level 0 · South-west", keywords: ["audit", "governance", "security", "keys"], position: [-13, 0, 13], floor: 0 },
  { id: "dept-mgmt", type: "department", name: "Strategy Rotunda", meta: "Level +1 · Mezzanine", keywords: ["management", "planning", "strategy", "goals"], position: [0, 4.2, -12], floor: 1 },
];

const ROOMS: Omit<SearchResult, "category">[] = [
  { id: "room-ceo", type: "room", name: "CEO Office", meta: "Level +1 · Private executive suite", keywords: ["founder", "executive", "office"], position: [-12.5, 4.2, -6], floor: 1 },
  { id: "room-boardroom", type: "room", name: "Executive Boardroom", meta: "Level +1 · Strategy & leadership", keywords: ["board", "meeting", "exec"], position: [12.5, 4.2, -6], floor: 1 },
  { id: "room-conf-a", type: "room", name: "Conference Room A", meta: "Level 0 · South-east", keywords: ["meeting", "alignment", "collab"], position: [13.5, 0, 13], floor: 0 },
  { id: "room-war-room", type: "room", name: "Incident War Room", meta: "Level 0 · North spine", keywords: ["incident", "escalation", "crisis", "war room"], position: [0, 0, -12], floor: 0 },
  { id: "room-server", type: "room", name: "Server Vault", meta: "Level -1 · Infrastructure", keywords: ["servers", "cluster", "storage", "vault"], position: [0, -4, -4], floor: -1 },
  { id: "room-reception", type: "room", name: "Reception", meta: "Level 0 · South entrance", keywords: ["welcome", "entrance", "lobby"], position: [0, 0, 14], floor: 0 },
];

export const SearchPalette: React.FC<SearchPaletteProps> = ({ agents, tasks = [] }) => {
  const searchOpen = useOfficeStore((state) => state.searchOpen);
  const setSearchOpen = useOfficeStore((state) => state.setSearchOpen);
  const teleportCeo = useOfficeStore((state) => state.teleportCeo);
  const setActiveModal = useOfficeStore((state) => state.setActiveModal);
  const setSelectedAgentId = useOfficeStore((state) => state.setSelectedAgentId);
  const locationLabel = useOfficeStore((state) => state.locationLabel);
  const toggleFocusMode = useOfficeStore((state) => state.toggleFocusMode);

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilterChip>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const blockedCount = tasks.filter((t) => t.blocked).length;

  // Intent-driven Executive Actions
  const executiveActions: SearchResult[] = [
    {
      id: "action-approvals",
      category: "ACTIONS",
      type: "action",
      name: "Review Governance Approvals",
      meta: "Authorize or reject pending merge gates",
      keywords: ["approve", "approvals", "gate", "merge", "sign off", "governance"],
      onExecute: () => setActiveModal("governance-gate")
    },
    {
      id: "action-blocked",
      category: "ACTIONS",
      type: "action",
      name: "Inspect Blocked Work",
      meta: `Review engineering tasks halted on blockers (${blockedCount} blocked)`,
      keywords: ["blocked", "blockers", "stuck", "halted", "tasks"],
      onExecute: () => setActiveModal("task-kanban")
    },
    {
      id: "action-command",
      category: "ACTIONS",
      type: "action",
      name: "Open Command Center",
      meta: "Organization Health & Daily CEO Briefing",
      keywords: ["command", "center", "health", "briefing", "overview", "kpi"],
      onExecute: () => setActiveModal("ceo-console")
    },
    {
      id: "action-planning",
      category: "ACTIONS",
      type: "action",
      name: "Strategic Planning Dashboard",
      meta: "Prompt autonomous Engineering Manager for roadmap decomposition",
      keywords: ["plan", "planning", "strategy", "roadmap", "em"],
      onExecute: () => setActiveModal("planning-dashboard")
    },
    {
      id: "action-directory",
      category: "ACTIONS",
      type: "action",
      name: "Open Directory & Wayfinding",
      meta: "Multi-floor campus directory and department navigation",
      keywords: ["directory", "map", "locations", "floors", "campus"],
      onExecute: () => setActiveModal("campus-map")
    },
    {
      id: "action-meeting",
      category: "ACTIONS",
      type: "action",
      name: "Convene Team Meeting",
      meta: "Assemble engineers in Conference Room A",
      keywords: ["meeting", "schedule", "convene", "invite"],
      onExecute: () => setActiveModal("meeting-scheduler")
    },
    {
      id: "action-immersive",
      category: "ACTIONS",
      type: "action",
      name: "Toggle Immersive Mode",
      meta: "Hide UI chrome for unobstructed 3D spatial view (Tab)",
      keywords: ["immersive", "focus", "clean", "hide ui"],
      onExecute: () => toggleFocusMode()
    }
  ];

  // People items from authoritative agent list
  const peopleResults: SearchResult[] = agents.map((a) => ({
    id: `agent-${a.agentId}`,
    category: "PEOPLE",
    type: "agent",
    name: a.name,
    meta: `${a.provider || "Autonomous Engineer"} · ${(a as any).role || a.status}`,
    keywords: [a.name.toLowerCase(), a.provider || "", a.status, (a as any).role || ""],
    agentId: a.agentId,
    onExecute: () => {
      setSelectedAgentId(a.agentId);
      setActiveModal("agent-talk");
    }
  }));

  // Tasks from authoritative backend tasks list
  const taskResults: SearchResult[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    category: t.blocked ? "BLOCKED" : "TASKS",
    type: "task",
    name: t.title,
    meta: `${t.status}${t.blocked ? ` · BLOCKED: ${t.blockReason || "dependency"}` : ""} · Assignee: ${t.assigneeId || "Unassigned"}`,
    keywords: [t.title.toLowerCase(), t.status.toLowerCase(), t.assigneeId?.toLowerCase() || "", t.blocked ? "blocked" : ""],
    onExecute: () => {
      if (t.assigneeId) {
        setSelectedAgentId(t.assigneeId);
        setActiveModal("agent-talk");
      } else {
        setActiveModal("task-kanban");
      }
    }
  }));

  const teamResults: SearchResult[] = DEPARTMENTS.map((d) => ({
    ...d,
    category: "TEAMS" as const
  }));

  const locationResults: SearchResult[] = ROOMS.map((r) => ({
    ...r,
    category: "LOCATIONS" as const
  }));

  const allItems: SearchResult[] = [
    ...executiveActions,
    ...peopleResults,
    ...taskResults,
    ...teamResults,
    ...locationResults
  ];

  // Contextual filtering: If CEO is inside Engineering, prioritize engineering items
  const isInsideEngineering = locationLabel.toLowerCase().includes("engineering");

  // Apply chip filter first
  let filterPool = allItems;
  if (activeFilter === "BLOCKED") {
    filterPool = allItems.filter((i) => i.category === "BLOCKED" || i.keywords?.includes("blocked") || i.name.toLowerCase().includes("blocked"));
  } else if (activeFilter === "APPROVALS") {
    filterPool = allItems.filter((i) => i.id === "action-approvals" || i.keywords?.includes("approvals"));
  } else if (activeFilter === "PEOPLE") {
    filterPool = allItems.filter((i) => i.category === "PEOPLE");
  } else if (activeFilter === "TASKS") {
    filterPool = allItems.filter((i) => i.category === "TASKS" || i.category === "BLOCKED");
  } else if (activeFilter === "TEAMS") {
    filterPool = allItems.filter((i) => i.category === "TEAMS");
  } else if (activeFilter === "LOCATIONS") {
    filterPool = allItems.filter((i) => i.category === "LOCATIONS");
  }

  const filteredResults = query.trim()
    ? filterPool.filter((item) => {
        const q = query.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesMeta = item.meta.toLowerCase().includes(q);
        const matchesKeyword = item.keywords?.some((k) => k.toLowerCase().includes(q));
        return matchesName || matchesMeta || matchesKeyword;
      }).slice(0, 25)
    : activeFilter !== "ALL"
    ? filterPool.slice(0, 8)
    : [
        ...executiveActions.slice(0, 3),
        ...peopleResults.slice(0, 2),
        ...(isInsideEngineering ? [teamResults[0]] : teamResults.slice(0, 2)),
        ...locationResults.slice(0, 2)
      ];

  // Auto-focus input when opening
  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setActiveFilter("ALL");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Keyboard listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  const handleSelect = useCallback((result: SearchResult) => {
    setSearchOpen(false);
    if (result.onExecute) {
      result.onExecute();
    } else if (result.type === "agent" && result.agentId) {
      setSelectedAgentId(result.agentId);
      setActiveModal("agent-talk");
    } else if (result.position) {
      teleportCeo(result.position, (result.floor ?? 0) as any);
    }
  }, [setSearchOpen, setSelectedAgentId, setActiveModal, teleportCeo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
      handleSelect(filteredResults[selectedIndex]);
    }
  };

  const getIcon = (item: SearchResult) => {
    switch (item.type) {
      case "action": return <Play size={13} />;
      case "agent": return <User size={13} />;
      case "department": return <Layers size={13} />;
      case "room": return <MapPin size={13} />;
      case "task": return <Kanban size={13} />;
      default: return <Search size={13} />;
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="search-overlay" onClick={() => setSearchOpen(false)}>
      <div className="search-palette" id="search-command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-tertiary)" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search natural intent ('blocked', 'approvals', 'Alex', 'war room')…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            aria-label="Command search input"
          />
          <button
            className="panel-close"
            onClick={() => setSearchOpen(false)}
            title="Close (ESC)"
            aria-label="Close"
            style={{ flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div
          className="search-filter-chips"
          style={{
            display: "flex",
            gap: "6px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            overflowX: "auto"
          }}
        >
          {(["ALL", "BLOCKED", "APPROVALS", "PEOPLE", "TASKS", "TEAMS", "LOCATIONS"] as SearchFilterChip[]).map((chip) => {
            const isActive = activeFilter === chip;
            const badge = chip === "BLOCKED" && blockedCount > 0 ? ` (${blockedCount})` : "";
            return (
              <button
                key={chip}
                onClick={() => { setActiveFilter(chip); setSelectedIndex(0); }}
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  color: isActive ? "var(--accent-primary)" : chip === "BLOCKED" && blockedCount > 0 ? "var(--accent-danger)" : "var(--text-tertiary)",
                  border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {chip}{badge}
              </button>
            );
          })}
        </div>

        <div className="search-results">
          {filteredResults.length > 0 ? (
            filteredResults.map((result, i) => (
              <div
                key={result.id}
                className={`search-result search-result-row${i === selectedIndex ? " selected" : ""}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
                role="button"
                tabIndex={0}
              >
                <div className="search-result-icon">
                  {getIcon(result)}
                </div>
                <div className="search-result-info">
                  <div className="search-result-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{result.name}</span>
                    <span className="search-category-badge">{result.category}</span>
                  </div>
                  <div className="search-result-meta">{result.meta}</div>
                </div>
                <span className="search-result-action">
                  {result.type === "action" ? "Run" : result.type === "agent" ? "Inspect" : result.type === "task" ? "Open" : "Go to"}
                </span>
              </div>
            ))
          ) : (
            <div className="search-empty">No results matching "{query}". Try "blocked", "approvals", or an engineer's name.</div>
          )}
        </div>

        <div className="search-hint">
          <span><kbd className="key-badge">↑</kbd><kbd className="key-badge">↓</kbd> Navigate</span>
          <span><kbd className="key-badge">↵</kbd> Execute</span>
          <span><kbd className="key-badge">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};
