import * as React from 'react';
import { FC, useMemo, useEffect } from 'react';
import { useInbox } from '../../store/useInbox';
import type { Message } from '../../store/useInbox';
import { cn } from '../../lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, SortAsc, SortDesc, Mail, Beaker, Phone, Pill } from 'lucide-react';

const MessageItem: FC<{ message: Message }> = ({ message }) => {
  const { selectMessage, currentMessage, toggleMessageSelection, selectedMessages } = useInbox();
  
  const typeIcons = {
    email: <Mail className="w-4 h-4 inline mr-1" />,
    lab: <Beaker className="w-4 h-4 inline mr-1" />,
    phone: <Phone className="w-4 h-4 inline mr-1" />,
    refill: <Pill className="w-4 h-4 inline mr-1" />,
    'biomistral-assessment': <Beaker className="w-4 h-4 inline mr-1" />,
  };

  const typeLabels = {
    email: 'Email',
    lab: 'Lab Result',
    phone: 'Phone Message',
    refill: 'Refill Request',
    'biomistral-assessment': 'Assessment',
  };

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl border border-slate-200 p-4 transition-all hover:translate-y-[-2px] hover:shadow-md',
        message.status === 'unread' && 'bg-blue-50 border-blue-500',
        message.priority === 'urgent' && 'border-l-4 border-l-red-500 bg-red-50',
        currentMessage?.id === message.id && 'bg-blue-500 text-white border-blue-500',
        'mb-3'
      )}
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox
          checked={selectedMessages.has(message.id)}
          onClick={(e) => {
            e.stopPropagation();
            toggleMessageSelection(message.id);
          }}
        />
      </div>
      
      <div className="ml-8" onClick={() => selectMessage(message)}>
        {message.priority === 'urgent' && <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
        
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{message.patientDetails.name}</span>
          <span className="text-xs opacity-70">{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>

        <div className={cn(
          'mb-2 inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium',
          currentMessage?.id === message.id ? 'bg-white/20' : 
          message.type === 'email' ? 'bg-blue-100 text-blue-800' :
          message.type === 'lab' ? 'bg-green-100 text-green-800' :
          message.type === 'phone' ? 'bg-purple-100 text-purple-800' :
          'bg-amber-100 text-amber-800'
        )}>
          {typeIcons[message.type]}
          {typeLabels[message.type]}
        </div>

        <div className="line-clamp-2 text-sm opacity-80">
          {message.preview}
        </div>
      </div>
    </div>
  );
};

export const MessageList: FC = () => {
  const {
    messages,
    filter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedMessages,
    selectAllMessages,
    clearSelection,
    markAsRead,
    archiveMessages,
    fetchMessages,
    isLoading
  } = useInbox();

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredAndSortedMessages = useMemo(() => {
    let result = messages.filter((message) => {
      // Filter by status (archived messages are hidden)
      if (message.status === 'archived') return false;

      const matchesSearch = searchQuery 
        ? message.patientDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.subject.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchesSearch;
    });

    return result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'patientName':
          comparison = a.patientDetails.name.localeCompare(b.patientDetails.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [messages, searchQuery, sortBy, sortOrder]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Date</option>
            <option value="priority">Priority</option>
            <option value="patientName">Patient Name</option>
            <option value="type">Type</option>
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc /> : <SortDesc />}
          </Button>
        </div>

        {selectedMessages.size > 0 && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {selectedMessages.size} messages selected
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAsRead(Array.from(selectedMessages))}
            >
              Mark as Read
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => archiveMessages(Array.from(selectedMessages))}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearSelection()}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : filteredAndSortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No messages found</div>
          </div>
        ) : (
          filteredAndSortedMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
      </div>
    </div>
  );
};
