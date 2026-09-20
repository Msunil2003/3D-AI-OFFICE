import { create } from "zustand";

export type FloorLevel = -1 | 0 | 1;

export interface InteractiveTarget {
  id: string;
  type: "agent" | "workstation" | "meeting" | "elevator" | "stairs" | "manager-table" | "task-wall" | "governance" | "ceo-display" | "door";
  name: string;
  position: [number, number, number];
  promptText: string;
  distance: number;
  metadata?: Record<string, any>;
}

export interface CeoState {
  position: [number, number, number];
  rotationY: number;
  floor: FloorLevel;
  isMoving: boolean;
  isSprinting: boolean;
  canMove: boolean;
}

export interface OfficeNotification {
  id: string;
  type: "info" | "warning" | "alert" | "success";
  title: string;
  message: string;
  timestamp: number;
  targetPosition?: [number, number, number];
  targetFloor?: FloorLevel;
  actionLabel?: string;
  onAction?: () => void;
}

export type ContextualModalType =
  | null
  | "agent-talk"
  | "workstation-inspect"
  | "meeting-scheduler"
  | "governance-gate"
  | "planning-dashboard"
  | "task-kanban"
  | "campus-map"
  | "elevator-select"
  | "ceo-console"
  | "help-controls";

export interface OfficeState {
  // CEO Player Character
  ceo: CeoState;
  setCeoPosition: (pos: [number, number, number]) => void;
  setCeoRotationY: (rot: number) => void;
  setCeoFloor: (floor: FloorLevel) => void;
  setCeoMoving: (isMoving: boolean, isSprinting?: boolean) => void;
  setCeoCanMove: (canMove: boolean) => void;
  teleportCeo: (pos: [number, number, number], floor: FloorLevel) => void;

  // Camera
  cameraMode: "third-person" | "overview" | "follow";
  setCameraMode: (mode: "third-person" | "overview" | "follow") => void;
  followedAgentId: string | null;
  setFollowedAgentId: (id: string | null) => void;

  // Interaction
  nearbyTargets: InteractiveTarget[];
  activeTarget: InteractiveTarget | null;
  setNearbyTargets: (targets: InteractiveTarget[]) => void;
  setActiveTarget: (target: InteractiveTarget | null) => void;

  // Contextual Overlays & Panels
  activeModal: ContextualModalType;
  setActiveModal: (modal: ContextualModalType) => void;
  closeAllModals: () => void;

  // Selection
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  selectedWorkstationId: string | null;
  setSelectedWorkstationId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Active Meeting state
  activeMeeting: {
    id: string;
    title: string;
    type: string;
    participants: string[];
    agenda: string[];
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
    room: "meeting-a" | "meeting-b" | "boardroom" | "war-room";
  } | null;
  setActiveMeeting: (meeting: OfficeState["activeMeeting"]) => void;

  // Elevator In-transit State
  isElevatorMoving: boolean;
  elevatorFloor: FloorLevel;
  setElevatorFloor: (floor: FloorLevel) => void;
  setElevatorMoving: (moving: boolean) => void;

  // Notifications
  notifications: OfficeNotification[];
  addNotification: (notif: Omit<OfficeNotification, "id" | "timestamp">) => void;
  dismissNotification: (id: string) => void;

  // Wayfinding Route
  navigationGuideTarget: [number, number, number] | null;
  setNavigationGuideTarget: (pos: [number, number, number] | null) => void;

  // Focus Mode (TAB toggle — hides non-essential UI)
  focusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;

  // Search Palette (Cmd+K)
  searchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Attention Center
  attentionOpen: boolean;
  setAttentionOpen: (open: boolean) => void;

  // Panel navigation context stack (for back-button behavior)
  panelHistory: ContextualModalType[];
  pushPanel: (modal: ContextualModalType) => void;
  popPanel: () => void;

  // Current location label (derived from CEO position)
  locationLabel: string;
  setLocationLabel: (label: string) => void;
}

// Lightweight Zustand store for 3D simulation
import { createStore } from "./zustandStore";

