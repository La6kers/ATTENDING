import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useApiQuery } from '../../../hooks/useApi';
import { messagesApi, type Conversation } from '../../../lib/api/messages';
import { BRAND } from '../../../lib/constants';

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const conversations = useApiQuery(() => messagesApi.getConversations(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await conversations.refetch();
    setRefreshing(false);
  }, [conversations]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [styles.conversationCard, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/(tabs)/messages/${item.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${item.provider.name}`}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={BRAND.white} />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.providerName} numberOfLines={1}>{item.provider.name}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.lastMessage.timestamp)}</Text>
        </View>
        <Text style={styles.specialty}>{item.provider.specialty}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage.sender === 'patient' ? 'You: ' : ''}{item.lastMessage.content}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  ), [router]);

  if (conversations.loading && !conversations.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const list = conversations.data ?? [];

  return (
    <FlatList
      data={list}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={list.length === 0 ? styles.center : styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={BRAND.gray300} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Messages from your care team will appear here.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  listContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conversationCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  conversationContent: { flex: 1, marginLeft: 12 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  providerName: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy, flex: 1 },
  timestamp: { fontSize: 12, color: BRAND.gray400, marginLeft: 8 },
  specialty: { fontSize: 12, color: BRAND.gray400, marginTop: 1 },
  lastMessage: { fontSize: 14, color: BRAND.gray500, marginTop: 4 },
  unreadBadge: {
    backgroundColor: BRAND.coral, borderRadius: 12, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8,
  },
  unreadText: { color: BRAND.white, fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: BRAND.deepNavy, marginTop: 16 },
  emptyText: { fontSize: 14, color: BRAND.gray400, textAlign: 'center', marginTop: 8 },
});
