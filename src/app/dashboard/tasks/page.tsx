/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useTasksStore } from "@/stores/tasks";
import { useClientsStore } from "@/stores/clients";
import { TaskModal } from "@/components/modals/task-modal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Calendar,
  User,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";

export default function TicketsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const { profile } = useAuthStore();
  const { tasks, loading, fetchTasks, deleteTask, updateTaskStatus } =
    useTasksStore();
  const { clients, fetchClients } = useClientsStore();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTasks(profile.tenant_id);
      fetchClients(profile.tenant_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.tenant_id]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.client as any)?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesClient =
      clientFilter === "all" || task.client_id === clientFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesClient;
  });

  const handleEditTask = () => {
    // Editing not implemented here, opens create modal
    setShowTaskModal(true);
  };

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;

    const { error } = await deleteTask(deletingTask.id);

    if (!error) {
      setDeletingTask(null);
      setShowConfirmModal(false);
    }
  };

  const handleStatusChange = async (
    ticketId: string,
    newStatus: TaskStatus
  ) => {
    const { error } = await updateTaskStatus(ticketId, newStatus);
    if (error) {
      // Error notification handled in store
      return;
    }
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <Button onClick={() => setShowTaskModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Management</CardTitle>
          <CardDescription>
            Manage and track your support tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as TaskStatus | "all")
              }
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as TaskPriority | "all")
              }
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tickets Table */}
          {filteredTasks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/dashboard/tasks/${task.id}`} className="block">
                          <div className="space-y-1">
                            <div className="font-medium hover:text-blue-600">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-600 truncate max-w-[200px]">
                              {task.description}
                            </div>
                          )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="mr-2 h-3 w-3 text-gray-400" />
                          {(task.client as any)?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(value) =>
                            handleStatusChange(task.id, value as TaskStatus)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <Badge className={getStatusColor(task.status)}>
                              {task.status.replace("_", " ")}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-3 w-3 text-gray-400" />
                            {formatDate(task.due_date)}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-3 w-3 text-gray-400" />
                          {task.actual_hours?.toFixed(1) || "0.0"} /{" "}
                          {task.estimated_hours?.toFixed(1) || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTask()}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tasks found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all" ||
                clientFilter !== "all"
                  ? "No tasks match your current filters."
                  : "Get started by creating your first task."}
              </p>
              {!searchTerm &&
                statusFilter === "all" &&
                priorityFilter === "all" &&
                clientFilter === "all" && (
                  <Button onClick={() => setShowTaskModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={handleCloseModal}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}