export const useOfficeStore = createStore<OfficeState>((set, get) => ({
  ceo: {
    position: [0, 0, 10.5], // Spawn at Reception facing south towards branding wall & desk
    rotationY: Math.PI, // Facing reception desk & entrance branding
    floor: 0,
    isMoving: false,
    isSprinting: false,
    canMove: true
  },
  setCeoPosition: (position) =>
    set((state) => ({ ceo: { ...state.ceo, position } })),
  setCeoRotationY: (rotationY) =>
    set((state) => ({ ceo: { ...state.ceo, rotationY } })),
  setCeoFloor: (floor) =>
    set((state) => ({ ceo: { ...state.ceo, floor } })),
  setCeoMoving: (isMoving, isSprinting = false) =>
    set((state) => ({ ceo: { ...state.ceo, isMoving, isSprinting } })),
  setCeoCanMove: (canMove) =>
    set((state) => ({ ceo: { ...state.ceo, canMove } })),
  teleportCeo: (position, floor) =>
    set((state) => ({ ceo: { ...state.ceo, position, floor } })),

  cameraMode: "third-person",
  setCameraMode: (cameraMode) => set({ cameraMode }),
  followedAgentId: null,
  setFollowedAgentId: (followedAgentId) => set({ followedAgentId }),

  nearbyTargets: [],
  activeTarget: null,
  setNearbyTargets: (nearbyTargets) => set({ nearbyTargets }),
  setActiveTarget: (activeTarget) => set({ activeTarget }),

  activeModal: null,
  setActiveModal: (activeModal) =>
    set({
      activeModal,
      ceo: { ...get().ceo, canMove: activeModal === null }
    }),
  closeAllModals: () =>
    set({
      activeModal: null,
      ceo: { ...get().ceo, canMove: true }
    }),

  selectedAgentId: null,
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
  selectedWorkstationId: null,
  setSelectedWorkstationId: (selectedWorkstationId) => set({ selectedWorkstationId }),
  selectedTaskId: null,
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),

  activeMeeting: null,
  setActiveMeeting: (activeMeeting) => set({ activeMeeting }),

  isElevatorMoving: false,
  elevatorFloor: 0,
  setElevatorFloor: (elevatorFloor) => set({ elevatorFloor }),
  setElevatorMoving: (isElevatorMoving) => set({ isElevatorMoving }),

  notifications: [],
  addNotification: (notif) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNotif: OfficeNotification = {
      ...notif,
      id,
      timestamp: Date.now()
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 10)
    }));
  },
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),

  navigationGuideTarget: null,
  setNavigationGuideTarget: (navigationGuideTarget) => set({ navigationGuideTarget }),

  focusMode: false,
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setFocusMode: (focusMode) => set({ focusMode }),

  searchOpen: false,
  searchQuery: "",
  setSearchOpen: (searchOpen) => set({ searchOpen, searchQuery: searchOpen ? "" : get().searchQuery }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  attentionOpen: false,
  setAttentionOpen: (attentionOpen) => set({ attentionOpen }),

  panelHistory: [],
  pushPanel: (modal) => {
    const current = get().activeModal;
    if (current && current !== modal) {
      set((state) => ({
        panelHistory: [...state.panelHistory, current],
        activeModal: modal,
        ceo: { ...state.ceo, canMove: modal === null }
      }));
    } else {
      set({
        activeModal: modal,
        ceo: { ...get().ceo, canMove: modal === null }
      });
    }
  },
  popPanel: () => {
    const history = get().panelHistory;
    if (history.length > 0) {
      const previous = history[history.length - 1];
      set({
        activeModal: previous,
        panelHistory: history.slice(0, -1),
        ceo: { ...get().ceo, canMove: previous === null }
      });
    } else {
      set({
        activeModal: null,
        ceo: { ...get().ceo, canMove: true }
      });
    }
  },

  locationLabel: "Reception",
  setLocationLabel: (locationLabel) => set({ locationLabel })
}));
