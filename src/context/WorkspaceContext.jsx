'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';

const STORAGE_KEY = 'student-reconciliation-workspaces';

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

function hydrateState(rawState) {
  if (!rawState) {
    return initialState;
  }

  try {
    const parsedState = JSON.parse(rawState);
    const workspaces = sortWorkspaces(
      Array.isArray(parsedState?.workspaces) ? parsedState.workspaces.map(coerceWorkspace) : [],
    );
    const activeWorkspaceId = workspaces.some(
      (workspace) => workspace.id === parsedState?.activeWorkspaceId,
    )
      ? parsedState.activeWorkspaceId
      : workspaces[0]?.id ?? null;

    return {
      activeWorkspaceId,
      workspaces,
    };
  } catch {
    return initialState;
  }
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
      const workspace = createWorkspaceFromUpload(action.payload, state.workspaces);

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
        (workspace) => ({
          ...workspace,
          searchQuery: action.payload.query,
        }),
        false,
      );

    case 'SET_SELECTED_STUDENT':
      return updateWorkspace(
        state,
        action.payload.workspaceId,
        (workspace) => ({
          ...workspace,
          selectedStudentRowId: action.payload.rowId,
        }),
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
          ? currentSelection.selectedCourseKeys.filter(
              (courseKey) => courseKey !== action.payload.courseKey,
            )
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

        return touchWorkspace(workspace, {
          manualSelections: nextManualSelections,
        });
      });

    default:
      return state;
  }
}

export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');

  useEffect(() => {
    const nextState = hydrateState(window.localStorage.getItem(STORAGE_KEY));
    dispatch({ type: 'HYDRATE', payload: nextState });
    setIsHydrated(true);

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      dispatch({ type: 'HYDRATE', payload: hydrateState(event.newValue) });
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setPersistenceError('');
    } catch {
      setPersistenceError('Unable to persist workspaces in local storage for this browser.');
    }
  }, [isHydrated, state]);

  const actions = useMemo(
    () => ({
      createWorkspace(payload) {
        dispatch({ type: 'CREATE_WORKSPACE', payload });
      },
      setActiveWorkspace(workspaceId) {
        dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { workspaceId } });
      },
      removeWorkspace(workspaceId) {
        dispatch({ type: 'REMOVE_WORKSPACE', payload: { workspaceId } });
      },
      setSearchQuery(workspaceId, query) {
        dispatch({ type: 'SET_SEARCH_QUERY', payload: { workspaceId, query } });
      },
      setSelectedStudent(workspaceId, rowId) {
        dispatch({ type: 'SET_SELECTED_STUDENT', payload: { workspaceId, rowId } });
      },
      toggleManualCourse(workspaceId, rowId, courseKey) {
        dispatch({
          type: 'TOGGLE_MANUAL_COURSE',
          payload: { workspaceId, rowId, courseKey },
        });
      },
      saveStudentReview(workspaceId, rowId) {
        dispatch({ type: 'SAVE_STUDENT_REVIEW', payload: { workspaceId, rowId } });
      },
      resetStudentReview(workspaceId, rowId) {
        dispatch({ type: 'RESET_STUDENT_REVIEW', payload: { workspaceId, rowId } });
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