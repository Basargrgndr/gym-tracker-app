import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LLMService from '../services/LLMService';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  void:     '#050508',
  surface:  '#0f0f1c',
  card:     '#131320',
  border:   'rgba(255,255,255,0.05)',
  borderHi: 'rgba(59,130,246,0.22)',
  blue:     '#3b82f6',
  blue2:    '#60a5fa',
  blueDark: '#1e3a8a',
  blueDim:  'rgba(59,130,246,0.1)',
  green:    '#22c55e',
  textPri:  '#e0eaff',
  textSec:  '#5a6a9a',
  textDim:  '#2a2a45',
};

const QUICK_ACTIONS = [
  { label: 'Form Tips',    text: 'How can I improve my form for squats?' },
  { label: 'Nutrition',   text: 'What should I eat after a workout?' },
  { label: 'Recovery',    text: 'How long should I rest between sets?' },
  { label: 'Hypertrophy', text: 'How many sets per week for muscle growth?' },
];

const AIChatScreen = ({ navigate }) => {
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'ai',
      text: "Hello. Ask me anything about training, nutrition, or recovery.",
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await LLMService.askFitnessQuestion(userMsg.text);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.success ? response.answer : response.fallback,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      if (response.success) await LLMService.saveChatHistory(userMsg.text, aiMsg.text);
    } catch (_) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: "Connection issue. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    return (
      <View
        key={message.id}
        style={[s.msgWrap, isUser ? s.msgWrapUser : s.msgWrapAI]}
      >
        {!isUser && (
          <View style={s.aiAvatar}>
            <Text style={s.aiAvatarText}>AI</Text>
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAI]}>
            {message.text}
          </Text>
          <Text style={[s.time, isUser ? s.timeUser : s.timeAI]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigate('workout')}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>AI FITNESS ASSISTANT</Text>
            <Text style={s.headerSub}>Llama 3.3 70B</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.quickRow}
        >
          {QUICK_ACTIONS.map(q => (
            <TouchableOpacity
              key={q.label}
              style={s.quickBtn}
              onPress={() => setInputText(q.text)}
              disabled={isLoading}
            >
              <Text style={s.quickBtnText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={s.divider} />

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}

          {isLoading && (
            <View style={s.loadingRow}>
              <View style={s.aiAvatar}>
                <Text style={s.aiAvatarText}>AI</Text>
              </View>
              <View style={s.bubbleAI}>
                <ActivityIndicator color={C.blue2} size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything..."
            placeholderTextColor={C.textDim}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!inputText.trim() || isLoading) && s.sendBtnOff]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={s.sendBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.void,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    backgroundColor: C.blueDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    width: 60,
  },
  backBtnText: {
    color: C.blue2,
    fontSize: 13,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'BebasNeue-Regular',
    fontSize: 18,
    color: C.textPri,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 10,
    color: C.green,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Quick actions
  quickRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  quickBtn: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.borderHi,
  },
  quickBtnText: {
    color: C.blue2,
    fontSize: 13,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 0,
  },

  // Messages
  messages: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    gap: 10,
  },
  msgWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  msgWrapUser: {
    justifyContent: 'flex-end',
  },
  msgWrapAI: {
    justifyContent: 'flex-start',
  },

  // AI avatar
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.blueDark,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  aiAvatarText: {
    fontFamily: 'BebasNeue-Regular',
    fontSize: 12,
    color: C.blue2,
    letterSpacing: 1,
  },

  // Bubbles
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: C.blueDark,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  bubbleAI: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAI: {
    color: C.textPri,
  },
  time: {
    fontSize: 10,
    marginTop: 5,
    fontWeight: '600',
  },
  timeUser: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
  timeAI: {
    color: C.textDim,
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.void,
  },
  input: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: C.textPri,
    fontSize: 15,
    maxHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: C.border,
    fontWeight: '500',
  },
  sendBtn: {
    backgroundColor: C.blueDark,
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnOff: {
    backgroundColor: C.card,
    borderColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
});

export default AIChatScreen;