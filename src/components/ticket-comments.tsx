"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/auth";
import { createBrowserClient } from "@/lib/supabase";
import { handleError } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageSquare,
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
} from "lucide-react";
import { notify } from "@/lib/notifications";

interface TicketComment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  created_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface TicketCommentsProps {
  ticketId: string;
  tenantId: string;
}

interface CommentForm {
  content: string;
}

export function TicketComments({ ticketId, tenantId }: TicketCommentsProps) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const { profile } = useAuthStore();
  const supabase = createBrowserClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CommentForm>();

  const commentContent = watch("content");

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const fetchComments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("ticket_comments")
        .select(`
          id,
          content,
          created_at,
          updated_at,
          created_by,
          created_user:profiles!ticket_comments_created_by_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("ticket_id", ticketId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform data to handle created_user being an array
      const transformedComments = (data || []).map(comment => ({
        ...comment,
        created_user: Array.isArray(comment.created_user) ? comment.created_user[0] : comment.created_user
      }));

      setComments(transformedComments);
    } catch (error) {
      handleError("Failed to fetch comments", {
        operation: "fetchComments",
        tenantId,
        details: { ticketId },
        error,
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (data: CommentForm) => {
    if (!profile?.id || !data.content.trim()) return;

    try {
      setSubmitting(true);

      const { data: newComment, error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          tenant_id: tenantId,
          content: data.content.trim(),
          created_by: profile.id,
        })
        .select(`
          id,
          content,
          created_at,
          updated_at,
          created_by,
          created_user:profiles!ticket_comments_created_by_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      // Transform newComment to handle created_user being an array
      const transformedNewComment = {
        ...newComment,
        created_user: Array.isArray(newComment.created_user) ? newComment.created_user[0] : newComment.created_user
      };

      setComments(prev => [...prev, transformedNewComment]);
      reset();
      notify.success("Comment added successfully");
    } catch (error) {
      handleError("Failed to add comment", {
        operation: "addComment",
        tenantId,
        details: { ticketId, content: data.content },
        error,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateComment = async (commentId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from("ticket_comments")
        .update({
          content: newContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, content: newContent.trim(), updated_at: new Date().toISOString() }
            : comment
        )
      );

      setEditingCommentId(null);
      notify.success("Comment updated successfully");
    } catch (error) {
      handleError("Failed to update comment", {
        operation: "updateComment",
        tenantId,
        details: { ticketId, commentId },
        error,
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ticket_comments")
        .delete()
        .eq("id", commentId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      notify.success("Comment deleted successfully");
    } catch (error) {
      handleError("Failed to delete comment", {
        operation: "deleteComment",
        tenantId,
        details: { ticketId, commentId },
        error,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserDisplayName = (comment: TicketComment) => {
    if (comment.created_user) {
      const { first_name, last_name, email } = comment.created_user;
      if (first_name || last_name) {
        return `${first_name || ''} ${last_name || ''}`.trim();
      }
      return email;
    }
    return 'Unknown User';
  };

  const getUserInitials = (comment: TicketComment) => {
    if (comment.created_user) {
      const { first_name, last_name, email } = comment.created_user;
      if (first_name || last_name) {
        return `${first_name?.[0] || ''}${last_name?.[0] || ''}`.toUpperCase();
      }
      return email[0]?.toUpperCase() || 'U';
    }
    return 'U';
  };

  const canModifyComment = (comment: TicketComment) => {
    return comment.created_by === profile?.id;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Comments
          <Badge variant="outline" className="ml-2">
            {comments.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Collaborate with your team and track progress
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmit(addComment)} className="space-y-4">
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                {...register("content", {
                  required: "Comment content is required",
                  minLength: {
                    value: 1,
                    message: "Comment must not be empty"
                  }
                })}
                placeholder="Add a comment..."
                rows={3}
                className="resize-none"
              />
              {errors.content && (
                <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !commentContent?.trim()}
              size="sm"
            >
              {submitting ? (
                <>Posting...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 group">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {getUserInitials(comment)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {getUserDisplayName(comment)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(comment.created_at)}
                        {comment.updated_at !== comment.created_at && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </span>
                    </div>

                    {canModifyComment(comment) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setValue("content", comment.content);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {editingCommentId === comment.id ? (
                    <form
                      onSubmit={handleSubmit((data) => updateComment(comment.id, data.content))}
                      className="mt-2 space-y-2"
                    >
                      <Textarea
                        {...register("content", { required: true })}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCommentId(null);
                            reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm">
                          Update
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No comments yet
              </h3>
              <p className="text-gray-500">
                Be the first to add a comment to this ticket.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}