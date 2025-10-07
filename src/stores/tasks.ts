import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import { handleError } from "@/lib/error-handling";
import type {
  Task,
  CreateTaskForm,
  TaskStatus,
  TaskPriority,
} from "@/lib/types";

interface TasksState {
  tasks: Task[];
  loading: boolean;
  selectedTask: Task | null;
  fetchTasks: (tenantId: string, filters?: TaskFilters) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (
    tenantId: string,
    taskData: CreateTaskForm
  ) => Promise<{ error?: string }>;
  updateTask: (
    id: string,
    taskData: Partial<CreateTaskForm>
  ) => Promise<{ error?: string }>;
  updateTaskStatus: (
    id: string,
    status: TaskStatus
  ) => Promise<{ error?: string }>;
  deleteTask: (id: string) => Promise<{ error?: string }>;
  setSelectedTask: (task: Task | null) => void;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  clientId?: string;
  assignedTo?: string;
}

// Create a single supabase instance for the store
const supabase = createBrowserClient();

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  loading: false,
  selectedTask: null,

  fetchTasks: async (tenantId: string, filters?: TaskFilters) => {
    set({ loading: true });

    try {
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .eq("tenant_id", tenantId);

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      set({ tasks: data || [], loading: false });
    } catch (error) {
      handleError("Failed to fetch tasks", {
        operation: "fetchTasks",
        tenantId,
        details: { filters },
        error,
      }, {
        toastMessage: "Failed to load tasks. Please try again."
      });
      set({ loading: false });
    }
  },

  fetchTask: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      set({ selectedTask: data });
    } catch (error) {
      handleError("Failed to fetch task details", {
        operation: "fetchTask",
        details: { taskId: id },
        error,
      }, {
        toastMessage: "Failed to load task details. Please try again."
      });
    }
  },

  createTask: async (tenantId: string, taskData: CreateTaskForm) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          tenant_id: tenantId,
          ...taskData,
        })
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Add to local state
      set((state) => ({
        tasks: [data, ...state.tasks],
      }));

      notify.success("Task created successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create task";
      notify.error(message);
      return { error: message };
    }
  },

  updateTask: async (id: string, taskData: Partial<CreateTaskForm>) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update(taskData)
        .eq("id", id)
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? data : task
        ),
        selectedTask:
          state.selectedTask?.id === id ? data : state.selectedTask,
      }));

      notify.success("Task updated successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update task";
      notify.error(message);
      return { error: message };
    }
  },

  updateTaskStatus: async (id: string, status: TaskStatus) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", id)
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? data : task
        ),
        selectedTask:
          state.selectedTask?.id === id ? data : state.selectedTask,
      }));

      notify.success("Task status updated");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update task status";
      notify.error(message);
      return { error: message };
    }
  },

  deleteTask: async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Remove from local state
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        selectedTask:
          state.selectedTask?.id === id ? null : state.selectedTask,
      }));

      notify.success("Task deleted successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete task";
      notify.error(message);
      return { error: message };
    }
  },

  setSelectedTask: (task: Task | null) => {
    set({ selectedTask: task });
  },
}));
