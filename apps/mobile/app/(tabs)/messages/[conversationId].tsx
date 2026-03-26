import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApiQuery } from '../../../hooks/useApi';
import { messagesApi, type Message } from '../../../lib/api/messages';
import { BRAND } from '../../../lib/constants';

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateHeader(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = useApiQuery(
    () => messagesApi.getMessages(conversationId, { limit: 50 }),
    [conversationId]
  );

  // Mark as read on mount
  useEffect(() => {
    if (conversationId) {
      messagesApi.markRead(conversationId);
    }
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    setNewMessage('');

    await messagesApi.sendMessage(conversationId, { content: text });
    await messages.refetch();
    setSending(false);
  }, [newMessage, sending, conversationId, messages]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isPatient = item.sender === 'patient';
    const list = messages.data ?? [];
    const prevMessage = index < list.length - 1 ? list[index + 1] : null;
    const showDateHeader = !prevMessage ||
      new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();

    return (
      <View>
        {showDateHeader && (
          <Text style={styles.dateHeader}>{formatDateHeader(item.timestamp)}</Text>
        )}
        <View style={[styles.messageRow, isPatient && styles.messageRowPatient]}>
          <View style={[styles.bubble, isPatient ? styles.bubblePatient : styles.bubbleProvider]}>
            <Text style={[styles.messageText, isPatient && styles.messageTextPatient]}>
              {item.content}
            </Text>
            {item.attachment && (
              <View style={styles.attachmentRow}>
                <Ionicons name="attach" size={14} color={isPatient ? 'rgba(255,255,255,0.7)' : BRAND.gray400} />
                <Text style={[styles.attachmentText, isPatient && { color: 'rgba(255,255,255,0.8)' }]}>
                  {item.attachment.name}
                </Text>
              </View>
            )}
            <Text style={[styles.time, isPatient && styles.timePatient]}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  }, [messages.data]);

  if (messages.loading && !messages.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  // Messages are displayed newest-first in inverted FlatList
  const sortedMessages = [...(messages.data ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      <FlatList
        ref={flatListRef}
        data={sortedMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={BRAND.gray400}
          multiline
          maxLength={2000}
          editable={!sending}
          returnKeyType="default"
          accessibilityLabel="Message input"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {sending ? (
            <ActivityIndicator size="small" color={BRAND.white} />
          ) : (
            <Ionicons name="send" size={20} color={BRAND.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 8 },
  dateHeader: { fontSize: 12, fontWeight: '600', color: BRAND.gray400, textAlign: 'center', marginVertical: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 8 },
  messageRowPatient: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, paddingBottom: 6 },
  bubbleProvider: { backgroundColor: BRAND.white, borderBottomLeftRadius: 4 },
  bubblePatient: { backgroundColor: BRAND.primary, borderBottomRightRadius: 4 },
  messageText: { fontSize: 15, color: BRAND.deepNavy, lineHeight: 20 },
  messageTextPatient: { color: BRAND.white },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, opacity: 0.8 },
  attachmentText: { fontSize: 12, color: BRAND.gray500 },
  time: { fontSize: 11, color: BRAND.gray400, marginTop: 4, alignSelf: 'flex-end' },
  timePatient: { color: 'rgba(255,255,255,0.6)' },
  emptyCenter: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: BRAND.gray400, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    backgroundColor: BRAND.white, borderTopWidth: 1, borderTopColor: BRAND.gray200, gap: 8,
  },
  textInput: {
    flex: 1, backgroundColor: BRAND.gray50, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, color: BRAND.deepNavy, maxHeight: 100,
    borderWidth: 1, borderColor: BRAND.gray200,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: BRAND.gray300 },
});
