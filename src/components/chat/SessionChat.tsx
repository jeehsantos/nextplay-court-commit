import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, formatDistanceToNow, isPast, addHours } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface SessionChatProps {
  sessionId: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionDurationMinutes: number;
  courtManagerId?: string;
  isOrganizer: boolean;
}

export function SessionChat({
  sessionId,
  sessionDate,
  sessionStartTime,
  sessionDurationMinutes,
  courtManagerId,
  isOrganizer,
}: SessionChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>("Court Manager");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate expiration time (48h after session ends)
  const sessionEndTime = new Date(`${sessionDate}T${sessionStartTime}`);
  sessionEndTime.setMinutes(sessionEndTime.getMinutes() + sessionDurationMinutes);
  const expiresAt = addHours(sessionEndTime, 48);
  const isExpired = isPast(expiresAt);
  const timeRemaining = isExpired ? null : formatDistanceToNow(expiresAt, { addSuffix: true });

  useEffect(() => {
    if (user && sessionId) {
      fetchConversation();
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      markMessagesAsRead();

      // Subscribe to new messages
      const channel = supabase
        .channel(`session-chat-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.sender_id !== user?.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversation = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch conversation for this session
      // Note: Using filter since session_id is a new column
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, organizer_id, court_manager_id")
        .filter("session_id", "eq", sessionId);

      if (error) throw error;

      const conv = data && data.length > 0 ? data[0] : null;

      if (conv) {
        setConversationId(conv.id);

        // Fetch other user's name
        const otherUserId =
          conv.organizer_id === user.id
            ? conv.court_manager_id
            : conv.organizer_id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", otherUserId)
          .single();

        setOtherUserName(profile?.full_name || "Court Manager");
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || isExpired) return;

    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Only show if user is organizer or court manager
  const canViewChat = user && (isOrganizer || user.id === courtManagerId);

  if (!canViewChat) return null;

  // No conversation exists yet
  if (!loading && !conversationId) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat with {isOrganizer ? "Court Manager" : "Organizer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 pt-2">
          <div className="text-center py-8">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No chat available for this session
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat with {otherUserName}
          </CardTitle>
          {!isExpired && timeRemaining && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              Expires {timeRemaining}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 pt-2">
        {/* Expiration Warning Banner */}
        {isExpired ? (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              This chat has expired and will be deleted soon.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-warning/10 text-warning border border-warning/20">
            <Clock className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              This chat expires 48 hours after the session ends. Messages will be automatically deleted.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="h-64 mb-4 border rounded-lg p-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_id === user?.id ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          msg.sender_id === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p>{msg.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1 opacity-70",
                            msg.sender_id === user?.id ? "text-right" : "text-left"
                          )}
                        >
                          {format(new Date(msg.created_at), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            {!isExpired && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={isExpired}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || !newMessage.trim() || isExpired}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
