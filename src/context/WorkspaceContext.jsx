'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

const initialState = {
  activeWorkspaceId: null,
  workspaces: [],
};

function sortWorkspaces(workspaces) {
  return [...workspaces].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function createWorkspaceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getUniqueWorkspaceName(baseName, workspaces) {
  const trimmedName = String(baseName || 'Semester Workspace').trim() || 'Semester Workspace';
  let nextName = trimmedName;
  let suffix = 2;

  while (workspaces.some((workspace) => workspace.name === nextName)) {
    nextName = `${trimmedName} (${suffix})`;
    suffix += 1;
  }

  return nextName;
}

function normalizeManualSelections(manualSelections) {
  if (!manualSelections || typeof manualSelections !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(manualSelections).map(([rowId, value]) => [
      rowId,
      {
        selectedCourseKeys: Array.isArray(value?.selectedCourseKeys) ? value.selectedCourseKeys : [],
        reviewedAt: value?.reviewedAt ?? null,
        lastEditedAt: value?.lastEditedAt ?? null,
      },
    ]),
  );
}

function coerceWorkspace(workspace) {
  const students = Array.isArray(workspace?.students) ? workspace.students : [];
  const createdAt = workspace?.createdAt ?? new Date().toISOString();

  return {
    id: String(workspace?.id ?? createWorkspaceId()),
    name: String(workspace?.name || 'Saved Workspace').trim() || 'Saved Workspace',
    fileName: String(workspace?.fileName || ''),
    students,
    exportColumns: Array.isArray(workspace?.exportColumns) ? workspace.exportColumns : [],
    headerRows: Array.isArray(workspace?.headerRows) ? workspace.headerRows : [],
    subjectColumns: Array.isArray(workspace?.subjectColumns) ? workspace.subjectColumns : [],
    manualSelections: normalizeManualSelections(workspace?.manualSelections),
    searchQuery: String(workspace?.searchQuery || ''),
    selectedStudentRowId:
      typeof workspace?.selectedStudentRowId === 'string'
        ? workspace.selectedStudentRowId
        : students[0]?.rowId ?? null,
    createdAt,
    updatedAt: workspace?.updatedAt ?? createdAt,
  };
}

function touchWorkspace(workspace, updates) {
  return {
    ...workspace,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

function updateWorkspace(state, workspaceId, updater, shouldSort = true) {
  let hasChanged = false;

  const nextWorkspaces = state.workspaces.map((workspace) => {
    if (workspace.id !== workspaceId) {
      return workspace;
    }
    hasChanged = true;
    return updater(workspace);
  });

  if (!hasChanged) {
    return state;
  }

  return {
    ...state,
    workspaces: shouldSort ? sortWorkspaces(nextWorkspaces) : nextWorkspaces,
  };
}

function createWorkspaceFromUpload(payload, workspaces) {
  const timestamp = new Date().toISOString();

  return coerceWorkspace({
    id: createWorkspaceId(),
    name: getUniqueWorkspaceName(payload?.name, workspaces),
    fileName: payload?.fileName ?? '',
    students: payload?.students ?? [],
    exportColumns: payload?.exportColumns ?? [],
    headerRows: payload?.headerRows ?? [],
    subjectColumns: payload?.subjectColumns ?? [],
    manualSelections: {},
    searchQuery: '',
    selectedStudentRowId: payload?.students?.[0]?.rowId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function workspaceReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'CREATE_WORKSPACE': {
      // payload is a pre-built workspace object so the same ID is shared
      // between the optimistic update and the API request.
      const workspace = coerceWorkspace(action.payload);

      return {
        activeWorkspaceId: workspace.id,
        workspaces: sortWorkspaces([workspace, ...state.workspaces]),
      };
    }

    case 'SET_ACTIVE_WORKSPACE':
      return {
        ...state,
        activeWorkspaceId: action.payload.workspaceId,
      };

    case 'REMOVE_WORKSPACE': {
      const nextWorkspaces = state.workspaces.filter(
        (workspace) => workspace.id !== action.payload.workspaceId,
      );

      return {
        activeWorkspaceId:
          state.activeWorkspaceId === action.payload.workspaceId
            ? nextWorkspaces[0]?.id ?? null
            : state.activeWorkspaceId,
        workspaces: nextWorkspaces,
      };
    }

    case 'SET_SEARCH_QUERY':
      return updateWorkspace(
        state,
        action.payload.workspaceId,
        (workspace) => ({ ...workspace, searchQuery: action.payload.query }),
        false,
      );

    case 'SET_SELECTED_STUDENT':
      return updateWorkspace(
        state,
        action.payload.workspaceId,
        (workspace) => ({ ...workspace, selectedStudentRowId: action.payload.rowId }),
        false,
      );

    case 'TOGGLE_MANUAL_COURSE':
      return updateWorkspace(state, action.payload.workspaceId, (workspace) => {
        const currentSelection = workspace.manualSelections[action.payload.rowId] ?? {
          selectedCourseKeys: [],
          reviewedAt: null,
          lastEditedAt: null,
        };
        const selectedCourseKeys = currentSelection.selectedCourseKeys.includes(action.payload.courseKey)
          ? currentSelection.selectedCourseKeys.filter((k) => k !== action.payload.courseKey)
          : [...currentSelection.selectedCourseKeys, action.payload.courseKey];

        return touchWorkspace(workspace, {
          selectedStudentRowId: action.payload.rowId,
          manualSelections: {
            ...workspace.manualSelections,
            [action.payload.rowId]: {
              ...currentSelection,
              selectedCourseKeys,
              lastEditedAt: new Date().toISOString(),
            },
          },
        });
      });

    case 'SAVE_STUDENT_REVIEW':
      return updateWorkspace(state, action.payload.workspaceId, (workspace) => {
        const currentSelection = workspace.manualSelections[action.payload.rowId] ?? {
          selectedCourseKeys: [],
          reviewedAt: null,
          lastEditedAt: null,
        };

        return touchWorkspace(workspace, {
          selectedStudentRowId: action.payload.rowId,
          manualSelections: {
            ...workspace.manualSelections,
            [action.payload.rowId]: {
              ...currentSelection,
              reviewedAt: new Date().toISOString(),
              lastEditedAt: new Date().toISOString(),
            },
          },
        });
      });

    case 'RESET_STUDENT_REVIEW':
      return updateWorkspace(state, action.payload.workspaceId, (workspace) => {
        const nextManualSelections = { ...workspace.manualSelections };
        delete nextManualSelections[action.payload.rowId];

        return touchWorkspace(workspace, { manualSelections: nextManualSelections });
      });

    default:
      return state;
  }
}

export function WorkspaceProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');

  // Stable ref so memoized actions can always read the latest state.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Re-fetch workspaces whenever the authenticated user changes.
  // This fixes the case where the context mounts on /login (no cookie → empty
  // list), then the user logs in via client-side navigation and the provider
  // never re-mounts. Keying on user.id ensures we also clear state on logout.
  useEffect(() => {
    // Wait for auth to resolve so we don't issue a speculative fetch.
    if (isAuthLoading) return;

    if (!user) {
      // Logged out – clear workspace state.
      dispatch({ type: 'HYDRATE', payload: { workspaces: [], activeWorkspaceId: null } });
      setIsHydrated(true);
      return;
    }

    setIsHydrated(false);
    fetch('/api/workspaces')
      .then(async (res) => {
        if (res.status === 401) return { workspaces: [] };
        if (!res.ok) throw new Error('Failed to fetch workspaces');
        return res.json();
      })
      .then(({ workspaces }) => {
        const sorted = sortWorkspaces((workspaces ?? []).map(coerceWorkspace));
        dispatch({
          type: 'HYDRATE',
          payload: { workspaces: sorted, activeWorkspaceId: sorted[0]?.id ?? null },
        });
      })
      .catch(() => {
        // Non-fatal: start with an empty workspace list
      })
      .finally(() => setIsHydrated(true));
  }, [user?.id, isAuthLoading]);

  const actions = useMemo(
    () => ({
      createWorkspace(payload) {
        // Build once so the same ID is used in both the reducer and the API.
        const newWorkspace = createWorkspaceFromUpload(payload, stateRef.current.workspaces);

        dispatch({ type: 'CREATE_WORKSPACE', payload: newWorkspace });

        fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:             newWorkspace.id,
            name:           newWorkspace.name,
            fileName:       newWorkspace.fileName,
            students:       newWorkspace.students,
            subjectColumns: newWorkspace.subjectColumns,
            exportColumns:  newWorkspace.exportColumns,
            headerRows:     newWorkspace.headerRows,
          }),
        }).catch(() =>
          setPersistenceError('Workspace created locally but could not be saved to the database.'),
        );
      },

      setActiveWorkspace(workspaceId) {
        dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { workspaceId } });
      },

      removeWorkspace(workspaceId) {
        dispatch({ type: 'REMOVE_WORKSPACE', payload: { workspaceId } });
        fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' }).catch(() =>
          setPersistenceError('Failed to delete workspace from the database.'),
        );
      },

      setSearchQuery(workspaceId, query) {
        dispatch({ type: 'SET_SEARCH_QUERY', payload: { workspaceId, query } });
      },

      setSelectedStudent(workspaceId, rowId) {
        dispatch({ type: 'SET_SELECTED_STUDENT', payload: { workspaceId, rowId } });
      },

      toggleManualCourse(workspaceId, rowId, courseKey) {
        const workspace = stateRef.current.workspaces.find((w) => w.id === workspaceId);
        const currentSel = workspace?.manualSelections?.[rowId] ?? {
          selectedCourseKeys: [],
          reviewedAt: null,
          lastEditedAt: null,
        };
        const newKeys = currentSel.selectedCourseKeys.includes(courseKey)
          ? currentSel.selectedCourseKeys.filter((k) => k !== courseKey)
          : [...currentSel.selectedCourseKeys, courseKey];
        const now = new Date().toISOString();

        dispatch({ type: 'TOGGLE_MANUAL_COURSE', payload: { workspaceId, rowId, courseKey } });

        fetch(`/api/workspaces/${workspaceId}/manual-selections`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowId,
            selectedCourseKeys: newKeys,
            reviewedAt:         currentSel.reviewedAt,
            lastEditedAt:       now,
          }),
        }).catch(() => setPersistenceError('Failed to save course selection.'));
      },

      saveStudentReview(workspaceId, rowId) {
        const workspace = stateRef.current.workspaces.find((w) => w.id === workspaceId);
        const currentSel = workspace?.manualSelections?.[rowId] ?? {
          selectedCourseKeys: [],
          reviewedAt: null,
          lastEditedAt: null,
        };
        const now = new Date().toISOString();

        dispatch({ type: 'SAVE_STUDENT_REVIEW', payload: { workspaceId, rowId } });

        fetch(`/api/workspaces/${workspaceId}/manual-selections`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowId,
            selectedCourseKeys: currentSel.selectedCourseKeys,
            reviewedAt:         now,
            lastEditedAt:       now,
          }),
        }).catch(() => setPersistenceError('Failed to save student review.'));
      },

      resetStudentReview(workspaceId, rowId) {
        dispatch({ type: 'RESET_STUDENT_REVIEW', payload: { workspaceId, rowId } });

        fetch(
          `/api/workspaces/${workspaceId}/manual-selections?rowId=${encodeURIComponent(rowId)}`,
          { method: 'DELETE' },
        ).catch(() => setPersistenceError('Failed to reset student review.'));
      },
    }),
    [],
  );

  const activeWorkspace = useMemo(
    () => state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ?? null,
    [state.activeWorkspaceId, state.workspaces],
  );

  const value = useMemo(
    () => ({
      ...state,
      activeWorkspace,
      actions,
      isHydrated,
      persistenceError,
    }),
    [activeWorkspace, actions, isHydrated, persistenceError, state],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider.');
  }

  return context;
}
